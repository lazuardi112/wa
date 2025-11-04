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
    printQRInTerminal: false,
    browser: ['WhatsApp SaaS', 'Chrome', '1.0.0'],
  });

  instances[instanceId] = sock;

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    const isOtpDevice = (await db.AdminSetting.findOne({ where: { key: 'otp_instance_id' } }))?.value === instanceId;

    if (qr) {
      console.log(`[${instanceId}] QR code generated`);
      const eventName = isOtpDevice ? 'otp_device_qr' : 'qr';
      io.to(instanceId).emit(eventName, qr);
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect.error instanceof Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`[${instanceId}] Connection closed. Reason: ${DisconnectReason[statusCode] || 'Unknown'}. Reconnecting: ${shouldReconnect}`);

      const device = await db.Device.findOne({ where: { instanceId } });
      if (device) {
        device.status = 'disconnected';
        await device.save();
        io.to(instanceId).emit('status', 'disconnected');
      }
      if(isOtpDevice) io.emit('otp_device_status', 'disconnected');

      delete instances[instanceId];

      if (shouldReconnect) {
        setTimeout(() => connectToWhatsApp(instanceId), 5000);
      } else {
        const sessionPath = path.join(sessionsDir, instanceId);
        if(fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true });
      }
    } else if (connection === 'open') {
      console.log(`[${instanceId}] Connection opened.`);
      const device = await db.Device.findOne({ where: { instanceId } });
      if (device) {
        device.status = 'connected';
        await device.save();
        io.to(instanceId).emit('status', 'connected');
      }
      if(isOtpDevice) io.emit('otp_device_status', 'connected');
    }
  });

  sock.ev.on('creds.update', saveCreds);
  return sock;
};

const getInstance = (instanceId) => instances[instanceId];

const isInstanceConnected = (instanceId) => !!(instances[instanceId] && instances[instanceId].user);

const sendOtp = async (to, otp) => {
    const otpInstanceIdSetting = await db.AdminSetting.findOne({ where: { key: 'otp_instance_id' } });
    if (!otpInstanceIdSetting) throw new Error('OTP sending device is not configured.');

    const instanceId = otpInstanceIdSetting.value;
    if (!isInstanceConnected(instanceId)) throw new Error('OTP sending device is not connected.');

    const sock = getInstance(instanceId);
    const formattedNumber = `${to.replace(/\D/g, '')}@s.whatsapp.net`;

    await sock.sendMessage(formattedNumber, {
        text: `Your verification code is: *${otp}*\nThis code will expire in 10 minutes.`
    });
    console.log(`OTP ${otp} sent to ${to}`);
};

const logoutInstance = async (instanceId) => {
    const sock = getInstance(instanceId);
    if(sock){
        await sock.logout();
    }
    delete instances[instanceId];
    const sessionPath = path.join(sessionsDir, instanceId);
    if(fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true });
}

// Function to reconnect existing devices on server restart
const reconnectExistingSessions = async () => {
    try {
        const devices = await db.Device.findAll();
        console.log(`Reconnecting ${devices.length} user device(s)...`);
        for (const device of devices) {
            connectToWhatsApp(device.instanceId);
        }

        const otpInstance = await db.AdminSetting.findOne({ where: { key: 'otp_instance_id' } });
        if(otpInstance){
            console.log('Reconnecting OTP device...');
            connectToWhatsApp(otpInstance.value);
        }
    } catch (error) {
        // This can happen if the database is not yet migrated.
        console.warn("Could not reconnect sessions, maybe database is not ready yet.", error.message);
    }
};

module.exports = {
  connectToWhatsApp,
  getInstance,
  isInstanceConnected,
  logoutInstance,
  sendOtp,
  reconnectExistingSessions,
};
