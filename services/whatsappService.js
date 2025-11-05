const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const path = require('path');
const db = require('../models');
const { getIO } = require('../socket');
const qrcode = require('qrcode');

const sessions = new Map();
const qrRetryCounts = new Map();

const MAX_QR_RETRIES = 3;

async function createWhatsAppSession(instanceId, deviceId) {
    const sessionPath = path.join(__dirname, '..', 'sessions', instanceId);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const io = getIO();

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Kita akan handle QR secara manual
        browser: ["Chrome (Linux)", "", ""], // Tiru browser untuk stabilitas
    });

    sessions.set(instanceId, { sock, deviceId });
    qrRetryCounts.set(instanceId, 0);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            try {
                const qrCodeDataUrl = await qrcode.toDataURL(qr);
                io.to(instanceId).emit('qr_code', qrCodeDataUrl);
                console.log(`[${instanceId}] QR code generated and sent to client.`);
            } catch (err) {
                console.error(`[${instanceId}] Failed to generate QR code data URL:`, err);
            }
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`[${instanceId}] Connection closed due to`, lastDisconnect.error, `, reconnecting: ${shouldReconnect}`);

            await db.Device.update({ status: 'disconnected' }, { where: { id: deviceId } });
            io.to(instanceId).emit('status_update', { status: 'DISCONNECTED', message: 'Device disconnected.', instanceId });

            if (!shouldReconnect) {
                console.log(`[${instanceId}] Not reconnecting, device logged out.`);
                deleteSession(instanceId);
            }
        } else if (connection === 'open') {
            console.log(`[${instanceId}] Connection opened.`);
            await db.Device.update({ status: 'connected' }, { where: { id: deviceId } });
            io.to(instanceId).emit('status_update', { status: 'CONNECTED', message: 'Device connected successfully!', instanceId });
        }
    });

    return sock;
}

async function generateQRCode(instanceId, deviceId) {
    if (sessions.has(instanceId)) {
        console.log(`[${instanceId}] Session already exists. Not creating a new one.`);
        return;
    }
    console.log(`[${instanceId}] Creating new WhatsApp session...`);
    await createWhatsAppSession(instanceId, deviceId);
}

async function reconnectSession(instanceId, deviceId) {
    console.log(`[${instanceId}] Attempting to reconnect session...`);
    // Hapus sesi lama jika ada
    if (sessions.has(instanceId)) {
        deleteSession(instanceId);
    }
    // Buat sesi baru
    await createWhatsAppSession(instanceId, deviceId);
}


function deleteSession(instanceId) {
    if (sessions.has(instanceId)) {
        sessions.get(instanceId).sock.logout();
        sessions.delete(instanceId);
        qrRetryCounts.delete(instanceId);

        const sessionPath = path.join(__dirname, '..', 'sessions', instanceId);
        // Hapus file sesi secara rekursif (opsional, tambahkan jika perlu)
        // fs.rmdirSync(sessionPath, { recursive: true });

        console.log(`[${instanceId}] Session deleted.`);
    }
}

async function reconnectExistingSessions() {
    try {
        const devices = await db.Device.findAll({ where: { status: 'connected' } });
        console.log(`Found ${devices.length} devices to reconnect.`);
        for (const device of devices) {
            console.log(`Reconnecting device: ${device.remark} (Instance: ${device.instanceId})`);
            await createWhatsAppSession(device.instanceId, device.id);
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
