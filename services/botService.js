const db = require('../models');

// Maps to track conversation state
const conversationState = new Map();
const CONVERSATION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Cleanup interval for stale conversations
setInterval(() => {
    const now = Date.now();
    for (const [sender, state] of conversationState.entries()) {
        if (now - state.lastInteraction > CONVERSATION_TIMEOUT) {
            conversationState.delete(sender);
            console.log(`[BotService] Conversation timed out for ${sender}. State cleared.`);
        }
    }
}, 60 * 1000); // Check every minute


/**
 * Processes an incoming WhatsApp message for bot logic.
 * @param {object} sock The Baileys socket instance.
 * @param {object} msg The message object from Baileys.
 * @param {string} instanceId The instance ID of the device that received the message.
 * @param {string} deviceId The database ID of the device.
 */
const processMessage = async (sock, msg, instanceId, deviceId) => {
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const messageText = (msg.message.conversation || msg.message.extendedTextMessage?.text)?.trim().toLowerCase();

    if (!messageText) return;

    const currentState = conversationState.get(sender);

    try {
        const device = await db.Device.findOne({ where: { id: deviceId } });
        if (!device) return;

        const user = await db.User.findByPk(device.userId);
        if (!user) return;

        let subscription = await db.Transaction.findOne({
            where: { userId: user.id, status: 'success' },
            order: [['expiresAt', 'DESC']],
            include: ['package']
        });

        if (!subscription || new Date() > new Date(subscription.expiresAt)) {
            const freePackage = await db.Package.findOne({ where: { name: 'Free' } });
            subscription = { package: freePackage };
        }
        const userPackage = subscription.package;

        const today = new Date().setHours(0, 0, 0, 0);
        const lastReset = user.lastResetDate ? new Date(user.lastResetDate).setHours(0, 0, 0, 0) : null;

        if (lastReset === today && user.messageCount >= userPackage.messageLimit) {
            console.log(`[BotService] User ${user.email} has reached their message limit. Bot response not sent.`);
            return;
        }

        let flowsToSearch;
        if (currentState) {
            flowsToSearch = await db.BotFlow.findAll({
                where: { deviceId: deviceId, isEnabled: true, parentId: currentState.currentFlowId },
            });
        } else {
            flowsToSearch = await db.BotFlow.findAll({
                where: { deviceId: deviceId, isEnabled: true, parentId: null },
            });
        }

        // Use exact match for top-level commands, prefix match for replies
        const isTopLevel = !currentState;
        const matchedFlow = flowsToSearch.find(flow =>
            isTopLevel
                ? messageText === flow.prefix.toLowerCase()
                : messageText.startsWith(flow.prefix.toLowerCase())
        );

        if (matchedFlow) {
            // Update last interaction time to keep the session alive
            if (currentState) {
                currentState.lastInteraction = Date.now();
            }

            if (lastReset !== today) {
                await db.User.update(
                    { messageCount: 0, lastResetDate: new Date() },
                    { where: { id: user.id } }
                );
                console.log(`[BotService] Reset daily message count for user ${user.email}.`);
            }

            let textMessage = '';
            let imageUrl = null;

            for (const res of matchedFlow.response) {
                if (res.type === 'image' && res.content) {
                    imageUrl = res.content;
                } else if (res.type === 'text' && res.content) {
                    textMessage += res.content + '\n';
                }
            }
            textMessage = textMessage.trim();

            const messagePayload = {};
            if (imageUrl) {
                messagePayload.image = { url: imageUrl };
                if (textMessage) messagePayload.caption = textMessage;
            } else if (textMessage) {
                messagePayload.text = textMessage;
            }

            if (Object.keys(messagePayload).length > 0) {
                await db.User.increment('messageCount', { by: 1, where: { id: user.id } });
                console.log(`[BotService] Incremented messageCount by 1 for user ${user.email}.`);

                await sock.sendMessage(sender, messagePayload);
            } else {
                console.warn(`[BotService] No valid content to send for prefix "${matchedFlow.prefix}".`);
            }

            const children = await db.BotFlow.findAll({ where: { parentId: matchedFlow.id, isEnabled: true } });
            if (children.length > 0) {
                conversationState.set(sender, {
                    currentFlowId: matchedFlow.id,
                    lastInteraction: Date.now(),
                });
            } else {
                conversationState.delete(sender);
            }
        } else if (currentState) {
            // Invalid option in a conversation, so we clear the state
            conversationState.delete(sender);
            await sock.sendMessage(sender, { text: "Pilihan tidak valid. Silakan coba lagi dari menu utama." });
        } else {
            // No top-level command matched, send a default response
            const defaultResponse = "Maaf, perintah tidak dikenali. Silakan ketik perintah yang valid.";
            await sock.sendMessage(sender, { text: defaultResponse });
        }
    } catch (error) {
        console.error(`[BotService] Error processing bot logic for instance ${instanceId}:`, error);
    }
};

module.exports = {
    processMessage,
};
