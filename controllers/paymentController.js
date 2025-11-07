const db = require('../models');
const { createTransaction, handleNotification } = require('../services/midtransService');

// @desc    Create a new Midtrans transaction for subscription
// @route   POST /api/v1/payment/subscribe/:packageId
// @access  Private
const createSubscription = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { packageId } = req.params;
        const { months } = req.body; // Get months from request body
        const numMonths = parseInt(months, 10) || 1;

        if (numMonths < 1 || numMonths > 12) {
            return res.status(400).json({ message: 'Invalid number of months.' });
        }

        const packageToBuy = await db.Package.findByPk(packageId);
        if (!packageToBuy) {
            return res.status(404).json({ message: 'Package not found.' });
        }

        const orderId = `SUB-${userId}-${Date.now()}`;
        const totalAmount = packageToBuy.price * numMonths;
        const totalDurationDays = packageToBuy.durationDays * numMonths;

        // Create a pending transaction record
        const pendingTransaction = await db.Transaction.create({
            userId,
            packageId,
            orderId,
            amount: totalAmount,
            status: 'pending',
        });

        // Get the full response from Midtrans
        const transactionResponse = await createTransaction(userId, orderId, totalAmount);

        // Update the transaction with the payment gateway data
        await pendingTransaction.update({
            paymentGatewayData: transactionResponse
        });

        // Return the response to the frontend
        res.status(200).json(transactionResponse);
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
