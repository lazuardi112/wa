const express = require('express');
const router = express.Router();
const {
    showLoginPage,
    loginAdmin,
    showDashboard,
    showSettingsPage,
    saveSettings,
    showUsersPage,
    toggleUserBlock
} = require('../controllers/adminController');

// Middleware to protect admin routes
const isAdmin = (req, res, next) => {
    if (req.session.admin) {
        return next();
    }
    res.redirect('/admin/login');
};

// Public routes for admin login
router.get('/login', showLoginPage);
router.post('/login', loginAdmin); // This is an API route but handles form submission

// Protected admin page routes
router.get('/dashboard', isAdmin, showDashboard);
router.get('/settings', isAdmin, showSettingsPage);
router.get('/users', isAdmin, showUsersPage);

// Protected admin API routes
router.post('/settings', isAdmin, saveSettings);
router.post('/users/:id/toggle-block', isAdmin, toggleUserBlock);

module.exports = router;
