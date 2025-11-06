const db = require('../models');

/**
 * A simplified middleware to check message limits.
 * It relies on the `userAuth` middleware to provide `req.user` and `req.package`.
 */
const checkMessageLimit = async (req, res, next) => {
    try {
        const { user, package: userPackage } = req;

        // Note: The daily message count reset logic has been moved to the controller
        // to ensure it happens atomically before the increment.
        const messageLimit = userPackage.messageLimit;
        const numbers = req.body.numbers ? req.body.numbers.split(',').map(n => n.trim()).filter(Boolean).length : 1;

        if (user.messageCount + numbers > messageLimit) {
            const message = `Message limit exceeded for the ${userPackage.name} plan. Limit is ${messageLimit} messages per day.`;
            // Differentiate response for API vs web page
            if (req.accepts('html')) {
                return res.redirect('/messaging?status=error&msg=' + encodeURIComponent(message));
            }
            return res.status(429).json({ message });
        }

        next();
    } catch (error) {
        console.error("Message Limit Middleware Error:", error);
        return res.status(500).json({ message: 'Server error while checking message limit.' });
    }
};

module.exports = { checkMessageLimit };
