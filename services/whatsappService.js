const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const path = require('path');
const db = require('../models');
const { getIO } = require('../socket');
const qrcode = require('qrcode');

const sessions = new Map();
const qrRetryCounts = new Map();

const MAX_QR_RETRIES = 3;

async function createWhatsAppSession(sessionId, deviceId) {
    const sessionPath = path.join(__dirname, '..', 'sessions', sessionId);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const io = getIO();

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Kita akan handle QR secara manual
    });

    sessions.set(sessionId, { sock, deviceId });
    qrRetryCounts.set(sessionId, 0);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            try {
                const qrCodeDataUrl = await qrcode.toDataURL(qr);
                io.to(sessionId).emit('qr_code', qrCodeDataUrl);
                console.log(`[${sessionId}] QR code generated and sent to client.`);
            } catch (err) {
                console.error(`[${sessionId}] Failed to generate QR code data URL:`, err);
            }
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`[${sessionId}] Connection closed due to`, lastDisconnect.error, `, reconnecting: ${shouldReconnect}`);

            await db.Device.update({ status: 'DISCONNECTED' }, { where: { id: deviceId } });
            io.to(sessionId).emit('status_update', { status: 'DISCONNECTED', message: 'Device disconnected.' });

            if (!shouldReconnect) {
                console.log(`[${sessionId}] Not reconnecting, device logged out.`);
                deleteSession(sessionId);
            }
        } else if (connection === 'open') {
            console.log(`[${sessionId}] Connection opened.`);
            await db.Device.update({ status: 'CONNECTED' }, { where: { id: deviceId } });
            io.to(sessionId).emit('status_update', { status: 'CONNECTED', message: 'Device connected successfully!' });
        }
    });

    return sock;
}

async function generateQRCode(sessionId, deviceId) {
    if (sessions.has(sessionId)) {
        console.log(`[${sessionId}] Session already exists. Not creating a new one.`);
        return;
    }
    console.log(`[${sessionId}] Creating new WhatsApp session...`);
    await createWhatsAppSession(sessionId, deviceId);
}

async function reconnectSession(sessionId, deviceId) {
    console.log(`[${sessionId}] Attempting to reconnect session...`);
    // Hapus sesi lama jika ada
    if (sessions.has(sessionId)) {
        deleteSession(sessionId);
    }
    // Buat sesi baru
    await createWhatsAppSession(sessionId, deviceId);
}


function deleteSession(sessionId) {
    if (sessions.has(sessionId)) {
        sessions.get(sessionId).sock.logout();
        sessions.delete(sessionId);
        qrRetryCounts.delete(sessionId);

        const sessionPath = path.join(__dirname, '..', 'sessions', sessionId);
        // Hapus file sesi secara rekursif (opsional, tambahkan jika perlu)
        // fs.rmdirSync(sessionPath, { recursive: true });

        console.log(`[${sessionId}] Session deleted.`);
    }
}

async function reconnectExistingSessions() {
    try {
        const devices = await db.Device.findAll({ where: { status: 'CONNECTED' } });
        console.log(`Found ${devices.length} devices to reconnect.`);
        for (const device of devices) {
            console.log(`Reconnecting device: ${device.name} (Session: ${device.sessionId})`);
            await createWhatsAppSession(device.sessionId, device.id);
        }
    } catch (error) {
        console.error('Error reconnecting existing sessions:', error);
    }
}

function getClient(sessionId) {
    return sessions.get(sessionId)?.sock;
}

module.exports = {
    generateQRCode,
    deleteSession,
    reconnectSession,
    reconnectExistingSessions,
    getClient,
};
