
const { Client, LocalAuth } = require('whatsapp-web.js');
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
    if (instances[instanceId]) {
        // If an instance exists but is disconnected, try to re-initialize
        try {
            await instances[instanceId].getState();
        } catch {
            delete instances[instanceId];
        }
    }
    if (instances[instanceId]) return instances[instanceId];

    const io = getIO();

    const client = new Client({
        authStrategy: new LocalAuth({ clientId: instanceId, dataPath: sessionsDir }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process', // <- this one doesn't works in Windows
                '--disable-gpu'
            ],
        },
    });

    instances[instanceId] = client;

    client.on('qr', (qr) => {
        console.log(`[${instanceId}] QR code generated`);
        io.to(instanceId).emit('qr', { instanceId, code: qr });
    });

    client.on('ready', async () => {
        console.log(`[${instanceId}] Connection opened.`);
        try {
            const device = await db.Device.findOne({ where: { instanceId } });
            if (device && device.status !== 'connected') {
                device.status = 'connected';
                await device.save();
                io.to(instanceId).emit('status', { instanceId, status: 'connected' });
            }
        } catch (error) {
            console.error(`[${instanceId}] Error updating device status to connected:`, error);
        }
    });

    client.on('disconnected', async (reason) => {
        console.log(`[${instanceId}] Client was logged out`, reason);
        try {
            const device = await db.Device.findOne({ where: { instanceId } });
            if (device && device.status !== 'disconnected') {
                device.status = 'disconnected';
                await device.save();
                io.to(instanceId).emit('status', { instanceId, status: 'disconnected' });
            }
        } catch (error) {
            console.error(`[${instanceId}] Error updating device status to disconnected:`, error);
        }
        delete instances[instanceId];
        // Sessions are automatically managed by LocalAuth, no need to manually delete files
    });

    client.initialize().catch(err => {
        console.error(`[${instanceId}] Failed to initialize client:`, err);
        delete instances[instanceId];
    });

    return client;
};

const logoutInstance = async (instanceId) => {
    const client = instances[instanceId];
    if (client) {
        await client.logout();
        delete instances[instanceId];
    }
    const sessionPath = path.join(sessionsDir, `session-${instanceId}`);
    if(fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true });
}

const reconnectExistingSessions = async () => {
    try {
        const devices = await db.Device.findAll({ where: { status: 'connected' } });
        console.log(`Reconnecting ${devices.length} user device(s)...`);
        for (const device of devices) {
            connectToWhatsApp(device.instanceId);
        }
    } catch (error) {
        console.warn("Could not reconnect sessions, maybe database is not ready yet.", error.message);
    }
};

// Functions like sendOtp and getInstance would need to be adapted for whatsapp-web.js
// For now, focusing on the QR code generation.
const sendOtp = async (to, otp) => {
    // This function needs to be rewritten using whatsapp-web.js logic
    console.warn("sendOtp function is not implemented for whatsapp-web.js yet.");
};

module.exports = {
    connectToWhatsApp,
    logoutInstance,
    reconnectExistingSessions,
    sendOtp, // Placeholder
};
