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

        // Enhanced Validation and Logging
        console.log(`[Payment] Attempting to create transaction for user ${userId} with package ${packageId}.`);
        console.log(`[Payment] Package details:`, JSON.stringify(packageToBuy, null, 2));
        console.log(`[Payment] Calculated amount: ${packageToBuy.price} * ${numMonths} = ${totalAmount}`);

        if (totalAmount <= 0) {
            return res.status(400).json({ message: 'Total amount must be greater than zero.' });
        }
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
// @route   POST /notif/midtrans
// @access  Public (from Midtrans)
const handleMidtransNotification = async (req, res) => {
    try {
        // Log the raw body to ensure it's being received
        console.log('[Midtrans Webhook] Received notification:', JSON.stringify(req.body, null, 2));

        if (!req.body || Object.keys(req.body).length === 0) {
            console.error('[Midtrans Webhook] Error: Received an empty request body. Ensure express.json() is used before this route.');
            return res.status(400).send('Error: Empty request body.');
        }

        await handleNotification(req.body);
        res.status(200).send({ status: 'success', message: 'Notification received.' });
    } catch (error) {
        console.error("[Midtrans Webhook] Unhandled error processing notification:", error);
        res.status(500).send({ status: 'error', message: 'Error processing notification.' });
    }
};

module.exports = {
    createSubscription,
    handleMidtransNotification,
};
