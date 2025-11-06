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
        const device = await db.Device.findOne({ where: { id: deviceId, userId: user.id } });
        if (!device) {
            return res.status(403).json({ message: 'You do not own this device.' });
        }
        if (device.status !== 'connected') {
             return res.redirect('/messaging?status=error&msg=Device%20is%20not%20connected.');
        }

        // --- Start of Message Limit Logic ---
        const userWithPackage = await db.User.findByPk(user.id, {
            include: { model: db.Package, as: 'package' }
        });

        const userPackage = userWithPackage.package;

        const today = new Date().setHours(0, 0, 0, 0);
        const lastReset = userWithPackage.lastResetDate ? new Date(userWithPackage.lastResetDate).setHours(0, 0, 0, 0) : null;

        let currentMessageCount = userWithPackage.messageCount;

        // Reset count if it's a new day
        if (lastReset !== today) {
            await userWithPackage.update({ messageCount: 0, lastResetDate: new Date() });
            currentMessageCount = 0;
            console.log(`[MessageController] Reset daily message count for user ${user.email}.`);
        }

        const recipientList = numbers.split(',').map(n => n.trim()).filter(n => n);
        const messagesToSendCount = recipientList.length;
        const messagesLeft = userPackage.messageLimit - currentMessageCount;

        if (messagesLeft <= 0) {
            return res.redirect('/messaging?status=error&msg=You%20have%20reached%20your%20daily%20message%20limit.');
        }

        const allowedRecipients = recipientList.slice(0, messagesLeft);
        // --- End of Message Limit Logic ---

        const sock = getClient(device.instanceId);
        let successfulSends = 0;

        for (const number of allowedRecipients) {
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
                console.warn(`Failed to send message to ${number}:`, e.message);
            }
        }

        // Atomically increment the user's message count
        if (successfulSends > 0) {
            await userWithPackage.increment('messageCount', { by: successfulSends });
            console.log(`[MessageController] Incremented messageCount by ${successfulSends} for user ${user.email}.`);
        }

        // Redirect back to the messaging page with a status message
        const status = successfulSends > 0 ? 'success' : 'error';
        const msg = successfulSends > 0 ? `Successfully sent ${successfulSends} of ${recipientList.length} messages.` : 'Failed to send messages.';
        // We will use query params for feedback on redirect. A flash message system would be better.
        const finalRedirectMsg = messagesToSendCount > allowedRecipients.length
            ? `${msg} Some messages were not sent due to daily limit.`
            : msg;

        res.redirect(`/messaging?status=${status}&msg=${encodeURIComponent(finalRedirectMsg)}`);

    } catch (error) {
        console.error(`Failed to send message:`, error);
        res.status(500).redirect('/messaging?status=error&msg=An%20internal%20server%20error%20occurred.');
    }
};

module.exports = {
    sendMessage,
};
