const express = require('express');
const router = express.Router();
const { registerUser, verifyOtp, loginUser } = require('../controllers/authController');

// @route   POST /api/v1/auth/register
// @desc    Register a new user and send OTP
// @access  Public
router.post('/register', registerUser);

// @route   POST /api/v1/auth/verify-otp
// @desc    Verify user's OTP and get token
// @access  Public
router.post('/verify-otp', verifyOtp);

// @route   POST /api/v1/auth/login
// @desc    Login for verified users
// @access  Public
router.post('/login', loginUser);

module.exports = router;
