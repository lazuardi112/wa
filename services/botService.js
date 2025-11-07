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
 */
const processMessage = async (sock, msg, instanceId, deviceId) => {
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const messageText = (msg.message.conversation || msg.message.extendedTextMessage?.text)
        ?.trim()
        .toLowerCase();

    if (!messageText) return;

    const currentState = conversationState.get(sender);

    try {
        const device = await db.Device.findOne({ where: { id: deviceId } });
        if (!device) return;

        const user = await db.User.findByPk(device.userId);
        if (!user || user.isBlocked) {
            console.log(`[BotService] User not found or is blocked. Aborting.`);
            return;
        }

        // --- Simplified Message Limit Check ---
        // The user object from `findByPk` has the correct `messageLimit` and `messageCount`
        // updated by the webhook and middleware. We trust this data directly.
        const today = new Date().setHours(0, 0, 0, 0);
        const lastReset = user.lastResetDate ? new Date(user.lastResetDate).setHours(0, 0, 0, 0) : null;

        // Ensure defaults if fields are missing (safeguard for db sync issues)
        const messageCount = user.messageCount || 0;
        const messageLimit = user.messageLimit || 50;

        if (lastReset === today && messageCount >= messageLimit) {
            console.log(`[BotService] User ${user.email} has reached their daily limit of ${messageLimit}. Bot response not sent.`);
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

        // Strict prefix matching
        const matchedFlow = flowsToSearch.find(flow => messageText === flow.prefix.toLowerCase());

        // ✅ FIX: wrap response logic in correct try structure
        if (matchedFlow) {

            // Keep conversation alive
            if (currentState) currentState.lastInteraction = Date.now();

            // Reset daily message limit
            if (lastReset !== today) {
                await db.User.update(
                    { messageCount: 0, lastResetDate: new Date() },
                    { where: { id: user.id } }
                );
            }

            // ✅ Get bot responses properly
            const responses = JSON.parse(matchedFlow.responsesJson || "[]");

            let textMessage = "";
            let imageUrl = null;

            for (const res of responses) {
                if (res.type === "image" && res.content) {
                    imageUrl = res.content;
                } else if (res.type === "text" && res.content) {
                    textMessage += res.content + "\n";
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
                await db.User.increment("messageCount", {
                    by: 1,
                    where: { id: user.id }
                });
                await sock.sendMessage(sender, messagePayload);
            }

            // Continue or end conversation
            const children = await db.BotFlow.findAll({
                where: { parentId: matchedFlow.id, isEnabled: true }
            });

            if (children.length > 0) {
                conversationState.set(sender, {
                    currentFlowId: matchedFlow.id,
                    lastInteraction: Date.now()
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
