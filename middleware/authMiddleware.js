const db = require('../models');

/**
 * Middleware for API routes. Returns JSON error on failure.
 */
const protect = async (req, res, next) => {
    if (req.session.user) {
        // The userAuth middleware will handle fetching the user object.
        // This middleware only needs to check for the session's existence for API routes.
        next();
    } else {
        // Check for API key as a fallback for programmatic access
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
            return res.status(401).json({ message: 'Not authorized, no session or API key' });
        }
        try {
            const apiKeyRecord = await db.ApiKey.findOne({ where: { key: apiKey } });
            if (!apiKeyRecord) {
                return res.status(401).json({ message: 'Not authorized, invalid API key' });
            }
            req.session.user = { id: apiKeyRecord.userId }; // Mock session for userAuth
            next();
        } catch (error) {
            return res.status(500).json({ message: 'Server error during API key authentication' });
        }
    }
};

/**
 * Middleware for view routes. Redirects to /login on failure.
 */
const protectView = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};


const admin = (req, res, next) => {
    if (req.session.admin) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};

const redirectIfLoggedIn = (req, res, next) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    next();
};

const isAdmin = (req, res, next) => {
    if (req.session.admin && req.session.admin.isLoggedIn) {
        return next();
    }
    if (req.accepts('html')) {
        return res.redirect('/admin/login');
    }
    return res.status(403).json({ message: 'Forbidden: Admins only.' });
};

module.exports = {
    protect,
    protectView, // Export the new middleware
    admin,
    redirectIfLoggedIn,
    isAdmin
};
