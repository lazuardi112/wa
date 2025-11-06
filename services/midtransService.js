const midtransClient = require('midtrans-client');
const db = require('../models');
const fs = require('fs');
const path = require('path');

// Helper function to get Midtrans settings exclusively from the database
const getMidtransConfig = async () => {
    try {
        const settings = await db.Setting.findAll({
            where: {
                key: ['midtransServerKey', 'midtransClientKey', 'midtransEnvironment']
            }
        });

        const config = {};
        settings.forEach(setting => {
            config[setting.key] = setting.value;
        });

        if (!config.midtransServerKey || !config.midtransClientKey) {
            throw new Error("Midtrans server key or client key is not configured in admin settings.");
        }

        return {
            isProduction: config.midtransEnvironment === 'production',
            serverKey: config.midtransServerKey,
            clientKey: config.midtransClientKey,
        };
    } catch (error) {
        console.error("Error reading Midtrans config from database:", error);
        // In case of a critical error, we prevent the app from proceeding with invalid config.
        throw new Error("Failed to retrieve Midtrans configuration from database.");
    }
};


/**
 * Create a new Midtrans Snap transaction.
 */
const createTransaction = async (userId, orderId, amount, durationDays) => {
    const config = await getMidtransConfig();
    const snap = new midtransClient.Snap({
        isProduction: config.isProduction,
        serverKey: config.serverKey,
        clientKey: config.clientKey
    });

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

    // Check for notification URL override from settings
    const notificationUrlSetting = await db.Setting.findOne({ where: { key: 'midtransNotificationUrl' } });
    if (notificationUrlSetting && notificationUrlSetting.value) {
        parameter.callbacks = {
            finish: notificationUrlSetting.value
        };
    }

    const transaction = await snap.createTransaction(parameter);
    return transaction.token;
};

/**
 * Handle incoming Midtrans notifications.
 */
const handleNotification = async (notification) => {
    const config = await getMidtransConfig();
    const apiClient = new midtransClient.CoreApi({
        isProduction: config.isProduction,
        serverKey: config.serverKey,
        clientKey: config.clientKey
    });

    // Use Core API to verify notification for better security
    const statusResponse = await apiClient.transaction.notification(notification);
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
