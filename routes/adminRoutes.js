const express = require('express');
const router = express.Router();
const {
    loginAdmin,
    saveSettings,
    saveOtpDevice,
    toggleUserBlock,
    deleteSession,
    updateUser,
    deleteUser,
} = require('../controllers/adminController');

// This should exist from the original structure
const isAdmin = (req, res, next) => {
    if (req.session.admin && req.session.admin.isLoggedIn) {
        return next();
    }
    // For API routes, send a JSON error instead of redirecting
    res.status(403).json({ success: false, message: 'Unauthorized' });
};


// @desc    Authenticate Admin
// @route   POST /api/v1/admin/login
router.post('/login', loginAdmin);

// @desc    Save Midtrans and other settings
// @route   POST /api/v1/admin/settings
router.post('/settings', isAdmin, saveSettings);

// @desc    Save the global OTP device
// @route   POST /api/v1/admin/settings/otp-device
router.post('/settings/otp-device', isAdmin, saveOtpDevice);

// @desc    Toggle the block status of a user
// @route   POST /api/v1/admin/users/:id/toggle-block
router.post('/users/:id/toggle-block', isAdmin, toggleUserBlock);

// @desc    Delete a user session file
// @route   POST /api/v1/admin/sessions/delete
router.post('/sessions/delete', isAdmin, deleteSession);

// @desc    Update a user's details
// @route   POST /api/v1/admin/users/edit/:id
router.post('/users/edit/:id', isAdmin, updateUser);

// @desc    Delete a user
// @route   POST /api/v1/admin/users/delete/:id
router.post('/users/delete/:id', isAdmin, deleteUser);


module.exports = router;
