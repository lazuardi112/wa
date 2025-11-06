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
    renderHistoryPage,
} = require('../controllers/viewController');
const { protectView, redirectIfLoggedIn } = require('../middleware/authMiddleware');
const { userAuth } = require('../middleware/userAuth');

// --- Public Routes ---
router.get('/login', redirectIfLoggedIn, (req, res) => res.render('login', { query: req.query || {} }));
router.get('/register', redirectIfLoggedIn, (req, res) => res.render('register', { query: req.query || {} }));
router.get('/verify-otp', redirectIfLoggedIn, (req, res) => {
    if (!req.query.userId) return res.redirect('/register');
    res.render('verify-otp', { query: req.query || {}, userId: req.query.userId });
});
router.get('/', (req, res) => {
    if (req.session.user) return res.redirect('/dashboard');
    res.redirect('/login');
});

// --- Protected Routes ---
// `protectView` ensures the user is logged in by redirecting, then `userAuth` fetches data.
router.get('/dashboard', protectView, userAuth, renderDashboard);
router.get('/devices', protectView, userAuth, renderDevicesPage);
router.get('/messaging', protectView, userAuth, renderMessagingPage);
router.get('/bot', protectView, userAuth, renderBotPage);
router.get('/bot/edit/:id', protectView, userAuth, renderEditBotPage);
router.get('/api-docs', protectView, userAuth, renderApiDocsPage);
router.get('/subscribe', protectView, userAuth, renderSubscribePage);
router.get('/history', protectView, userAuth, renderHistoryPage);
router.get('/logout', protectView, (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.redirect('/dashboard');
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

module.exports = router;
