const db = require('../models');
const jwt = require('jsonwebtoken');
const { sendOtp } = require('../services/whatsappService');
const crypto = require('crypto');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

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
      // In a real app, you'd likely have a seeder for this
      await db.Package.create({ name: 'Free', price: 0, durationDays: 9999, maxDevices: 1, apiAccess: false });
    }

    const user = await db.User.create({
      name, email, password, whatsappNumber,
      packageId: freePackage ? freePackage.id : null,
      isVerified: false
    }, { transaction: t });

    // Generate and send OTP
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

// @desc    Verify user's OTP
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
            return res.status(400).json({ message: 'OTP has expired. Please register again to get a new one.' });
        }

        user.isVerified = true;
        await user.save();

        // Delete the OTP after successful verification
        await db.Otp.destroy({ where: { userId: user.id } });

        res.status(200).json({
            message: 'Account verified successfully.',
            token: generateToken(user.id),
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
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
            return res.status(403).json({ message: 'Account not verified. Please verify your OTP.', userId: user.id });
        }
        if (await user.matchPassword(password)) {
            res.json({
                token: generateToken(user.id),
                user: { id: user.id, name: user.name, email: user.email, role: user.role }
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};


module.exports = {
  registerUser,
  verifyOtp,
  loginUser,
};
