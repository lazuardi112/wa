const db = require('../models');

// @desc    Render the dashboard page
// @route   GET /dashboard
// @access  Private
const renderDashboard = async (req, res) => {
    try {
        const userId = req.session.user.id;

        // Fetch user and devices
        const user = await db.User.findByPk(userId);
        const deviceCount = await db.Device.count({ where: { userId } });

        // Determine user's current package
        const activeSubscription = await db.Transaction.findOne({
            where: { userId, status: 'success' },
            order: [['expiresAt', 'DESC']]
        });

        let currentPackage;
        if (activeSubscription && new Date() < new Date(activeSubscription.expiresAt)) {
            currentPackage = await db.Package.findByPk(activeSubscription.packageId);
        } else {
            currentPackage = await db.Package.findOne({ where: { name: 'Free' } });
        }

        if (!currentPackage) {
             return res.status(500).send('Error: Default package not found.');
        }

        const dashboardData = {
            deviceCount: deviceCount || 0,
            messageCount: user?.messageCount || 0, // Get the latest count
            subscriptionExpires: activeSubscription?.expiresAt ? new Date(activeSubscription.expiresAt).toLocaleDateString() : 'N/A',
        };

        res.render('dashboard', {
            user: req.session.user,
            data: dashboardData,
            currentPackage // Pass the full package object
        });
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
        const userId = req.session.user.id;
        const devices = await db.Device.findAll({ where: { userId } });

        const activeSubscription = await db.Transaction.findOne({
            where: { userId, status: 'success' },
            order: [['expiresAt', 'DESC']]
        });

        let currentPackage;
        if (activeSubscription && new Date() < new Date(activeSubscription.expiresAt)) {
            currentPackage = await db.Package.findByPk(activeSubscription.packageId);
        } else {
            currentPackage = await db.Package.findOne({ where: { name: 'Free' } });
        }

        if (!currentPackage) {
            return res.status(500).send('Error: Default package not found.');
        }

        const canAddDevice = devices.length < currentPackage.maxDevices;

        res.render('devices', {
            user: req.session.user,
            devices,
            canAddDevice,
            limit: currentPackage.maxDevices
        });
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
        const apiKeyExists = await db.ApiKey.findOne({ where: { userId: req.session.user.id } });

        res.render('api-docs', {
            apiKey: newApiKey || null,
            apiKeyExists: !!apiKeyExists
        });

        // Delete the key from session AFTER rendering the page
        if (newApiKey) {
            delete req.session.newlyGeneratedApiKey;
        }
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
        const clientKeySetting = await db.Setting.findOne({ where: { key: 'midtransClientKey' } });
        if (!clientKeySetting?.value) {
            // Provide a more user-friendly error page or message
            return res.status(500).send('Error: Midtrans Client Key is not configured by the admin. Please contact support.');
        }

        const packages = await db.Package.findAll();
        const user = await db.User.findByPk(req.session.user.id);

        // Find the current active subscription first
        const activeSubscription = await db.Transaction.findOne({
            where: { userId: user.id, status: 'success' },
            order: [['expiresAt', 'DESC']]
        });

        let currentPackage;
        if (activeSubscription && new Date() < new Date(activeSubscription.expiresAt)) {
            currentPackage = await db.Package.findByPk(activeSubscription.packageId);
        } else {
            // If no active subscription, default to the 'Free' package
            currentPackage = await db.Package.findOne({ where: { name: 'Free' } });
        }

        // Handle case where Free package might not exist
        if (!currentPackage) {
             return res.status(500).send('Error: Default package not found. Please run seeders.');
        }

        res.render('subscribe', {
            midtransClientKey: clientKeySetting.value,
            packages,
            currentPackage
        });
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
