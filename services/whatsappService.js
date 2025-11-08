const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    Browsers
} = require('@whiskeysockets/baileys');

const { Boom } = require('@hapi/boom');
const path = require('path');
const pino = require('pino');
const db = require('../models');
const { getIO } = require('../socket');
const qrcode = require('qrcode');
const { processMessage } = require('./botService');

const sessions = new Map();

async function connectToWhatsApp(instanceId, deviceId) {
    const sessionPath = path.join(__dirname, '..', 'sessions', instanceId);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const io = getIO();

    const logger = pino({ level: "silent" });

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger,

        // FIX 405 → gunakan user-agent yang pasti diterima WhatsApp
        browser: ['Chrome', 'Linux', '3.0'],

        // FIX 405 → WA Web versi terbaru yang stabil untuk Baileys
        version: [2, 3000, 101],

        syncFullHistory: false,

        // FIX LOOP → jangan auto reconnect
        shouldReconnect: () => false
    });

    sessions.set(instanceId, { sock, deviceId });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log(`[${instanceId}] QR Received`);
            const qrCode = await qrcode.toDataURL(qr);
            io.to(instanceId).emit('qr_code', qrCode);

            await db.Device.update({ status: "waiting_qr" }, { where: { id: deviceId } });
        }

        if (connection === 'open') {
            console.log(`[${instanceId}] Connected`);
            await db.Device.update({ status: "connected" }, { where: { id: deviceId } });

            io.to(instanceId).emit('status_update', {
                status: "CONNECTED",
                message: "Device connected",
                instanceId
            });
        }

        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;

            console.log(`[${instanceId}] Closed → ${reason}`);

            await db.Device.update({ status: "disconnected" }, { where: { id: deviceId } });

            // FIX 405 LOOP (NO AUTO RECONNECT)
            if (reason === DisconnectReason.loggedOut) {
                console.log(`[${instanceId}] Logged out, deleting session`);
                deleteSession(instanceId, true);
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        await processMessage(sock, msg, instanceId, deviceId);
    });

    return sock;
}

async function generateQRCode(instanceId, deviceId) {
    if (sessions.has(instanceId)) return;
    console.log(`[${instanceId}] Creating new session…`);
    connectToWhatsApp(instanceId, deviceId);
}

function deleteSession(instanceId, isLogout = false) {
    const data = sessions.get(instanceId);
    if (!data) return;

    const { sock } = data;
    if (isLogout) sock.logout();
    else sock.end(new Error("Manual close"));

    sessions.delete(instanceId);
    console.log(`[${instanceId}] Session deleted`);
}

async function reconnectExistingSessions() {
    const devices = await db.Device.findAll({ where: { status: 'connected' } });

    for (const d of devices) {
        console.log(`Reconnect ${d.instanceId}`);
        connectToWhatsApp(d.instanceId, d.id);
    }
}

function getClient(instanceId) {
    return sessions.get(instanceId)?.sock;
}

async function sendMessage(instanceId, to, message) {
    const client = getClient(instanceId);
    if (!client) throw new Error("Client not found");

    let number = to.replace(/\D/g, '');
    if (number.startsWith("0")) number = "62" + number.slice(1);
    if (!number.endsWith("@s.whatsapp.net")) number += "@s.whatsapp.net";

    await client.sendMessage(number, { text: message });
}

module.exports = {
    generateQRCode,
    deleteSession,
    reconnectExistingSessions,
    getClient,
    sendMessage
};