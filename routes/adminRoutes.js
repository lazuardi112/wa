const express = require('express');
const router = express.Router();
const {
    loginAdmin,
    saveSettings,
    saveOtpDevice,
    toggleUserBlock
} = require('../controllers/adminController');
const { isAdmin } = require('../middleware/authMiddleware'); // Assuming isAdmin is in a central middleware file

// @desc    Authenticate Admin
// @route   POST /api/v1/admin/login
router.post('/login', loginAdmin);

// Protected admin API routes
// We'll create a new middleware for API protection if needed, for now using session-based isAdmin
router.post('/settings', isAdmin, saveSettings);
router.post('/settings/otp-device', isAdmin, saveOtpDevice);
router.post('/users/:id/toggle-block', isAdmin, toggleUserBlock);

module.exports = router;
