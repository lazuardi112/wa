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
const { protect, redirectIfLoggedIn } = require('../middleware/authMiddleware');
const { userAuth } = require('../middleware/userAuth');

// Apply userAuth middleware to all protected routes
router.use(protect, userAuth);

// Static public pages
router.get('/login', redirectIfLoggedIn, (req, res) => res.render('login', { query: req.query }));
router.get('/register', redirectIfLoggedIn, (req, res) => res.render('register', { query: req.query }));
router.get('/verify-otp', redirectIfLoggedIn, (req, res) => {
    if (!req.query.userId) return res.redirect('/register');
    res.render('verify-otp', { query: req.query, userId: req.query.userId });
});

// Protected pages
router.get('/dashboard', renderDashboard);
router.get('/devices', renderDevicesPage);
router.get('/messaging', renderMessagingPage);
router.get('/bot', renderBotPage);
router.get('/bot/edit/:id', renderEditBotPage);
router.get('/api-docs', renderApiDocsPage);
router.get('/subscribe', renderSubscribePage);
router.get('/history', renderHistoryPage);

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
