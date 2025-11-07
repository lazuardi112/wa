const db = require('../models');

// @desc    Render the main bot management page
// @route   GET /bot
// @access  Private
const renderBotPage = async (req, res) => {
    try {
        const userId = req.user.id;
        const devices = await db.Device.findAll({ where: { userId } });
        const bots = await db.Bot.findAll({
            where: {},
            include: [
                {
                    model: db.Device,
                    as: 'device',
                    where: { userId }
                },
                {
                    model: db.BotTrigger,
                    as: 'triggers',
                    include: [{
                        model: db.BotAction,
                        as: 'actions'
                    }]
                }
            ],
            order: [
                ['createdAt', 'ASC'],
                [{ model: db.BotTrigger, as: 'triggers' }, 'createdAt', 'ASC'],
                [{ model: db.BotTrigger, as: 'triggers' }, { model: db.BotAction, as: 'actions' }, 'executionOrder', 'ASC']
            ]
        });

        res.render('bot', {
            title: 'Bot Management',
            user: req.user,
            bots,
            devices,
            active: 'bot',
            error: req.query.error,
            success: req.query.success
        });
    } catch (error) {
        console.error('Error rendering bot page:', error);
        res.status(500).send('Internal Server Error');
    }
};

// --- Bot Management ---

// @desc    Create a new bot
// @route   POST /bot/create
// @access  Private
const createBot = async (req, res) => {
    const { deviceId, name } = req.body;
    const userId = req.user.id;

    try {
        const device = await db.Device.findOne({ where: { id: deviceId, userId } });
        if (!device) {
            return res.redirect('/bot?error=Device not found.');
        }

        // Check if a bot already exists for this device to prevent duplicates
        const existingBot = await db.Bot.findOne({ where: { deviceId } });
        if (existingBot) {
            return res.redirect('/bot?error=A bot already exists for this device.');
        }

        await db.Bot.create({ deviceId, name, isEnabled: true });
        res.redirect('/bot?success=Bot created successfully.');
    } catch (error) {
        console.error('Error creating bot:', error);
        res.redirect('/bot?error=Failed to create bot.');
    }
};

// @desc    Delete a bot
// @route   POST /bot/delete/:id
// @access  Private
const deleteBot = async (req, res) => {
    const botId = req.params.id;
    const userId = req.user.id;
    try {
        const bot = await db.Bot.findOne({
            where: { id: botId },
            include: [{ model: db.Device, as: 'device', where: { userId } }]
        });
        if (!bot) {
            return res.redirect('/bot?error=Bot not found.');
        }
        await bot.destroy();
        res.redirect('/bot?success=Bot deleted successfully.');
    } catch (error) {
        console.error('Error deleting bot:', error);
        res.redirect('/bot?error=Failed to delete bot.');
    }
};

// --- Trigger Management ---

// @desc    Create a new trigger for a bot
// @route   POST /bot/trigger/create
// @access  Private
const createTrigger = async (req, res) => {
    const { botId, keyword, matchType } = req.body;
    const userId = req.user.id;
    try {
        const bot = await db.Bot.findOne({
            where: { id: botId },
            include: [{ model: db.Device, as: 'device', where: { userId } }]
        });
        if (!bot) {
            return res.redirect('/bot?error=Bot not found.');
        }
        await db.BotTrigger.create({ botId, keyword, matchType });
        res.redirect('/bot?success=Trigger created successfully.');
    } catch (error) {
        console.error('Error creating trigger:', error);
        res.redirect('/bot?error=Failed to create trigger.');
    }
};

// @desc    Delete a trigger
// @route   POST /bot/trigger/delete/:id
// @access  Private
const deleteTrigger = async (req, res) => {
    const triggerId = req.params.id;
    const userId = req.user.id;
    try {
        const trigger = await db.BotTrigger.findOne({
            where: { id: triggerId },
            include: [{
                model: db.Bot,
                as: 'bot',
                required: true,
                include: [{ model: db.Device, as: 'device', where: { userId } }]
            }]
        });
        if (!trigger) {
            return res.redirect('/bot?error=Trigger not found.');
        }
        await trigger.destroy();
        res.redirect('/bot?success=Trigger deleted successfully.');
    } catch (error) {
        console.error('Error deleting trigger:', error);
        res.redirect('/bot?error=Failed to delete trigger.');
    }
};

// --- Action Management ---

// @desc    Create a new action for a trigger
// @route   POST /bot/action/create
// @access  Private
const createAction = async (req, res) => {
    const { triggerId, actionType, payload } = req.body;
    const userId = req.user.id;
    try {
        const trigger = await db.BotTrigger.findOne({
            where: { id: triggerId },
            include: [{
                model: db.Bot,
                as: 'bot',
                required: true,
                include: [{ model: db.Device, as: 'device', where: { userId } }]
            }]
        });

        if (!trigger) {
            return res.redirect('/bot?error=Trigger not found.');
        }

        let parsedPayload;
        try {
            parsedPayload = JSON.parse(payload);
        } catch (e) {
            return res.redirect('/bot?error=Invalid payload format.');
        }

        await db.BotAction.create({
            triggerId,
            actionType,
            payload: parsedPayload,
            executionOrder: 0 // Simple default, can be expanded later
        });

        res.redirect('/bot?success=Action created successfully.');
    } catch (error) {
        console.error('Error creating action:', error);
        res.redirect('/bot?error=Failed to create action.');
    }
};

// @desc    Delete an action
// @route   POST /bot/action/delete/:id
// @access  Private
const deleteAction = async (req, res) => {
    const actionId = req.params.id;
    const userId = req.user.id;
    try {
        const action = await db.BotAction.findOne({
            where: { id: actionId },
            include: [{
                model: db.BotTrigger,
                as: 'trigger',
                required: true,
                include: [{
                    model: db.Bot,
                    as: 'bot',
                    required: true,
                    include: [{ model: db.Device, as: 'device', where: { userId } }]
                }]
            }]
        });
        if (!action) {
            return res.redirect('/bot?error=Action not found.');
        }
        await action.destroy();
        res.redirect('/bot?success=Action deleted successfully.');
    } catch (error) {
        console.error('Error deleting action:', error);
        res.redirect('/bot?error=Failed to delete action.');
    }
};

module.exports = {
    renderBotPage,
    createBot,
    deleteBot,
    createTrigger,
    deleteTrigger,
    createAction,
    deleteAction
};