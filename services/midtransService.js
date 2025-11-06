const axios = require('axios');
const midtransClient = require('midtrans-client');
const db = require('../models');

// Helper function to get Midtrans settings from the database
const getMidtransConfig = async () => {
    try {
        const serverKeySetting = await db.Setting.findOne({ where: { key: 'midtransServerKey' } });
        const isProductionSetting = await db.Setting.findOne({ where: { key: 'midtransIsProduction' } });
        const notificationUrlSetting = await db.Setting.findOne({ where: { key: 'midtransNotificationUrl' } });


        const isProduction = isProductionSetting ? (isProductionSetting.value === 'true' || isProductionSetting.value === 1) : false;
        const serverKey = serverKeySetting ? serverKeySetting.value : process.env.MIDTRANS_SERVER_KEY;
        const notificationUrl = notificationUrlSetting ? notificationUrlSetting.value : null;


        if (!serverKey) {
            throw new Error("Midtrans Server Key is not configured.");
        }

        return {
            isProduction,
            serverKey,
            notificationUrl,
        };
    } catch (error) {
        console.error("Error reading Midtrans config:", error);
        throw error; // Re-throw the error to be caught by the caller
    }
};


/**
 * Create a new Midtrans Core API QRIS transaction.
 */
const createTransaction = async (userId, orderId, amount) => {
    const config = await getMidtransConfig();

    const url = config.isProduction
        ? 'https://api.midtrans.com/v2/charge'
        : 'https://api.sandbox.midtrans.com/v2/charge';

    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${Buffer.from(config.serverKey).toString('base64')}`
    };

    // Add custom notification URL if it exists in settings
    if (config.notificationUrl) {
        headers['X-Append-Notification'] = config.notificationUrl;
    }

    const body = {
        payment_type: 'qris',
        transaction_details: {
            order_id: orderId,
            gross_amount: amount,
        },
        qris: {
            acquirer: 'gopay' // This is often required for QRIS generation
        }
    };

    try {
        const response = await axios.post(url, body, { headers });
        return response.data; // Return the full response from Midtrans
    } catch (error) {
        console.error('Midtrans API request failed:', error.response ? error.response.data : error.message);
        const errorMessage = error.response?.data?.status_message || 'Failed to create Midtrans transaction.';
        throw new Error(errorMessage);
    }
};


/**
 * Handle incoming Midtrans notifications.
 */
const handleNotification = async (notification) => {
    // We need a CoreApi instance to validate the notification signature
    const config = await getMidtransConfig();
    const coreApi = new midtransClient.CoreApi({
        isProduction: config.isProduction,
        serverKey: config.serverKey,
        clientKey: '' // Client key is not needed for server-side validation
    });

    // Use Core API to verify notification for better security
    const statusResponse = await coreApi.transaction.notification(notification);
    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;

    console.log(`Received notification for orderId ${orderId}: transactionStatus ${transactionStatus}, fraudStatus ${fraudStatus}`);

    const transaction = await db.Transaction.findOne({
        where: { orderId },
        include: ['package', 'user']
    });

    if (!transaction) {
        console.warn(`Webhook ignored: Transaction with orderId ${orderId} not found.`);
        return;
    }

    if (transactionStatus == 'capture' || transactionStatus == 'settlement') {
        if (fraudStatus == 'accept') {
            await updateTransactionAndUser(transaction, 'success');
        }
    } else if (transactionStatus == 'cancel' || transactionStatus == 'expire' || transactionStatus == 'deny') {
        await transaction.update({ status: 'failed' });
    }
};

/**
 * Helper function to update transaction and user details on successful payment.
 */
async function updateTransactionAndUser(transaction, status) {
    if (transaction.status === 'success') {
        console.log(`Transaction ${transaction.orderId} is already successful. Ignoring update.`);
        return;
    }

    // Calculate the new expiry date based on the total duration of the purchase
    const totalAmount = transaction.amount;
    const pricePerMonth = transaction.package.price;
    const numMonths = (pricePerMonth > 0) ? (totalAmount / pricePerMonth) : 1;
    const durationDays = transaction.package.durationDays * numMonths;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    await transaction.update({ status, expiresAt });

    const user = transaction.user;
    user.packageId = transaction.packageId;
    user.packageExpiresAt = expiresAt;
    user.messageCount = 0;
    user.lastResetDate = new Date();

    await user.save();
    console.log(`User ${user.email} successfully subscribed to package ${transaction.package.name}. Expires on ${expiresAt}.`);
}

module.exports = {
    createTransaction,
    handleNotification,
};
