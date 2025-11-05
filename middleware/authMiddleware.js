const db = require('../models');

const protect = async (req, res, next) => {
    if (req.session.user) {
        try {
            const user = await db.User.findByPk(req.session.user.id);
            if (user) {
                req.user = user;
                next();
            } else {
                res.status(401).json({ message: 'Not authorized, user not found' });
            }
        } catch (error) {
            res.status(500).json({ message: 'Server error during authentication' });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, no session' });
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

module.exports = { protect, admin, redirectIfLoggedIn };
