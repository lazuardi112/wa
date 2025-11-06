const db = require('../models');
const { getClient } = require('./whatsappService');

// Maps to track conversation state
const conversationState = new Map();

/**
 * Processes an incoming WhatsApp message for bot logic.
 * @param {object} msg The message object from Baileys.
 * @param {string} instanceId The instance ID of the device that received the message.
 * @param {string} deviceId The database ID of the device.
 */
const processMessage = async (msg, instanceId, deviceId) => {
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const messageText = (msg.message.conversation || msg.message.extendedTextMessage?.text)?.trim().toLowerCase();

    if (!messageText) return;

    const currentState = conversationState.get(sender);
    const sock = getClient(instanceId);
    if (!sock) return; // Cannot send reply if socket is not found

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

        // Check message limit BEFORE the reset logic
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

        const matchedFlow = flowsToSearch.find(flow => messageText.startsWith(flow.prefix.toLowerCase()));

        if (matchedFlow) {
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
            conversationState.delete(sender);
        }
    } catch (error) {
        console.error(`[BotService] Error processing bot logic for instance ${instanceId}:`, error);
    }
};

module.exports = {
    processMessage,
};
