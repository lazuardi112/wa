const db = require('../models');

/**
 * All rendering controllers now expect `req.user` and `req.package`
 * to be provided by the `userAuth` middleware.
 */

// @desc    Render the dashboard page
const renderDashboard = async (req, res) => {
    try {
        const deviceCount = await db.Device.count({ where: { userId: req.user.id } });
        const activeSubscription = await db.Transaction.findOne({
            where: { userId: req.user.id, status: 'success' },
            order: [['expiresAt', 'DESC']]
        });

        const dashboardData = {
            deviceCount,
            messageCount: req.user.messageCount, // Use fresh count from middleware
            subscriptionExpires: activeSubscription?.expiresAt ? new Date(activeSubscription.expiresAt).toLocaleDateString() : 'N/A',
        };

        res.render('dashboard', {
            user: req.user, // Use the full, fresh user object
            data: dashboardData,
            currentPackage: req.package // Use package from middleware
        });
    } catch (error) {
        console.error('Dashboard Page Error:', error);
        res.status(500).send('Error loading dashboard.');
    }
};

// @desc    Render the devices page
const renderDevicesPage = async (req, res) => {
    try {
        const devices = await db.Device.findAll({ where: { userId: req.user.id } });
        const canAddDevice = devices.length < req.package.maxDevices;

        res.render('devices', {
            user: req.user,
            devices,
            canAddDevice,
            limit: req.package.maxDevices
        });
    } catch (error) {
        console.error('Devices Page Error:', error);
        res.status(500).send('Error loading devices page.');
    }
};

// @desc    Render the messaging page
const renderMessagingPage = async (req, res) => {
    try {
        const devices = await db.Device.findAll({ where: { userId: req.user.id } });
        res.render('messaging', { devices, query: req.query });
    } catch (error) {
        console.error('Messaging Page Error:', error);
        res.status(500).send('Error loading messaging page.');
    }
};

// @desc    Render the main bot management page
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

// @desc    Render the API docs page
const renderApiDocsPage = async (req, res) => {
    try {
        const newApiKey = req.session.newlyGeneratedApiKey;
        const apiKeyExists = await db.ApiKey.findOne({ where: { userId: req.user.id } });

        res.render('api-docs', {
            apiKey: newApiKey || null,
            apiKeyExists: !!apiKeyExists
        });

        if (newApiKey) {
            delete req.session.newlyGeneratedApiKey;
        }
    } catch (error) {
        console.error('API Docs Page Error:', error);
        res.status(500).send('Error loading API docs.');
    }
};

// @desc    Render the subscription page
const renderSubscribePage = async (req, res) => {
    try {
        const clientKeySetting = await db.Setting.findOne({ where: { key: 'midtransClientKey' } });
        if (!clientKeySetting?.value) {
            return res.status(500).send('Error: Midtrans Client Key is not configured.');
        }

        const packages = await db.Package.findAll();

        res.render('subscribe', {
            midtransClientKey: clientKeySetting.value,
            packages,
            currentPackage: req.package // Use package from middleware
        });
    } catch (error) {
        console.error('Subscribe Page Error:', error);
        res.status(500).send('Error loading subscription page.');
    }
};

// @desc    Render the bot flow edit page
const renderEditBotPage = async (req, res) => {
    try {
        const { id } = req.params;
        const [flow, devices, otherFlows] = await Promise.all([
            db.BotFlow.findOne({ where: { id, userId: req.user.id } }),
            db.Device.findAll({ where: { userId: req.user.id } }),
            db.BotFlow.findAll({ where: { userId: req.user.id } })
        ]);

        if (!flow) {
            return res.status(404).redirect('/bot?status=error&msg=Bot flow not found.');
        }

        res.render('edit-bot', { user: req.user, flow, devices, otherFlows, query: req.query });
    } catch (error) {
        console.error('Edit Bot Page Error:', error);
        res.status(500).send('Error loading edit bot page.');
    }
};

// @desc    Render the transaction history page
const renderHistoryPage = async (req, res) => {
    try {
        const transactions = await db.Transaction.findAll({
            where: { userId: req.user.id },
            include: ['package'],
            order: [['createdAt', 'DESC']],
        });
        res.render('history', { user: req.user, transactions });
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
