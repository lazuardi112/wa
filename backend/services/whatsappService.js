const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const path = require('path');
const fs = require('fs');
const Device = require('../models/deviceModel');
const { getIO } = require('../socket');

// This object will store all active Baileys instances
const instances = {};
const sessionsDir = path.join(__dirname, '..', 'sessions');

// Ensure the sessions directory exists
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
}

const connectToWhatsApp = async (instanceId) => {
  // If an instance for this ID already exists and is connecting/connected, don't create a new one.
  if (instances[instanceId]) {
    console.log(`[${instanceId}] Instance already exists.`);
    return instances[instanceId];
  }

  const { state, saveCreds } = await useMultiFileAuthState(path.join(sessionsDir, instanceId));
  const io = getIO();

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // We will send the QR to the frontend
    browser: ['WhatsApp SaaS', 'Chrome', '1.0.0'], // Custom browser name
    version: [2, 2413, 1],
  });

  instances[instanceId] = sock;

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    const device = await Device.findOne({ instanceId });

    if (qr) {
      console.log(`[${instanceId}] QR code generated`);
      // Emit QR code to the specific client room
      io.to(instanceId).emit('qr', qr);
      if (device && device.status !== 'waiting_qr') {
        device.status = 'waiting_qr';
        await device.save();
        io.to(instanceId).emit('status', 'waiting_qr');
      }
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect.error instanceof Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`[${instanceId}] Connection closed. Reason: ${DisconnectReason[statusCode] || 'Unknown'}. Reconnecting: ${shouldReconnect}`);

      if (device && device.status !== 'disconnected') {
        device.status = 'disconnected';
        await device.save();
        io.to(instanceId).emit('status', 'disconnected');
      }

      delete instances[instanceId];

      if (shouldReconnect) {
        // Reconnect after a small delay
        setTimeout(() => connectToWhatsApp(instanceId), 5000);
      } else {
        // Logged out, remove session files
        const sessionPath = path.join(sessionsDir, instanceId);
        if(fs.existsSync(sessionPath)){
          fs.rmSync(sessionPath, { recursive: true, force: true });
        }
        console.log(`[${instanceId}] Session data removed due to logout.`);
      }
    } else if (connection === 'open') {
      console.log(`[${instanceId}] Connection opened successfully.`);
      if (device && device.status !== 'connected') {
        device.status = 'connected';
        await device.save();
        io.to(instanceId).emit('status', 'connected');
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  return sock;
};

const getInstance = (instanceId) => {
  return instances[instanceId];
};

const isInstanceConnected = (instanceId) => {
    return instanceId in instances && instances[instanceId].user;
}

const logoutInstance = async (instanceId) => {
    const sock = getInstance(instanceId);
    if(sock){
        await sock.logout();
        delete instances[instanceId];
    }
    const sessionPath = path.join(sessionsDir, instanceId);
    if(fs.existsSync(sessionPath)){
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
}

module.exports = {
  connectToWhatsApp,
  getInstance,
  isInstanceConnected,
  logoutInstance
};
