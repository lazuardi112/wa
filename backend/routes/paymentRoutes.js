const express = require('express');
const router = express.Router();
const { createTransaction, handleNotification } = require('../services/midtransService');
const db = require('../models');

// @desc    Create a new Midtrans transaction for subscription
// @route   POST /api/v1/payment/subscribe
// @access  Private
router.post('/subscribe', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const orderId = `SUB-${userId}-${Date.now()}`;
        const amount = 10000; // 10k IDR

        // Create a pending subscription record
        await db.Subscription.create({
            userId,
            packageId: 1, // Assuming package 1 is the premium package
            expiresAt: new Date(), // Placeholder, will be updated on success
            midtransOrderId: orderId
        });

        const token = await createTransaction(userId, orderId, amount);
        res.status(200).json({ token });
    } catch (error) {
        console.error("Payment Error:", error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Handle Midtrans payment notification webhook
// @route   POST /api/v1/payment/notify
// @access  Public (from Midtrans)
router.post('/notify', async (req, res) => {
    try {
        await handleNotification(req.body);
        res.status(200).send('Notification received.');
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).send('Error processing notification.');
    }
});

module.exports = router;
