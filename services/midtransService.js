const midtransClient = require('midtrans-client');
const db = require('../models');

const createTransaction = async (userId, orderId, amount) => {
    // Ambil Kunci Server dari database
    const serverKeySetting = await db.Setting.findOne({ where: { key: 'midtransServerKey' } });
    if (!serverKeySetting || !serverKeySetting.value) {
        throw new Error('Midtrans Server Key is not configured in admin settings.');
    }

    // Buat instance Snap API
    const snap = new midtransClient.Snap({
        isProduction: false, // Set to true for production
        serverKey: serverKeySetting.value,
    });

    // Ambil detail pengguna
    const user = await db.User.findByPk(userId);
    if (!user) {
        throw new Error('User not found.');
    }

    // Definisikan parameter transaksi
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

    // Buat transaksi dan kembalikan token
    const transaction = await snap.createTransaction(parameter);
    return transaction.token;
};

const handleNotification = async (notification) => {
    // Ambil Kunci Server dari database untuk verifikasi
    const serverKeySetting = await db.Setting.findOne({ where: { key: 'midtransServerKey' } });
    if (!serverKeySetting || !serverKeySetting.value) {
        throw new Error('Midtrans Server Key is not configured.');
    }

    // Buat instance Core API untuk verifikasi
    const core = new midtransClient.CoreApi({
        isProduction: false,
        serverKey: serverKeySetting.value,
    });

    // Verifikasi notifikasi
    const statusResponse = await core.transaction.notification(notification);
    const orderId = statusResponse.order_id;
    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;

    if (transactionStatus == 'capture' || transactionStatus == 'settlement') {
        if (fraudStatus == 'accept') {
            // Find the subscription by order_id
            const subscription = await db.Subscription.findOne({ where: { midtransOrderId: orderId } });
            if (subscription) {
                // Extend the subscription
                const currentExpiry = new Date(subscription.expiresAt);
                const newExpiry = new Date(currentExpiry.setMonth(currentExpiry.getMonth() + 1));
                subscription.expiresAt = newExpiry;
                await subscription.save();
                console.log(`Subscription for order ${orderId} extended.`);
            }
        }
    }
};


module.exports = { createTransaction, handleNotification };
