const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const path = require('path');
const pino = require('pino');
const db = require('../models');
const { getIO } = require('../socket');
const qrcode = require('qrcode');

const sessions = new Map();
const conversationState = new Map(); // Untuk melacak status percakapan bot

// Fungsi utama untuk membuat dan mengelola sesi koneksi
async function connectToWhatsApp(instanceId, deviceId) {
    const sessionPath = path.join(__dirname, '..', 'sessions', instanceId);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const io = getIO();

    // Logger untuk debugging yang lebih baik
    const logger = pino({ level: 'silent' }).child({ level: 'silent' });

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.macOS('Desktop'), // Meniru browser yang lebih umum
        logger,
    });

    sessions.set(instanceId, { sock, deviceId });

    // Listener untuk pembaruan kredensial
    sock.ev.on('creds.update', saveCreds);

    // Listener utama untuk pembaruan status koneksi
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            try {
                const qrCodeDataUrl = await qrcode.toDataURL(qr);
                io.to(instanceId).emit('qr_code', qrCodeDataUrl);
                console.log(`[${instanceId}] QR code generated and sent to client.`);
                await db.Device.update({ status: 'waiting_qr' }, { where: { id: deviceId } });
            } catch (err) {
                console.error(`[${instanceId}] Failed to generate QR code data URL:`, err);
            }
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect.error instanceof Boom)?.output?.statusCode;
            console.log(`[${instanceId}] Connection closed due to statusCode ${statusCode}`);

            await db.Device.update({ status: 'disconnected' }, { where: { id: deviceId } });
            io.to(instanceId).emit('status_update', { status: 'DISCONNECTED', message: 'Device disconnected.', instanceId });

            // Logika rekoneksi yang disempurnakan
            if (statusCode === DisconnectReason.loggedOut) {
                console.log(`[${instanceId}] Device Logged Out, please re-scan.`);
                deleteSession(instanceId, true); // Hapus sesi sepenuhnya
            } else {
                // Untuk semua error lain (termasuk restartRequired), coba sambungkan kembali
                console.log(`[${instanceId}] Reconnecting...`);
                connectToWhatsApp(instanceId, deviceId);
            }

        } else if (connection === 'open') {
            console.log(`[${instanceId}] Connection opened successfully.`);
            await db.Device.update({ status: 'connected' }, { where: { id: deviceId } });
            io.to(instanceId).emit('status_update', { status: 'CONNECTED', message: 'Device connected successfully!', instanceId });
        }
    });

    // Listener untuk pesan masuk (logika bot)
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const messageText = (msg.message.conversation || msg.message.extendedTextMessage?.text)?.trim().toLowerCase();

        if (!messageText) return;

        const currentState = conversationState.get(sender);

        try {
            // Find the user associated with this device to check their message limit
            const device = await db.Device.findOne({ where: { id: deviceId } });
            if (!device) return; // Should not happen if the session is active

            const user = await db.User.findByPk(device.userId);
            if (!user) return; // Should not happen

            // Find the user's current package
            let subscription = await db.Transaction.findOne({
                where: { userId: user.id, status: 'success' },
                order: [['expiresAt', 'DESC']],
                include: ['package']
            });

            if (!subscription || new Date() > new Date(subscription.expiresAt)) {
                const freePackage = await db.Package.findOne({ where: { name: 'Free' } });
                subscription = { package: freePackage };
            }

            const userPackage = subscription.package;

            // Reset daily message count if needed
            const today = new Date().setHours(0, 0, 0, 0);
            const lastReset = user.lastResetDate ? new Date(user.lastResetDate).setHours(0, 0, 0, 0) : null;
            if (lastReset !== today) {
                user.messageCount = 0;
                user.lastResetDate = new Date();
                await user.save();
            }

            // Check if user has messages left before processing bot logic
            if (user.messageCount >= userPackage.messageLimit) {
                console.log(`[${instanceId}] User ${user.email} has reached their message limit. Bot response not sent.`);
                return; // Stop processing if limit is reached
            }

            let flowsToSearch;
            // Jika pengguna berada dalam percakapan, cari balasan turunan
            if (currentState) {
                flowsToSearch = await db.BotFlow.findAll({
                    where: {
                        deviceId: deviceId,
                        isEnabled: true,
                        parentId: currentState.currentFlowId,
                    },
                });
            } else {
                // Jika tidak, cari pemicu tingkat atas
                flowsToSearch = await db.BotFlow.findAll({
                    where: {
                        deviceId: deviceId,
                        isEnabled: true,
                        parentId: null,
                    },
                });
            }

            const matchedFlow = flowsToSearch.find(flow => messageText === flow.prefix.toLowerCase());

            if (matchedFlow) {
                // Increment message count before sending
                user.messageCount += 1;
                await user.save();

                for (const res of matchedFlow.response) {
                    if (res.type === 'image') {
                        await sock.sendMessage(sender, {
                            image: { url: res.content }
                        });
                    } else {
                        await sock.sendMessage(sender, { text: res.content });
                    }
                    // Tambahkan jeda singkat antar pesan
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                console.log(`[${instanceId}] Bot response sent to ${sender} for prefix "${matchedFlow.prefix}". User message count is now ${user.messageCount}.`);

                // Periksa apakah alur ini memiliki turunan
                const children = await db.BotFlow.findAll({ where: { parentId: matchedFlow.id, isEnabled: true } });

                if (children.length > 0) {
                    // Masuk ke status percakapan
                    conversationState.set(sender, {
                        currentFlowId: matchedFlow.id,
                        lastInteraction: Date.now(),
                    });
                } else {
                    // Alur akhir, hapus status
                    conversationState.delete(sender);
                }
            } else if (currentState) {
                // Jika pengguna berada dalam percakapan tetapi tidak ada yang cocok, keluar
                conversationState.delete(sender);
                // Opsional: Kirim pesan "Saya tidak mengerti"
            }
        } catch (error) {
            console.error(`[${instanceId}] Error processing bot logic:`, error);
        }
    });

    return sock;
}

