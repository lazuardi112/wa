const db = require('../models');

// @desc    Render the dashboard page
// @route   GET /dashboard
// @access  Private
const renderDashboard = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const [user, deviceCount] = await Promise.all([
            db.User.findByPk(userId),
            db.Device.count({ where: { userId } }),
            // db.Subscription.findOne({ where: { userId }, order: [['expiresAt', 'DESC']] }) // Removed temporarily
        ]);

        const dashboardData = {
            deviceCount: deviceCount || 0,
            messageCount: user?.messageCount || 0,
            messageLimit: user?.messageLimit || 50, // Assuming a default or user-specific limit
            subscriptionExpires: 'N/A', // Hardcoded temporarily
        };

        res.render('dashboard', { user: req.session.user, data: dashboardData });
    } catch (error) {
        console.error('Dashboard Page Error:', error);
        res.status(500).send('Error loading dashboard.');
    }
};

// @desc    Render the devices page
// @route   GET /devices
// @access  Private
const renderDevicesPage = async (req, res) => {
    try {
        const devices = await db.Device.findAll({ where: { userId: req.session.user.id } });
        res.render('devices', { user: req.session.user, devices });
    } catch (error) {
        console.error('Devices Page Error:', error);
        res.status(500).send('Error loading devices page.');
    }
};

// @desc    Render the messaging page
// @route   GET /messaging
// @access  Private
const renderMessagingPage = async (req, res) => {
    try {
        const devices = await db.Device.findAll({ where: { userId: req.session.user.id } });
        res.render('messaging', { devices, query: req.query });
    } catch (error) {
        console.error('Messaging Page Error:', error);
        res.status(500).send('Error loading messaging page.');
    }
};

// @desc    Render the bot management page
// @route   GET /bot
// @access  Private
const renderBotPage = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const [devices, botFlows] = await Promise.all([
            db.Device.findAll({ where: { userId } }),
            db.BotFlow.findAll({ where: { userId }, include: ['device'] })
        ]);
        res.render('bot', { user: req.session.user, devices, botFlows, query: req.query });
    } catch (error) {
        console.error('Bot Page Error:', error);
        res.status(500).send('Error loading bot page.');
    }
};


// @desc    Render the API docs page
// @route   GET /api-docs
// @access  Private
const renderApiDocsPage = async (req, res) => {
    try {
        const newApiKey = req.session.newlyGeneratedApiKey;
        if (newApiKey) delete req.session.newlyGeneratedApiKey;
        // const apiKeyExists = await db.ApiKey.findOne({ where: { userId: req.session.user.id } }); // Removed temporarily
        res.render('api-docs', { apiKey: newApiKey || null, apiKeyExists: false }); // Hardcoded temporarily
    } catch (error) {
        console.error('API Docs Page Error:', error);
        res.status(500).send('Error loading API docs.');
    }
};

// @desc    Render the subscription page
// @route   GET /subscribe
// @access  Private
const renderSubscribePage = async (req, res) => {
    try {
        // const clientKeySetting = await db.Setting.findOne({ where: { key: 'midtransClientKey' } }); // Removed temporarily
        // if (!clientKeySetting?.value) {
        //     return res.status(500).send('Midtrans Client Key is not configured by the admin.');
        // }
        res.render('subscribe', { midtransClientKey: 'DUMMY_CLIENT_KEY' }); // Hardcoded temporarily
    } catch (error) {
        console.error('Subscribe Page Error:', error);
        res.status(500).send('Error loading subscription page.');
    }
};


const renderEditBotPage = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.user.id;
        const [flow, devices, otherFlows] = await Promise.all([
            db.BotFlow.findOne({ where: { id, userId } }),
            db.Device.findAll({ where: { userId } }),
            db.BotFlow.findAll({ where: { userId } })
        ]);

        if (!flow) {
            return res.status(404).redirect('/bot?status=error&msg=Bot%20flow%20not%20found.');
        }

        res.render('edit-bot', { user: req.session.user, flow, devices, otherFlows, query: req.query });
    } catch (error) {
        console.error('Edit Bot Page Error:', error);
        res.status(500).send('Error loading edit bot page.');
    }
};
// @desc    Render the transaction history page
// @route   GET /history
// @access  Private
const renderHistoryPage = async (req, res) => {
    try {
        const transactions = await db.Transaction.findAll({
            where: { userId: req.session.user.id },
            include: ['package'],
            order: [['createdAt', 'DESC']],
        });
        res.render('history', { transactions });
    } catch (error) {
        console.error('History Page Error:', error);
        res.status(500).send('Error loading transaction history.');
    }
};
module.exports = {
    renderDashboard,
    renderDevicesPage,
    renderMessagingPage,
    renderBotPage,
    renderApiDocsPage,
    renderSubscribePage,
    renderEditBotPage,
    renderHistoryPage,
};
