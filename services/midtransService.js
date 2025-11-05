const midtransClient = require('midtrans-client');
const db = require('../models');

// Helper function to get Midtrans settings from the database
const getMidtransConfig = async () => {
    try {
        const serverKey = await db.Setting.findOne({ where: { key: 'midtransServerKey' } });
        const clientKey = await db.Setting.findOne({ where: { key: 'midtransClientKey' } });

        if (!serverKey?.value || !clientKey?.value) {
            console.warn("Midtrans keys are not configured in the admin settings.");
            // Fallback to environment variables if settings are not in DB
            return {
                isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
                serverKey: process.env.MIDTRANS_SERVER_KEY,
                clientKey: process.env.MIDTRANS_CLIENT_KEY,
            };
        }

        return {
            isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true', // Still use env for production flag
            serverKey: serverKey.value,
            clientKey: clientKey.value,
        };
    } catch (error) {
        console.error("Could not fetch Midtrans config from DB, falling back to ENV.", error);
        // Fallback in case of DB error
        return {
            isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
            serverKey: process.env.MIDTRANS_SERVER_KEY,
            clientKey: process.env.MIDTRANS_CLIENT_KEY,
        };
    }
};


/**
 * Create a new Midtrans Snap transaction.
 */
const createTransaction = async (userId, orderId, amount) => {
    const config = await getMidtransConfig();
    const snap = new midtransClient.Snap(config);

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
 */
const handleNotification = async (notification) => {
    const config = await getMidtransConfig();
    const apiClient = new midtransClient.CoreApi(config);

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

    const durationDays = transaction.package.durationDays;
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
