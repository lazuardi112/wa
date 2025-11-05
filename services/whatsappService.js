const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const path = require('path');
const pino = require('pino');
const db = require('../models');
const { getIO } = require('../socket');
const qrcode = require('qrcode');

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
