const express = require('express');
const router = express.Router();
// Assuming you have middleware for auth and admin checks later
// const { protect, admin } = require('../middleware/authMiddleware');
const { setupOtpDevice, getOtpDeviceStatus } = require('../controllers/adminController');

// For now, these routes are open for demonstration.
// In a real app, they MUST be protected by protect and admin middleware.
// router.use(protect, admin);

// @route   POST /api/v1/admin/settings/otp-device
// @desc    Setup the OTP sending device
// @access  Private/Admin
router.post('/settings/otp-device', setupOtpDevice);

// @route   GET /api/v1/admin/settings/otp-device-status
// @desc    Get the status of the OTP device
// @access  Private/Admin
router.get('/settings/otp-device-status', getOtpDeviceStatus);

module.exports = router;
