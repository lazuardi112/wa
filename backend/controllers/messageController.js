const db = require('../models');
const { getInstance, isInstanceConnected } = require('../services/whatsappService');
const { jidNormalizedUser } = require('@whiskeysockets/baileys');

const formatNumber = (number) => {
    let formatted = number.replace(/\D/g, '');
    if (formatted.startsWith('0')) {
        formatted = '62' + formatted.slice(1);
    }
    return jidNormalizedUser(`${formatted}@s.whatsapp.net`);
}

const sendMessage = async (req, res) => {
    const { instanceId, to, type, message } = req.body;
    const userId = req.user.id; // From 'protect' middleware

    if (!instanceId || !to || !type || !message) {
        return res.status(400).json({ message: 'Missing required parameters.' });
    }

    try {
        const device = await db.Device.findOne({ where: { instanceId, userId } });
        if(!device){
            return res.status(403).json({ message: 'You do not own this instance.' });
        }
        if (device.status !== 'connected') {
            return res.status(400).json({ message: 'Device is not connected.' });
        }

        const sock = getInstance(instanceId);
        const jid = formatNumber(to);

        // Simple text message for now
        if (type === 'text') {
            await sock.sendMessage(jid, { text: message.text });
        } else {
            return res.status(400).json({ message: 'Only "text" message type is supported for now.' });
        }

        res.status(200).json({ success: true, message: 'Message sent successfully.' });
    } catch (error) {
        console.error(`Failed to send message:`, error);
        res.status(500).json({ success: false, message: 'Failed to send message.' });
    }
};

const sendBroadcast = async (req, res) => {
    const { instanceId, to, type, message } = req.body;
    const userId = req.user.id;

    if (!instanceId || !Array.isArray(to) || to.length === 0 || !type || !message) {
        return res.status(400).json({ message: 'Missing or invalid parameters.' });
    }

    // Respond immediately to the user
    res.status(202).json({ success: true, message: `Broadcast to ${to.length} recipients has been queued.` });

    // Process in the background
    (async () => {
        try {
            const device = await db.Device.findOne({ where: { instanceId, userId } });
            if(!device || device.status !== 'connected'){
                console.error(`[Broadcast] Device ${instanceId} not found or not connected.`);
                return;
            }

            const sock = getInstance(instanceId);
            for (const number of to) {
                try {
                    const jid = formatNumber(number);
                    if (type === 'text') {
                        await sock.sendMessage(jid, { text: message.text });
                    }
                    // Add a small delay between messages
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (e) {
                    console.warn(`[Broadcast] Failed to send to ${number}:`, e.message);
                }
            }
            console.log(`[Broadcast] Completed for instance ${instanceId}.`);
        } catch (error) {
            console.error(`[Broadcast] A critical error occurred:`, error);
        }
    })();
};


module.exports = {
    sendMessage,
    sendBroadcast,
};
