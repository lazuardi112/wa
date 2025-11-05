
const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const path = require('path');
const fs = require('fs');
const { getIO } = require('../socket');
const db = require('../models');

const instances = {};
const sessionsDir = path.join(__dirname, '..', 'sessions');

if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
}

const connectToWhatsApp = async (instanceId) => {
    if (instances[instanceId]) return instances[instanceId];

    const { state, saveCreds } = await useMultiFileAuthState(path.join(sessionsDir, instanceId));
    const io = getIO();

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // We'll handle QR emission via Socket.IO
        browser: ['WhatsApp SaaS', 'Chrome', '1.0.0'],
    });

    instances[instanceId] = sock;

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log(`[${instanceId}] QR code generated`);
            io.to(instanceId).emit('qr', { instanceId, code: qr });
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect.error instanceof Boom)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log(`[${instanceId}] Connection closed. Reason: ${statusCode}. Reconnecting: ${shouldReconnect}`);

            try {
                const device = await db.Device.findOne({ where: { instanceId } });
                if (device && device.status !== 'disconnected') {
                    device.status = 'disconnected';
                    await device.save();
                    io.to(instanceId).emit('status', { instanceId, status: 'disconnected' });
                }
            } catch (dbError) {
                console.error(`[${instanceId}] DB Error on disconnect:`, dbError);
            }

            delete instances[instanceId];

            if (shouldReconnect) {
                setTimeout(() => connectToWhatsApp(instanceId), 5000);
            } else {
                const sessionPath = path.join(sessionsDir, instanceId);
                if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true });
            }
        } else if (connection === 'open') {
            console.log(`[${instanceId}] Connection opened.`);
            try {
                const device = await db.Device.findOne({ where: { instanceId } });
                if (device && device.status !== 'connected') {
                    device.status = 'connected';
                    await device.save();
                    io.to(instanceId).emit('status', { instanceId, status: 'connected' });
                }
            } catch (dbError) {
                console.error(`[${instanceId}] DB Error on connect:`, dbError);
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);
    return sock;
};

const logoutInstance = async (instanceId) => {
    const sock = instances[instanceId];
    if (sock) {
        await sock.logout();
    }
    delete instances[instanceId];
    const sessionPath = path.join(sessionsDir, instanceId);
    if(fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true });
};

const reconnectExistingSessions = async () => {
    try {
        const devices = await db.Device.findAll({ where: { status: 'connected' } });
        console.log(`Reconnecting ${devices.length} connected device(s)...`);
        for (const device of devices) {
            connectToWhatsApp(device.instanceId);
        }
    } catch (error) {
        console.warn("Could not reconnect sessions, maybe database is not ready yet.", error.message);
    }
};

const sendOtp = async (to, otp) => {
    try {
        const otpInstanceIdSetting = await db.AdminSetting.findOne({ where: { key: 'otp_instance_id' } });
        if (!otpInstanceIdSetting?.value) {
            throw new Error('OTP sending device is not configured.');
        }

        const instanceId = otpInstanceIdSetting.value;
        const sock = instances[instanceId];

        if (!sock || !sock.user) {
            throw new Error('OTP sending device is not connected.');
        }

        const formattedNumber = `${to.replace(/\D/g, '')}@s.whatsapp.net`;
        await sock.sendMessage(formattedNumber, {
            text: `Your verification code is: *${otp}*\nThis code will expire in 10 minutes.`
        });
        console.log(`OTP ${otp} sent to ${to}`);
    } catch (error) {
        console.error(`Failed to send OTP:`, error);
        throw new Error('Failed to send OTP.');
    }
};

module.exports = {
    connectToWhatsApp,
    logoutInstance,
    reconnectExistingSessions,
    sendOtp,
};
