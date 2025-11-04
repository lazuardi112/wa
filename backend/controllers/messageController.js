const { getInstance, isInstanceConnected } = require('../services/whatsappService');
const { jidNormalizedUser } = require('@whiskeysockets/baileys');

const formatNumber = (number) => {
    // Basic formatting: remove non-digits, ensure it doesn't start with 0
    let formatted = number.replace(/\D/g, '');
    if (formatted.startsWith('0')) {
        formatted = '62' + formatted.slice(1);
    }
    return jidNormalizedUser(`${formatted}@s.whatsapp.net`);
}

// @desc    Send a single message via API
// @route   POST /api/v1/message/send
// @access  Private (API Key)
const sendMessage = async (req, res) => {
    // API Key and user data are validated by apiKeyAuth middleware
    const { instanceId, to, type, message } = req.body;

    if (!instanceId || !to || !type || !message) {
        return res.status(400).json({ success: false, message: 'Missing required parameters: instanceId, to, type, message' });
    }

    // Check if the instance belongs to the authenticated user
    const device = await require('../models/deviceModel').findOne({ instanceId, user: req.user._id });
    if(!device){
        return res.status(403).json({ success: false, message: 'You do not own this instance or it does not exist.' });
    }

    if (!isInstanceConnected(instanceId)) {
        return res.status(404).json({ success: false, message: 'Device is not connected or session not found.' });
    }

    const sock = getInstance(instanceId);

    try {
        const jid = formatNumber(to);
        let response;

        switch (type) {
            case 'text':
                if (!message.text) return res.status(400).json({ message: 'message.text is required for type "text"' });
                response = await sock.sendMessage(jid, { text: message.text });
                break;

            case 'image':
                if (!message.url) return res.status(400).json({ message: 'message.url is required for type "image"' });
                response = await sock.sendMessage(jid, {
                    image: { url: message.url },
                    caption: message.caption || ''
                });
                break;

            case 'button':
                if (!message.text || !message.buttons || !Array.isArray(message.buttons) || message.buttons.length === 0) {
                    return res.status(400).json({ message: 'message.text and an array of message.buttons are required for type "button"' });
                }
                const buttons = message.buttons.map(btn => ({
                    buttonId: btn.id || `btn_${Math.random()}`,
                    buttonText: { displayText: btn.text },
                    type: 1
                }));
                const buttonMessage = {
                    text: message.text,
                    footer: message.footer || '',
                    buttons: buttons,
                    headerType: 1
                };
                response = await sock.sendMessage(jid, buttonMessage);
                break;

            case 'document':
                 if (!message.url || !message.filename || !message.mimetype) {
                    return res.status(400).json({ message: 'message.url, message.filename, and message.mimetype are required for type "document"' });
                }
                response = await sock.sendMessage(jid, {
                    document: { url: message.url },
                    mimetype: message.mimetype,
                    fileName: message.filename
                });
                break;

            default:
                return res.status(400).json({ success: false, message: 'Invalid message type specified. Supported types: text, image, button, document.' });
        }

        res.status(200).json({ success: true, message: 'Message sent successfully', data: response });

    } catch (error) {
        console.error(`[${instanceId}] Failed to send message to ${to}:`, error);
        res.status(500).json({ success: false, message: 'Failed to send message.', error: error.message });
    }
};


// @desc    Send a message to multiple numbers via API
// @route   POST /api/v1/message/broadcast
// @access  Private (API Key)
const sendBroadcast = async (req, res) => {
    // This is a basic implementation. For large broadcasts, a queue system (like RabbitMQ or Bull) is highly recommended.
    const { instanceId, to, type, message } = req.body;
     if (!instanceId || !to || !Array.isArray(to) || to.length === 0 || !type || !message) {
        return res.status(400).json({ success: false, message: 'Missing or invalid parameters. "to" must be an array of numbers.' });
    }

    const results = [];
    // We will process this asynchronously but respond immediately
    res.status(202).json({ success: true, message: `Broadcast accepted. Processing ${to.length} messages in the background.` });

    // Use a separate async function to avoid holding up the response
    (async () => {
        for (const number of to) {
            try {
                // Fake a request object to reuse the sendMessage logic
                const fakeReq = { user: req.user, body: { instanceId, to: number, type, message } };
                const fakeRes = { // Mock response object
                    status: (code) => ({
                        json: (data) => results.push({ number, status: code, response: data })
                    })
                };
                await sendMessage(fakeReq, fakeRes);
                // Add a small delay between messages to avoid being flagged as spam
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (e) {
                results.push({ number, status: 500, response: { message: e.message } });
            }
        }
        console.log(`[${instanceId}] Broadcast completed. Results:`, results);
        // Here you could emit a socket event to the user with the final results or save them to a log.
    })();
};


module.exports = {
    sendMessage,
    sendBroadcast,
};
