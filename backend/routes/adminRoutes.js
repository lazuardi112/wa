const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
    adminLogin,
    adminLogout,
    getAdminStatus,
    setupOtpDevice,
    getOtpDeviceStatus
} = require('../controllers/adminController');

// Public admin routes
router.post('/login', adminLogin);
router.get('/status', getAdminStatus);

// Protected admin routes
router.use(protect, admin);
router.post('/logout', adminLogout);
router.post('/settings/otp-device', setupOtpDevice);
router.get('/settings/otp-device-status', getOtpDeviceStatus);

module.exports = router;
