const db = require('../models');
const { sendOtp } = require('../services/whatsappService');
const crypto = require('crypto');

// @desc    Register a new user and send OTP (EJS version)
// @route   POST /api/v1/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { name, email, password, whatsappNumber } = req.body;
  if (!name || !email || !password || !whatsappNumber) {
    return res.status(400).render('register', { error: 'Please provide all required fields.' });
  }

  const t = await db.sequelize.transaction();
  try {
    const userExists = await db.User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).render('register', { error: 'User with this email already exists.' });
    }

    const whatsappExists = await db.User.findOne({ where: { whatsappNumber } });
    if (whatsappExists) {
        return res.status(400).render('register', { error: 'This WhatsApp number is already registered.' });
    }

    let freePackage = await db.Package.findOne({ where: { name: 'Free' } });
    if (!freePackage) {
      freePackage = await db.Package.create({ name: 'Free', price: 0, durationDays: 9999, maxDevices: 1, messageLimitPerDay: 50, apiAccess: false });
    }

    const user = await db.User.create({
      name, email, password, whatsappNumber,
      packageId: freePackage.id,
      isVerified: false
    }, { transaction: t });

    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.Otp.upsert({ userId: user.id, code: otpCode, expiresAt }, { transaction: t });

    // In a real app, you might want to handle the case where OTP sending fails
    // await sendOtp(whatsappNumber, otpCode);

    await t.commit();
    // Redirect to the OTP verification page with the user's ID
    res.redirect(`/verify-otp?userId=${user.id}`);

  } catch (error) {
    await t.rollback();
    console.error("Registration Error:", error);
    res.status(500).render('register', { error: 'A server error occurred.' });
  }
};

// @desc    Verify user's OTP and create session (EJS version)
// @route   POST /api/v1/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
    const { userId, otp } = req.body;
    if(!userId || !otp){
        return res.status(400).render('verify-otp', { error: 'User ID and OTP are required.', userId });
    }

    try {
        const user = await db.User.findByPk(userId, { include: 'otp' });
        if(!user){
            return res.status(404).render('register', { error: 'User not found. Please register again.' });
        }
        if(!user.otp || user.otp.code !== otp){
            return res.status(400).render('verify-otp', { error: 'Invalid OTP.', userId });
        }
        if(new Date() > new Date(user.otp.expiresAt)){
            return res.status(400).render('register', { error: 'OTP has expired. Please register again.' });
        }

        user.isVerified = true;
        await user.save();

        await db.Otp.destroy({ where: { userId: user.id } });

        req.session.user = { id: user.id, name: user.name, role: user.role };

        res.redirect('/dashboard');
    } catch (error) {
        res.status(500).render('verify-otp', { error: 'A server error occurred.', userId });
    }
};

// @desc    Login user (EJS version)
// @route   POST /api/v1/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await db.User.findOne({ where: { email } });
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).render('login', { error: 'Invalid email or password' });
        }
        if (!user.isVerified) {
            return res.status(403).render('login', { error: 'Account not verified. Please register to get a new OTP.' });
        }

        req.session.user = { id: user.id, name: user.name, role: user.role };
        res.redirect('/dashboard');
    } catch (error) {
        console.error("Login Error:", error)
        res.status(500).render('login', { error: 'Server Error' });
    }
};

// @desc    Logout user
// @route   GET /logout
// @access  Private
const logoutUser = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/dashboard');
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
};

// @desc    Get current user status
// @route   GET /api/v1/auth/status
// @access  Public
const getAuthStatus = (req, res) => {
    if (req.session.user) {
        res.status(200).json({ isAuthenticated: true, user: req.session.user });
    } else {
        res.status(200).json({ isAuthenticated: false, user: null });
    }
};


module.exports = {
  registerUser,
  verifyOtp,
  loginUser,
  logoutUser,
  getAuthStatus
};
