const express = require('express');
const router = express.Router();
const { createSubscription, handleMidtransNotification } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// @desc    Create a new Midtrans transaction for subscription
// @route   POST /api/v1/payment/subscribe/:packageId
// @access  Private
router.post('/subscribe/:packageId', protect, createSubscription);

// @desc    Handle Midtrans payment notification webhook
// @route   POST /api/v1/payment/notify
// @access  Public (from Midtrans)
router.post('/notify', handleMidtransNotification);

module.exports = router;