// Fungsi yang dipanggil oleh controller untuk memulai sesi baru
async function generateQRCode(instanceId, deviceId) {
    if (sessions.has(instanceId)) {
        console.log(`[${instanceId}] Session already exists.`);
        return;
    }
    console.log(`[${instanceId}] Creating new WhatsApp session...`);
    connectToWhatsApp(instanceId, deviceId);
}

// Fungsi yang dipanggil oleh controller untuk menyambungkan kembali sesi yang ada
async function reconnectSession(instanceId, deviceId) {
    console.log(`[${instanceId}] Attempting to reconnect session...`);
    connectToWhatsApp(instanceId, deviceId);
}

// Fungsi untuk menghapus sesi
function deleteSession(instanceId, isLogout = false) {
    if (sessions.has(instanceId)) {
        const { sock } = sessions.get(instanceId);
        if (isLogout) {
            sock.logout();
        } else {
            sock.end(new Error('Session deleted manually'));
        }
        sessions.delete(instanceId);

        const sessionPath = path.join(__dirname, '..', 'sessions', instanceId);
        // Hapus file sesi jika perlu (tambahkan fs.rmdirSync jika diperlukan)
        console.log(`[${instanceId}] Session deleted.`);
    }
}

// Fungsi untuk menyambungkan kembali semua sesi yang ada saat server dimulai
async function reconnectExistingSessions() {
    try {
        const devices = await db.Device.findAll({ where: { status: 'connected' } });
        console.log(`Found ${devices.length} devices to reconnect.`);
        for (const device of devices) {
            console.log(`Reconnecting device: ${device.remark} (Instance: ${device.instanceId})`);
            connectToWhatsApp(device.instanceId, device.id);
        }
    } catch (error) {
        console.error('Error reconnecting existing sessions:', error);
    }
}

function getClient(instanceId) {
    return sessions.get(instanceId)?.sock;
}

module.exports = {
    generateQRCode,
    deleteSession,
    reconnectSession,
    reconnectExistingSessions,
    getClient,
};
