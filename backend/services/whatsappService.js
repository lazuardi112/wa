
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
                '--single-process',
                '--disable-gpu',
                '--disable-extensions',
                '--disable-background-networking',
                '--enable-features=NetworkService,NetworkServiceInProcess',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-breakpad',
                '--disable-client-side-phishing-detection',
                '--disable-component-extensions-with-background-pages',
                '--disable-default-apps',
                '--disable-features=Translate',
                '--disable-hang-monitor',
                '--disable-ipc-flooding-protection',
                '--disable-popup-blocking',
                '--disable-prompt-on-repost',
                '--disable-renderer-backgrounding',
                '--disable-sync',
                '--force-color-profile=srgb',
                '--metrics-recording-only',
                '--no-pings',
                '--password-store=basic',
                '--use-mock-keychain'
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

const getInstance = (instanceId) => instances[instanceId];

const isInstanceConnected = (instanceId) => {
    const client = instances[instanceId];
    // This is a simplified check. `getState()` might throw, so a more robust check is needed.
    return client && (client.info ? true : false);
};

const sendOtp = async (to, otp) => {
    const otpInstanceIdSetting = await db.AdminSetting.findOne({ where: { key: 'otp_instance_id' } });
    if (!otpInstanceIdSetting?.value) {
        throw new Error('OTP sending device is not configured.');
    }

    const instanceId = otpInstanceIdSetting.value;
    const client = getInstance(instanceId);

    if (!client) {
        throw new Error('OTP sending device is not initialized.');
    }

    try {
        // whatsapp-web.js requires the number to be in the format countrycode+number@c.us
        const formattedNumber = `${to.replace(/\D/g, '')}@c.us`;
        await client.sendMessage(formattedNumber, `Your verification code is: *${otp}*\nThis code will expire in 10 minutes.`);
        console.log(`OTP ${otp} sent to ${to}`);
    } catch (error) {
        console.error(`[${instanceId}] Failed to send OTP:`, error);
        throw new Error('Failed to send OTP. The OTP device may not be ready.');
    }
};

module.exports = {
    connectToWhatsApp,
    logoutInstance,
    reconnectExistingSessions,
    sendOtp,
};
