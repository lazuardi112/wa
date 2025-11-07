const db = require('../models');
const axios = require('axios');

/**
 * Checks if the incoming message text matches a trigger's keyword.
 * @param {string} messageText - The text from the incoming message.
 * @param {object} trigger - The BotTrigger object from the database.
 * @returns {boolean} - True if the message matches the trigger, false otherwise.
 */
const isMatch = (messageText, trigger) => {
    const keyword = trigger.keyword.toLowerCase();
    switch (trigger.matchType) {
        case 'exact':
            return messageText === keyword;
        case 'contains':
            return messageText.includes(keyword);
        case 'startsWith':
            return messageText.startsWith(keyword);
        default:
            return false;
    }
};

/**
 * Executes a specific action based on its type.
 * @param {object} sock - The Baileys socket instance.
 * @param {string} sender - The JID of the message sender.
 * @param {object} action - The BotAction object from the database.
 */
const executeAction = async (sock, sender, action) => {
    try {
        if (action.actionType === 'reply' && action.payload) {
            // The payload should contain the message object for Baileys
            // e.g., { "text": "Hello world" } or { "image": { "url": "..." } }
            await sock.sendMessage(sender, action.payload);
        } else if (action.actionType === 'webhook' && action.payload && action.payload.url) {
            // The payload must contain a 'url' and optionally 'data'
            await axios.post(action.payload.url, action.payload.data || {});
        }
    } catch (error) {
        console.error(`[BotService] Error executing action ${action.id}:`, error);
    }
};


/**
 * Processes an incoming WhatsApp message using the new bot logic.
 */
const processMessage = async (sock, msg, instanceId, deviceId) => {
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const messageText = (msg.message.conversation || msg.message.extendedTextMessage?.text)
        ?.trim()
        .toLowerCase();

    if (!messageText) return;

    try {
        // 1. Find the active bot for the device
        const bot = await db.Bot.findOne({
            where: {
                deviceId: deviceId,
                isEnabled: true
            }
        });

        if (!bot) {
            return; // No active bot for this device
        }

        // 2. Find a matching trigger for the bot
        const triggers = await db.BotTrigger.findAll({
            where: {
                botId: bot.id,
                isEnabled: true
            }
        });

        let matchedTrigger = null;
        for (const trigger of triggers) {
            if (isMatch(messageText, trigger)) {
                matchedTrigger = trigger;
                break; // Use the first trigger that matches
            }
        }

        if (!matchedTrigger) {
            return; // No trigger matched the message
        }

        // --- User and Message Limit Check ---
        const device = await db.Device.findByPk(deviceId);
        const user = await db.User.findByPk(device.userId);

        if (!user || user.isBlocked) {
            console.log(`[BotService] User not found or is blocked for device ${deviceId}.`);
            return;
        }

        const today = new Date().setHours(0, 0, 0, 0);
        const lastReset = user.lastResetDate ? new Date(user.lastResetDate).setHours(0, 0, 0, 0) : null;

        if (lastReset === today && user.messageCount >= user.messageLimit) {
            console.log(`[BotService] User ${user.email} has reached their daily message limit.`);
            return;
        }

        // Reset limit if it's a new day
        if (lastReset !== today) {
            await user.update({ messageCount: 0, lastResetDate: new Date() });
        }

        // 3. Execute actions for the matched trigger
        const actions = await db.BotAction.findAll({
            where: {
                triggerId: matchedTrigger.id,
                isEnabled: true
            },
            order: [['executionOrder', 'ASC']]
        });

        if (actions.length === 0) {
            return; // No actions to execute
        }

        for (const action of actions) {
            await executeAction(sock, sender, action);
        }

        // 4. Increment message count after executing actions
        await user.increment("messageCount", { by: 1 });

    } catch (error) {
        console.error(`[BotService] Error processing new bot logic for instance ${instanceId}:`, error);
    }
};

module.exports = {
    processMessage,
};