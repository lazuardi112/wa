const db = require('../models');
const { getInstance } = require('../services/whatsappService');
const { jidNormalizedUser } = require('@whiskeysockets/baileys');

const formatNumber = (number) => {
    let formatted = number.trim().replace(/\D/g, '');
    if (formatted.startsWith('0')) {
        formatted = '62' + formatted.slice(1);
    }
    if (!formatted.endsWith('@s.whatsapp.net')) {
        formatted += '@s.whatsapp.net';
    }
    return jidNormalizedUser(formatted);
};

// @desc    Send a single or multiple messages
// @route   POST /api/v1/message/send
// @access  Private
const sendMessage = async (req, res) => {
    // User object and messageCost are attached by the messageLimitMiddleware
    const { user, messageCost } = req;
    const { deviceId, numbers, message } = req.body;

    if (!deviceId || !numbers || !message) {
        return res.status(400).json({ message: 'Device ID, numbers, and message are required.' });
    }

    try {
        const device = await db.Device.findOne({ where: { id: deviceId, userId: user.id } });
        if (!device) {
            return res.status(403).json({ message: 'You do not own this device.' });
        }
        if (device.status !== 'connected') {
            return res.status(400).json({ message: 'Device is not connected.' });
        }

        const sock = getInstance(device.instanceId);
        const recipientList = numbers.split(',');

        let successfulSends = 0;
        for (const number of recipientList) {
            try {
                const jid = formatNumber(number);
                // Simple logic to detect if message is a URL for an image/doc
                if (message.startsWith('http') && (message.includes('.jpg') || message.includes('.png'))) {
                    await sock.sendMessage(jid, { image: { url: message } });
                } else if (message.startsWith('http') && message.includes('.pdf')) {
                    await sock.sendMessage(jid, { document: { url: message }, fileName: 'document.pdf' });
                } else {
                    await sock.sendMessage(jid, { text: message });
                }
                successfulSends++;
                // Add a small delay between messages to avoid being flagged
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (e) {
                console.warn(`Failed to send message to ${number}:`, e.message);
            }
        }

        // Increment the user's message count by the number of successful sends
        user.messageCount += successfulSends;
        await user.save();

        // Redirect back to the messaging page with a success message
        // Using redirect for EJS form submission flow
        // For API usage, a JSON response would be better. We can differentiate later if needed.
        res.redirect('/messaging?status=success');

    } catch (error) {
        console.error(`Failed to send message:`, error);
        res.status(500).redirect('/messaging?status=error');
    }
};

module.exports = {
    sendMessage,
};
