const express = require('express');
const router = express.Router();
const { registerUser, verifyOtp, loginUser, logoutUser, getAuthStatus } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/verify-otp', verifyOtp);
router.post('/login', loginUser);
router.post('/logout', protect, logoutUser);
router.get('/status', getAuthStatus);

module.exports = router;
