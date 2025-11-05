const db = require('../models');

const checkMessageLimit = async (req, res, next) => {
    try {
        const userId = req.session.user ? req.session.user.id : (await db.ApiKey.findOne({ where: { key: req.headers['x-api-key'] } }))?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await db.User.findByPk(userId, { include: 'package' });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const today = new Date().setHours(0, 0, 0, 0);
        const lastReset = user.lastResetDate ? new Date(user.lastResetDate).setHours(0, 0, 0, 0) : null;

        // Reset count if it's a new day
        if (lastReset !== today) {
            user.messageCount = 0;
            user.lastResetDate = new Date();
        }

        const messageLimit = user.package.messageLimitPerDay;
        const numbers = req.body.numbers ? req.body.numbers.split(',').length : 1;

        if (user.messageCount + numbers > messageLimit) {
            return res.status(429).json({ message: `Message limit exceeded. Limit is ${messageLimit} messages per day.` });
        }

        // Attach user to request for the next middleware/controller
        req.user = user;
        req.messageCost = numbers;
        await user.save(); // Save the reset date if it was changed
        next();

    } catch (error) {
        console.error("Message Limit Middleware Error:", error);
        return res.status(500).json({ message: 'Server error while checking message limit.' });
    }
};

module.exports = { checkMessageLimit };
