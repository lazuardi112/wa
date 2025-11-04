const midtransClient = require('midtrans-client');
const crypto = require('crypto');
const Package = require('../models/packageModel');
const Transaction = require('../models/transactionModel');
const User = require('../models/userModel');

// Initialize Midtrans Snap client
const snap = new midtransClient.Snap({
  isProduction: process.env.NODE_ENV === 'production',
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// @desc    Get all available subscription packages
// @route   GET /api/v1/packages
// @access  Public
const getAvailablePackages = async (req, res) => {
    try {
        const packages = await Package.find({}).sort({ price: 1 }); // Sort by price ascending
        res.status(200).json(packages);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new payment order with Midtrans
// @route   POST /api/v1/subscription/order
// @access  Private
const createOrder = async (req, res) => {
  try {
    const { packageId } = req.body;
    const user = req.user; // From 'protect' middleware

    const selectedPackage = await Package.findById(packageId);
    if (!selectedPackage) {
      return res.status(404).json({ message: 'Package not found' });
    }

    if (selectedPackage.price <= 0) {
        return res.status(400).json({ message: 'This package cannot be purchased.'});
    }

    // Use a more robust unique order ID
    const orderId = `TRX-${user._id}-${Date.now()}`;

    // Create a transaction record in the database with 'pending' status
    await Transaction.create({
      user: user._id,
      package: selectedPackage._id,
      orderId,
      amount: selectedPackage.price,
      status: 'pending'
    });

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: selectedPackage.price
      },
      customer_details: {
        first_name: user.name,
        email: user.email,
      },
      // Optional: Add item details
      item_details: [{
        id: selectedPackage._id,
        price: selectedPackage.price,
        quantity: 1,
        name: `${selectedPackage.name} Package`
      }]
    };

    const token = await snap.createTransactionToken(parameter);
    res.status(200).json({ token, orderId });

  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Handle incoming notifications from Midtrans
// @route   POST /api/v1/midtrans/notification
// @access  Public
const handleNotification = async (req, res) => {
    try {
        const notification = req.body;

        // Use the library to create a secure notification handler
        const statusResponse = await snap.transaction.notification(notification);

        const orderId = statusResponse.order_id;
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;

        console.log(`Midtrans notification received. Order ID: ${orderId}, Status: ${transactionStatus}, Fraud: ${fraudStatus}`);

        const transaction = await Transaction.findOne({ orderId }).populate('package');
        if (!transaction) {
            console.warn(`Transaction with orderId ${orderId} not found.`);
            // Acknowledge to prevent Midtrans from retrying, but log the issue.
            return res.sendStatus(200);
        }

        // --- IMPORTANT: Signature Key Verification ---
        const signatureKey = crypto.createHash('sha512')
                                .update(`${orderId}${transactionStatus}${statusResponse.gross_amount}${process.env.MIDTRANS_SERVER_KEY}`)
                                .digest('hex');

        if (signatureKey !== statusResponse.signature_key) {
            console.error(`Invalid signature for orderId ${orderId}`);
            return res.status(403).json({ message: 'Invalid signature key' });
        }

        // Don't process if the transaction is already successful or failed
        if (transaction.status === 'success' || transaction.status === 'failed') {
            return res.status(200).json({ message: 'Transaction already processed.' });
        }

        if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
            if (fraudStatus === 'accept') {
                // Payment success
                transaction.status = 'success';
                transaction.paymentGatewayData = notification;

                // Update user's package and expiry date
                const user = await User.findById(transaction.user);

                // Calculate new expiry date
                const currentExpiry = user.packageExpiresAt && user.packageExpiresAt > new Date() ? user.packageExpiresAt : new Date();
                const newExpiryDate = new Date(currentExpiry);
                newExpiryDate.setDate(newExpiryDate.getDate() + transaction.package.durationDays);

                user.package = transaction.package._id;
                user.packageExpiresAt = newExpiryDate;

                // If user was requesting API access, approve it on successful payment (business rule)
                if(user.apiAccessStatus === 'requested' && transaction.package.apiAccess){
                    user.apiAccessStatus = 'approved';
                }

                await user.save();
            }
        } else if (transactionStatus === 'expire' || transactionStatus === 'cancel' || transactionStatus === 'deny') {
            transaction.status = 'failed';
        }

        await transaction.save();
        res.status(200).json({ message: 'Notification processed successfully' });

    } catch (error) {
        console.error('Error handling Midtrans notification:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


module.exports = {
    getAvailablePackages,
    createOrder,
    handleNotification,
};
