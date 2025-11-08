const express = require('express');
const router = express.Router();
const {
    showLoginPage,
    showDashboard,
    showSettingsPage,
    showUsersPage,
    showTransactionsPage,
    renderSessionsPage,
    renderEditUserPage,
} = require('../controllers/adminController');

// Middleware to protect admin routes
const isAdmin = (req, res, next) => {
    if (req.session.admin && req.session.admin.isLoggedIn) {
        return next();
    }
    res.redirect('/admin/login');
};

// ========= PUBLIC VIEW ROUTE =========
router.get('/login', showLoginPage);

// ========= PROTECTED VIEW ROUTES (GET) =========
router.get('/dashboard', isAdmin, showDashboard);
router.get('/settings', isAdmin, showSettingsPage);
router.get('/users', isAdmin, showUsersPage);
router.get('/transactions', isAdmin, showTransactionsPage);
router.get('/sessions', isAdmin, renderSessionsPage);
router.get('/users/edit/:id', isAdmin, renderEditUserPage);

module.exports = router;
