const express = require('express');
const router = express.Router();
const {
    showLoginPage,
    showDashboard,
    showSettingsPage,
    showUsersPage,
    showTransactionsPage
} = require('../controllers/adminController');

// Middleware to protect admin routes
const isAdmin = (req, res, next) => {
    if (req.session.admin && req.session.admin.isLoggedIn) {
        return next();
    }
    res.redirect('/admin/login');
};

// Public route for admin login page
router.get('/login', showLoginPage);

// Protected admin page routes
router.get('/dashboard', isAdmin, showDashboard);
router.get('/settings', isAdmin, showSettingsPage);
router.get('/users', isAdmin, showUsersPage);
router.get('/transactions', isAdmin, showTransactionsPage);

module.exports = router;
