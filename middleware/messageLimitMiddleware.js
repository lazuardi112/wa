const db = require('../models');

const checkMessageLimit = async (req, res, next) => {
    try {
        const userId = req.session.user ? req.session.user.id : (req.headers['x-api-key'] ? (await db.ApiKey.findOne({ where: { key: req.headers['x-api-key'] } }))?.userId : null);
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized: Invalid credentials.' });
        }

        const user = await db.User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Find the user's latest successful subscription to determine their package
        let subscription = await db.Transaction.findOne({
            where: { userId, status: 'success' },
            order: [['expiresAt', 'DESC']],
            include: ['package']
        });

        // If no subscription or it has expired, find the Free package
        if (!subscription || new Date() > new Date(subscription.expiresAt)) {
            const freePackage = await db.Package.findOne({ where: { name: 'Free' } });
            if (!freePackage) {
                return res.status(500).json({ message: 'Default package not configured.' });
            }
            subscription = { package: freePackage }; // Mock subscription object with free package details
        }

        const userPackage = subscription.package;

        // 1. Check device limit
        const deviceCount = await db.Device.count({ where: { userId } });
        if (deviceCount > userPackage.maxDevices) {
            return res.status(403).json({ message: `You have exceeded the device limit for the ${userPackage.name} plan. Limit is ${userPackage.maxDevices}.` });
        }

        // 2. Check message limit
        const today = new Date().setHours(0, 0, 0, 0);
        const lastReset = user.lastResetDate ? new Date(user.lastResetDate).setHours(0, 0, 0, 0) : null;

        // Reset count if it's a new day
        if (lastReset !== today) {
            user.messageCount = 0;
            user.lastResetDate = new Date();
        }

        const messageLimit = userPackage.messageLimit;
        const numbers = req.body.numbers ? req.body.numbers.split(',').length : 1;

        if (user.messageCount + numbers > messageLimit) {
            return res.status(429).json({ message: `Message limit exceeded for the ${userPackage.name} plan. Limit is ${messageLimit} messages per day.` });
        }

        // Don't increment the count here, do it in the controller after the message is successfully sent.
        // But we attach the user to the request for the controller to use.
        req.user = user;

        await user.save(); // Save the reset date if it was changed
        next();

    } catch (error) {
        console.error("Message Limit Middleware Error:", error);
        return res.status(500).json({ message: 'Server error while checking message limit.' });
    }
};

module.exports = { checkMessageLimit };
