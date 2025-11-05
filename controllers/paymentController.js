const db = require('../models');
const { createTransaction, handleNotification } = require('../services/midtransService');

// @desc    Create a new Midtrans transaction for subscription
// @route   POST /api/v1/payment/subscribe/:packageId
// @access  Private
const createSubscription = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { packageId } = req.params;

        const packageToBuy = await db.Package.findByPk(packageId);
        if (!packageToBuy) {
            return res.status(404).json({ message: 'Package not found.' });
        }

        const orderId = `SUB-${userId}-${Date.now()}`;

        // Create a pending transaction record
        await db.Transaction.create({
            userId,
            packageId,
            orderId,
            amount: packageToBuy.price,
            status: 'pending',
        });

        const token = await createTransaction(userId, orderId, packageToBuy.price);
        res.status(200).json({ token });
    } catch (error) {
        console.error("Payment Error:", error);
        res.status(500).json({ message: 'Failed to create transaction.' });
    }
};

// @desc    Handle Midtrans payment notification webhook
// @route   POST /api/v1/payment/notify
// @access  Public (from Midtrans)
const handleMidtransNotification = async (req, res) => {
    try {
        await handleNotification(req.body);
        res.status(200).send('Notification received.');
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).send('Error processing notification.');
    }
};

module.exports = {
    createSubscription,
    handleMidtransNotification,
};
