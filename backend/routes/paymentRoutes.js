const express = require('express');
const router = express.Router();
const { getAvailablePackages, createOrder, handleNotification } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/v1/packages
// @desc    Get all available subscription packages
// @access  Public (or Private, depending on business logic)
router.get('/packages', getAvailablePackages);

// @route   POST /api/v1/subscription/order
// @desc    Create a new payment order with Midtrans
// @access  Private
router.post('/order', protect, createOrder);

// @route   POST /api/v1/midtrans/notification
// @desc    Handle incoming notifications from Midtrans
// @access  Public (webhook from Midtrans)
router.post('/notification', handleNotification);

module.exports = router;
