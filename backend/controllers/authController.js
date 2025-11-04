const db = require('../models');
const { sendOtp } = require('../services/whatsappService');
const crypto = require('crypto');

// @desc    Register a new user and send OTP
// @route   POST /api/v1/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { name, email, password, whatsappNumber } = req.body;
  if (!name || !email || !password || !whatsappNumber) {
    return res.status(400).json({ message: 'Please provide all required fields.' });
  }

  const t = await db.sequelize.transaction();
  try {
    const userExists = await db.User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    const whatsappExists = await db.User.findOne({ where: { whatsappNumber } });
    if (whatsappExists) {
        return res.status(400).json({ message: 'This WhatsApp number is already registered.' });
    }

    const freePackage = await db.Package.findOne({ where: { name: 'Free' } });
    if (!freePackage) {
      await db.Package.create({ name: 'Free', price: 0, durationDays: 9999, maxDevices: 1, apiAccess: false });
    }

    const user = await db.User.create({
      name, email, password, whatsappNumber,
      packageId: freePackage ? freePackage.id : null,
      isVerified: false
    }, { transaction: t });

    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    await db.Otp.upsert({ userId: user.id, code: otpCode, expiresAt }, { transaction: t });

    await sendOtp(whatsappNumber, otpCode);

    await t.commit();
    res.status(201).json({ message: `Registration successful. An OTP has been sent to ${whatsappNumber}.`, userId: user.id });

  } catch (error) {
    await t.rollback();
    console.error("Registration Error:", error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Verify user's OTP and create session
// @route   POST /api/v1/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
    const { userId, otp } = req.body;
    if(!userId || !otp){
        return res.status(400).json({ message: 'User ID and OTP are required.' });
    }

    try {
        const user = await db.User.findByPk(userId, { include: 'otp' });
        if(!user){
            return res.status(404).json({ message: 'User not found.' });
        }
        if(!user.otp || user.otp.code !== otp){
            return res.status(400).json({ message: 'Invalid OTP.' });
        }
        if(new Date() > new Date(user.otp.expiresAt)){
            return res.status(400).json({ message: 'OTP has expired. Please register again.' });
        }

        user.isVerified = true;
        await user.save();

        await db.Otp.destroy({ where: { userId: user.id } });

        // Create a session for the user
        req.session.user = {
            id: user.id,
            name: user.name,
            role: user.role,
        };

        res.status(200).json({
            message: 'Account verified and logged in successfully.',
            user: req.session.user
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await db.User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        if (!user.isVerified) {
            return res.status(403).json({ message: 'Account not verified.', userId: user.id });
        }
        if (await user.matchPassword(password)) {
            // Create a session
            req.session.user = {
                id: user.id,
                name: user.name,
                role: user.role,
            };
            res.status(200).json({ message: "Logged in successfully", user: req.session.user });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
const logoutUser = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Could not log out, please try again.' });
        }
        res.clearCookie('connect.sid'); // The default session cookie name
        res.status(200).json({ message: 'Logged out successfully.' });
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
