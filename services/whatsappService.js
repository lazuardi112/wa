const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const db = require('../models');
const { getIO } = require('../socket');
const qrcode = require('qrcode');
const { processMessage } = require('./botService'); // Import the new bot service

const sessions = new Map();

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
        browser: Browsers.macOS('Chrome'), // Menggunakan User Agent standar yang diperbarui
        logger,
    });

    sessions.set(instanceId, { sock, deviceId });

    // Listener untuk pembaruan kredensial
    sock.ev.on('creds.update', saveCreds);

    // Listener utama untuk pembaruan status koneksi
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log(`[${instanceId}] QR string received.`);
            try {
                const qrCodeDataUrl = await qrcode.toDataURL(qr);
                io.to(instanceId).emit('qr_code', qrCodeDataUrl);
                console.log(`[${instanceId}] QR code generated and sent to client.`);
                await db.Device.update({ status: 'waiting_qr' }, { where: { id: deviceId } });
            } catch (err) {
                console.error(`[${instanceId}] Failed to generate QR code data URL:`, err);
                io.to(instanceId).emit('status_update', { status: 'ERROR', message: 'Failed to generate QR code.', instanceId });
            }
        }

        if (connection === 'close') {
            const error = lastDisconnect?.error;
            const statusCode = (error instanceof Boom) ? error.output.statusCode : 0; // Default to 0 if not a Boom error

            console.log(`[${instanceId}] Connection closed.`, `Status Code: ${statusCode}`, `Error: ${error}`);

            await db.Device.update({ status: 'disconnected' }, { where: { id: deviceId } });
            io.to(instanceId).emit('status_update', { status: 'DISCONNECTED', message: 'Device disconnected.', instanceId });

            // Reconnection logic that prevents loops.
            // Only reconnect automatically if the error is explicitly 'restartRequired'.
            if (statusCode === DisconnectReason.restartRequired) {
                console.log(`[${instanceId}] Reconnecting: Restart is required.`);
                connectToWhatsApp(instanceId, deviceId);
            } else if (statusCode === DisconnectReason.loggedOut) {
                console.log(`[${instanceId}] Not Reconnecting: Device was logged out.`);
                deleteSession(instanceId, true);
            } else {
                console.log(`[${instanceId}] Not Reconnecting: Automatic reconnection is disabled for this type of disconnect to prevent loops. Status code: ${statusCode}`);
            }

        } else if (connection === 'open') {
            console.log(`[${instanceId}] Connection opened successfully.`);
            await db.Device.update({ status: 'connected' }, { where: { id: deviceId } });
            io.to(instanceId).emit('status_update', { status: 'CONNECTED', message: 'Device connected successfully!', instanceId });
        }
    });

    // Listener untuk pesan masuk, sekarang mendelegasikannya ke botService
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        // Teruskan ke botService untuk diproses, berikan instance 'sock'
        await processMessage(sock, msg, instanceId, deviceId);
    });

    return sock;
}

// Fungsi yang dipanggil oleh controller untuk memulai sesi baru
async function generateQRCode(instanceId, deviceId) {
    const sessionPath = path.join(__dirname, '..', 'sessions', instanceId);

    // Hapus paksa direktori sesi yang ada untuk memastikan awal yang bersih
    if (fs.existsSync(sessionPath)) {
        console.log(`[${instanceId}] Removing existing session files...`);
        fs.rmSync(sessionPath, { recursive: true, force: true });
    }

    // Hapus instance sesi yang ada dari memori jika ada
    if (sessions.has(instanceId)) {
        console.log(`[${instanceId}] Deleting in-memory session...`);
        deleteSession(instanceId, false); // Jangan panggil logout karena koneksi mungkin sudah mati
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

/**
 * Send a message using a specific client instance.
 * @param {string} instanceId - The instance ID of the sender device.
 * @param {string} to - The recipient's phone number.
 * @param {string} message - The message text.
 */
const sendMessage = async (instanceId, to, message) => {
    const client = getClient(instanceId);
    if (!client) {
        throw new Error('WhatsApp client not found for this instance.');
    }

    // Format number
    let formattedNumber = to.replace(/\D/g, '');
    if (formattedNumber.startsWith('0')) {
        formattedNumber = '62' + formattedNumber.slice(1);
    }
    if (!formattedNumber.endsWith('@s.whatsapp.net')) {
        formattedNumber += '@s.whatsapp.net';
    }

    await client.sendMessage(formattedNumber, { text: message });
};

module.exports = {
    generateQRCode,
    deleteSession,
    reconnectSession,
    reconnectExistingSessions,
    getClient,
    sendMessage, // Export the new function
};
