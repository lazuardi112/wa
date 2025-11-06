const db = require('../models');
const { getClient } = require('../services/whatsappService');
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

// @desc    Send a single or multiple messages, text or media
// @route   POST /api/v1/message/send
// @access  Private
const sendMessage = async (req, res) => {
    const { user } = req;
    const { deviceId, numbers, message, messageType } = req.body;
    const mediaFile = req.file;

    if (!deviceId || !numbers) {
        return res.status(400).json({ message: 'Device ID and recipient numbers are required.' });
    }

    if (messageType === 'text' && !message) {
        return res.status(400).json({ message: 'Message text is required for text messages.' });
    }

    if (messageType === 'media' && !mediaFile) {
        return res.status(400).json({ message: 'A media file is required for media messages.' });
    }

    try {
        // --- Message Limit Check ---
        const today = new Date().setHours(0, 0, 0, 0);
        const lastReset = user.lastResetDate ? new Date(user.lastResetDate).setHours(0, 0, 0, 0) : null;

        if (lastReset !== today) {
            // Reset count if it's a new day
            user.messageCount = 0;
            user.lastResetDate = new Date();
            await user.save();
            console.log(`[MessageController] Reset daily message count for user ${user.email}.`);
        }

        // Parse recipient list ONCE (fix duplicate declaration)
        const recipientList = numbers.split(',').map(n => n.trim()).filter(n => n);
        if (user.messageCount + recipientList.length > (user.messageLimit || 0)) {
            const msg = `Sending ${recipientList.length} messages would exceed your daily limit of ${user.messageLimit || 0}.`;
            return res.redirect(`/messaging?status=error&msg=${encodeURIComponent(msg)}`);
        }
        // --- End of Check ---

        const device = await db.Device.findOne({ where: { id: deviceId, userId: user.id } });
        if (!device) {
            return res.status(403).json({ message: 'You do not own this device.' });
        }
        if (device.status !== 'connected') {
            return res.status(400).json({ message: 'Device is not connected.' });
        }

        const sock = getClient(device.instanceId);
        if (!sock) {
            return res.status(500).json({ message: 'WhatsApp client not available for this device.' });
        }

        let successfulSends = 0;
        for (const number of recipientList) {
            try {
                const jid = formatNumber(number);
                let sentMessage;

                if (messageType === 'media' && mediaFile) {
                    const mediaOptions = {
                        caption: message || '', // Use message as caption, or empty string if not provided
                        mimetype: mediaFile.mimetype,
                    };

                    if (mediaFile.mimetype.startsWith('image/')) {
                        sentMessage = await sock.sendMessage(jid, {
                            image: mediaFile.buffer,
                            ...mediaOptions
                        });
                    } else if (mediaFile.mimetype === 'application/pdf') {
                        sentMessage = await sock.sendMessage(jid, {
                            document: mediaFile.buffer,
                            fileName: mediaFile.originalname,
                            ...mediaOptions
                        });
                    } else {
                        console.warn(`Unsupported media type for ${number}: ${mediaFile.mimetype}`);
                        continue; // Skip to the next number
                    }
                } else {
                    // Send a simple text message
                    sentMessage = await sock.sendMessage(jid, { text: message });
                }

                if (sentMessage) {
                    successfulSends++;
                }

                // Add a small delay between messages to avoid being flagged
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (e) {
                console.warn(`Failed to send message to ${number}:`, e?.message || e);
            }
        }

        // Atomically increment the user's message count
        if (successfulSends > 0) {
            await db.User.increment('messageCount', {
                by: successfulSends,
                where: { id: user.id }
            });
            console.log(`[MessageController] Incremented messageCount by ${successfulSends} for user ${user.email}.`);
        }

        // Redirect back to the messaging page with a status message
        const status = successfulSends > 0 ? 'success' : 'error';
        const msg = successfulSends > 0 ? `Successfully sent ${successfulSends} of ${recipientList.length} messages.` : 'Failed to send messages.';
        // We will use query params for feedback on redirect. A flash message system would be better.
        res.redirect(`/messaging?status=${status}&msg=${encodeURIComponent(msg)}`);

    } catch (error) {
        console.error(`Failed to send message:`, error);
        res.status(500).redirect('/messaging?status=error&msg=An%20internal%20server%20error%20occurred.');
    }
};

// @desc    Send a message via API
// @route   POST /api/v1/message/send-text, send-image, send-document
// @access  Private (API Key)
const sendApiMessage = async (req, res) => {
    const { user } = req;
    // 'numbers' is renamed to 'to' for API clarity. 'message' is the text/caption.
    const { deviceId, to, message, messageType } = req.body;
    const mediaFile = req.file;

    // --- API-specific Validation ---
    if (!deviceId || !to) {
        return res.status(400).json({ success: false, message: 'Device ID and recipient number(s) are required.' });
    }
     if (messageType === 'text' && !message) {
        return res.status(400).json({ success: false, message: 'Message text is required.' });
    }
    if ((messageType === 'image' || messageType === 'document') && !mediaFile) {
        return res.status(400).json({ success: false, message: 'A media file is required.' });
    }
    // --- End Validation ---

    try {
        const today = new Date().setHours(0, 0, 0, 0);
        const lastReset = user.lastResetDate ? new Date(user.lastResetDate).setHours(0, 0, 0, 0) : null;

        if (lastReset !== today) {
            user.messageCount = 0;
            user.lastResetDate = new Date();
            await user.save();
        }

        const recipientList = to.split(',').map(n => n.trim()).filter(n => n);
        if (user.messageCount + recipientList.length > (user.messageLimit || 0)) {
            return res.status(429).json({
                success: false,
                message: `Sending ${recipientList.length} messages would exceed your daily limit of ${user.messageLimit || 0}.`,
            });
        }

        const device = await db.Device.findOne({ where: { id: deviceId, userId: user.id } });
        if (!device) {
            return res.status(403).json({ success: false, message: 'Forbidden: You do not own this device.' });
        }
        if (device.status !== 'connected') {
            return res.status(400).json({ success: false, message: 'Device is not connected.' });
        }

        const sock = getClient(device.instanceId);
        if (!sock) {
            return res.status(500).json({ success: false, message: 'WhatsApp client not available for this device.' });
        }

        let successfulSends = 0;
        let failedSends = 0;
        const results = [];

        for (const number of recipientList) {
            try {
                const jid = formatNumber(number);
                let sentMessage;

                const mediaOptions = {
                    caption: message || '',
                    mimetype: mediaFile?.mimetype,
                };

                if (messageType === 'image' && mediaFile) {
                     sentMessage = await sock.sendMessage(jid, { image: mediaFile.buffer, ...mediaOptions });
                } else if (messageType === 'document' && mediaFile) {
                    sentMessage = await sock.sendMessage(jid, { document: mediaFile.buffer, fileName: mediaFile.originalname, ...mediaOptions });
                } else if (messageType === 'text') {
                    sentMessage = await sock.sendMessage(jid, { text: message });
                } else {
                    results.push({ number, success: false, error: 'Unsupported message type or missing file.' });
                    failedSends++;
                    continue;
                }

                if (sentMessage) {
                    results.push({ number, success: true, messageId: sentMessage.key.id });
                    successfulSends++;
                }
                 await new Promise(resolve => setTimeout(resolve, 500));
            } catch (e) {
                results.push({ number, success: false, error: e?.message || 'Unknown error' });
                failedSends++;
            }
        }

        if (successfulSends > 0) {
            await db.User.increment('messageCount', { by: successfulSends, where: { id: user.id } });
        }

        return res.status(200).json({
            success: true,
            message: `Request processed. Sent: ${successfulSends}, Failed: ${failedSends}.`,
            details: results,
        });

    } catch (error) {
        console.error(`[API Send Error]:`, error);
        return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
    }
};


module.exports = {
    sendMessage,
    sendApiMessage,
};
