const db = require('../models');

/**
 * A centralized middleware to fetch the authenticated user and their active package.
 * This ensures consistent and up-to-date user data across all routes.
 */
const userAuth = async (req, res, next) => {
    // This middleware should run after the session middleware (protect)
    if (!req.session.user) {
        // Should be caught by 'protect' middleware first, but as a safeguard
        return res.status(401).redirect('/login');
    }

    try {
        const userId = req.session.user.id;
        const user = await db.User.findByPk(userId);
        if (!user) {
            // If user is not found in DB, destroy session and redirect to login
            req.session.destroy();
            return res.redirect('/login');
        }

        // Determine the user's current package
        const activeSubscription = await db.Transaction.findOne({
            where: { userId, status: 'success' },
            order: [['expiresAt', 'DESC']],
            include: ['package']
        });

        let currentPackage;
        if (activeSubscription && new Date() < new Date(activeSubscription.expiresAt)) {
            currentPackage = activeSubscription.package;
        } else {
            currentPackage = await db.Package.findOne({ where: { name: 'Free' } });
        }

        if (!currentPackage) {
            return res.status(500).send('Critical Error: Default package not found.');
        }

        // Attach the fresh user and package objects to the request
        req.user = user;
        req.package = currentPackage;

        next();
    } catch (error) {
        console.error("User Auth Middleware Error:", error);
        return res.status(500).send("Error authenticating user.");
    }
};

module.exports = { userAuth };
