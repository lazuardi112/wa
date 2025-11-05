const express = require('express');
const router = express.Router();
const {
  renderLogin,
  renderRegister,
  renderDashboard,
  renderDevices,
  renderMessaging,
  renderBot,
  renderApiDocs,
  renderSubscribe,
  renderVerifyOtp,
  renderAdminLogin,
  renderAdminDashboard,
  renderAdminSettings,
  renderAdminUsers
} = require('../controllers/viewController');
const { protect, admin } = require('../middleware/authMiddleware');

// User-facing routes
router.get('/login', renderLogin);
router.get('/register', renderRegister);
router.get('/dashboard', protect, renderDashboard);
router.get('/devices', protect, renderDevices);
router.get('/messaging', protect, renderMessaging);
router.get('/bot', protect, renderBot);
router.get('/api-docs', protect, renderApiDocs);
router.get('/subscribe', protect, renderSubscribe);
router.get('/verify-otp', renderVerifyOtp);

// Admin-facing routes
router.get('/admin/login', renderAdminLogin);
router.get('/admin/dashboard', protect, admin, renderAdminDashboard);
router.get('/admin/settings', protect, admin, renderAdminSettings);
router.get('/admin/users', protect, admin, renderAdminUsers);

// Redirect root to login
router.get('/', (req, res) => res.redirect('/login'));

module.exports = router;
