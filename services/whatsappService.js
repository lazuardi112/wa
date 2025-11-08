const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    Browsers,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const db = require('../models');
const { getIO } = require('../socket');
const qrcode = require('qrcode');
const { processMessage } = require('./botService');

const sessions = new Map();

async function connectToWhatsApp(instanceId, deviceId) {
    const io = getIO();
    try {
        const sessionPath = path.join(__dirname, '..', 'sessions', instanceId);
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

        const logger = pino({ level: "debug" });

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger
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

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log(`[${instanceId}] Connection closed due to`, lastDisconnect.error, `, reconnecting `, shouldReconnect);

                await db.Device.update({ status: "disconnected" }, { where: { id: deviceId } });

                if (shouldReconnect) {
                    connectToWhatsApp(instanceId, deviceId);
                } else {
                    console.log(`[${instanceId}] Not reconnecting, device logged out.`);
                    deleteSession(instanceId, true);
                }
            } else if (connection === 'open') {
                console.log(`[${instanceId}] Connected`);
                await db.Device.update({ status: "connected" }, { where: { id: deviceId } });
                io.to(instanceId).emit('status_update', {
                    status: "CONNECTED",
                    message: "Device connected",
                    instanceId
                });
            }
        });

        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            await processMessage(sock, msg, instanceId, deviceId);
        });

        return sock;
    } catch (error) {
        console.error(`[${instanceId}] Fatal error during connection:`, error);
        io.to(instanceId).emit('status_update', {
            status: "ERROR",
            message: "Gagal memulai koneksi WhatsApp. Silakan periksa log server.",
            instanceId
        });
    }
}

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

    console.log(`[${instanceId}] Creating new session...`);
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
    sendMessage,
};