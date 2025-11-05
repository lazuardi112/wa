const express = require('express');
const router = express.Router();
const {
    renderDashboard,
    renderDevicesPage,
    renderMessagingPage,
    renderBotPage,
    renderApiDocsPage,
    renderSubscribePage,
    renderEditBotPage,
} = require('../controllers/viewController');
const { protect, redirectIfLoggedIn } = require('../middleware/authMiddleware');

// Static public pages
router.get('/login', redirectIfLoggedIn, (req, res) => res.render('login', { query: req.query }));
router.get('/register', redirectIfLoggedIn, (req, res) => res.render('register', { query: req.query }));
router.get('/verify-otp', redirectIfLoggedIn, (req, res) => {
    if (!req.query.userId) return res.redirect('/register');
    res.render('verify-otp', { query: req.query, userId: req.query.userId });
});

// Protected pages
router.get('/dashboard', protect, renderDashboard);
router.get('/devices', protect, renderDevicesPage);
router.get('/messaging', protect, renderMessagingPage);
router.get('/bot', protect, renderBotPage);
router.get('/bot/edit/:id', protect, renderEditBotPage);
router.get('/api-docs', protect, renderApiDocsPage);
router.get('/subscribe', protect, renderSubscribePage);

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.redirect('/dashboard');
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

// Root path redirection
router.get('/', (req, res) => {
    if (req.session.user) return res.redirect('/dashboard');
    res.redirect('/login');
});

module.exports = router;
