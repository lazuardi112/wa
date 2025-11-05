const midtransClient = require('midtrans-client');
const db = require('../models');
const crypto = require('crypto');

// Initialize Midtrans Snap client
const snap = new midtransClient.Snap({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

/**
 * Create a new Midtrans Snap transaction.
 */
const createTransaction = async (userId, orderId, amount) => {
    const user = await db.User.findByPk(userId);
    if (!user) {
        throw new Error('User not found');
    }

    const parameter = {
        transaction_details: {
            order_id: orderId,
            gross_amount: amount,
        },
        customer_details: {
            first_name: user.name,
            email: user.email,
            phone: user.whatsappNumber,
        },
        credit_card: {
            secure: true,
        },
    };

    const transaction = await snap.createTransaction(parameter);
    return transaction.token;
};

/**
 * Handle incoming Midtrans notifications.
 * Verifies the signature and updates the transaction and user status.
 * @param {object} notification - The notification payload from Midtrans.
 */
const handleNotification = async (notification) => {
    // 1. Verify the notification signature (more secure)
    const statusResponse = await snap.transaction.notification(notification);
    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;

    console.log(`Received notification for orderId ${orderId}: transactionStatus ${transactionStatus}, fraudStatus ${fraudStatus}`);

    // Find the transaction in the database
    const transaction = await db.Transaction.findOne({
        where: { orderId },
        include: ['package', 'user']
    });

    if (!transaction) {
        console.warn(`Webhook ignored: Transaction with orderId ${orderId} not found.`);
        return;
    }

    // 2. Check transaction status
    if (transactionStatus == 'capture') {
        if (fraudStatus == 'accept') {
            // Payment successful
            await updateTransactionAndUser(transaction, 'success');
        }
    } else if (transactionStatus == 'settlement') {
        // Payment successful
        await updateTransactionAndUser(transaction, 'success');
    } else if (transactionStatus == 'cancel' || transactionStatus == 'expire' || transactionStatus == 'deny') {
        // Payment failed
        await transaction.update({ status: 'failed' });
    }
};

/**
 * Helper function to update transaction and user details on successful payment.
 * @param {object} transaction - The Sequelize transaction object.
 * @param {string} status - The new status for the transaction.
 */
async function updateTransactionAndUser(transaction, status) {
    if (transaction.status === 'success') {
        console.log(`Transaction ${transaction.orderId} is already successful. Ignoring update.`);
        return;
    }

    const durationDays = transaction.package.durationDays;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    // Update transaction
    await transaction.update({ status, expiresAt });

    // Update user's package details
    const user = transaction.user;
    user.packageId = transaction.packageId;
    user.packageExpiresAt = expiresAt;

    // Reset message count on upgrade/renewal
    user.messageCount = 0;
    user.lastResetDate = new Date();

    await user.save();
    console.log(`User ${user.email} successfully subscribed to package ${transaction.package.name}. Expires on ${expiresAt}.`);
}

module.exports = {
    createTransaction,
    handleNotification,
};
