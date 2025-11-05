const db = require('../models');

// @desc    Show Admin Login Page
// @route   GET /admin/login
// @access  Public
const showLoginPage = (req, res) => {
    // Pass an empty query object if it doesn't exist to avoid errors in EJS
    res.render('admin/login', { query: req.query || {} });
};

// @desc    Authenticate Admin
// @route   POST /api/v1/admin/login
// @access  Public
const loginAdmin = (req, res) => {
    const { username, password } = req.body;

    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        req.session.admin = {
            username: ADMIN_USERNAME,
            isLoggedIn: true
        };
        return res.redirect('/admin/dashboard');
    } else {
        return res.status(401).render('admin/login', { query: { error: 'Invalid credentials' } });
    }
};

// @desc    Show Admin Dashboard
// @route   GET /admin/dashboard
// @access  Private (Admin)
const showDashboard = async (req, res) => {
    try {
        const [totalUsers, totalRevenue, connectedDevices, successfulTransactions] = await Promise.all([
            db.User.count({ where: { role: 'user' } }),
            db.Transaction.sum('amount', { where: { status: 'success' } }),
            db.Device.count({ where: { status: 'connected' } }),
            db.Transaction.count({ where: { status: 'success' } })
        ]);

        const stats = {
            totalUsers: totalUsers || 0,
            totalRevenue: totalRevenue || 0,
            connectedDevices: connectedDevices || 0,
            successfulTransactions: successfulTransactions || 0,
        };

        res.render('admin/dashboard', { stats });
    } catch (error) {
        console.error("Admin Dashboard Error:", error);
        res.status(500).send('Error loading admin dashboard.');
    }
};

// @desc    Show Settings Page
// @route   GET /admin/settings
// @access  Private (Admin)
const showSettingsPage = async (req, res) => {
    try {
        const [serverKey, clientKey, notificationUrl, otpDeviceId, allDevices] = await Promise.all([
            db.Setting.findOne({ where: { key: 'midtransServerKey' } }),
            db.Setting.findOne({ where: { key: 'midtransClientKey' } }),
            db.Setting.findOne({ where: { key: 'midtransNotificationUrl' } }),
            db.Setting.findOne({ where: { key: 'otpDeviceId' } }),
            db.Device.findAll({
                where: { status: 'connected' },
                include: [{
                    model: db.User,
                    as: 'user', // Make sure the alias matches the association
                    attributes: ['id', 'email'] // Only fetch necessary attributes
                }]
            })
        ]);

        const settings = {
            midtransServerKey: serverKey?.value || '',
            midtransClientKey: clientKey?.value || '',
            midtransNotificationUrl: notificationUrl?.value || '',
            otpDeviceId: otpDeviceId?.value || '',
        };

        res.render('admin/settings', { settings, allDevices, message: req.query.message || '' });
    } catch (error) {
        console.error("Admin Settings Page Error:", error);
        res.status(500).send("Error fetching settings");
    }
};


// @desc    Save Midtrans Settings
// @route   POST /api/v1/admin/settings
// @access  Private (Admin)
const saveSettings = async (req, res) => {
    const { midtransServerKey, midtransClientKey, midtransNotificationUrl } = req.body;
    try {
        await db.Setting.upsert({ key: 'midtransServerKey', value: midtransServerKey });
        await db.Setting.upsert({ key: 'midtransClientKey', value: midtransClientKey });
        await db.Setting.upsert({ key: 'midtransNotificationUrl', value: midtransNotificationUrl });

        res.redirect('/admin/settings?message=Midtrans settings saved successfully!');
    } catch (error) {
        res.status(500).send("Error saving settings");
    }
};

// @desc    Save OTP Device Setting
// @route   POST /api/v1/admin/settings/otp-device
// @access  Private (Admin)
const saveOtpDevice = async (req, res) => {
    const { otpDeviceId } = req.body;
    try {
        await db.Setting.upsert({ key: 'otpDeviceId', value: otpDeviceId });
        res.redirect('/admin/settings?message=OTP device saved successfully!');
    } catch (error) {
        console.error("Save OTP Device Error:", error);
        res.status(500).send("Error saving OTP device setting");
    }
};

// @desc    Show User Management Page
// @route   GET /admin/users
// @access  Private (Admin)
const showUsersPage = async (req, res) => {
    try {
        const users = await db.User.findAll({ where: { role: 'user' } });
        res.render('admin/users', { users });
    } catch (error) {
        res.status(500).send("Error fetching users");
    }
};

// @desc    Toggle User Block Status
// @route   POST /api/v1/admin/users/:id/toggle-block
// @access  Private (Admin)
const toggleUserBlock = async (req, res) => {
    try {
        const user = await db.User.findByPk(req.params.id);
        if (user) {
            // Add isBlocked field if it doesn't exist
            if (typeof user.isBlocked === 'undefined') {
                user.isBlocked = true;
            } else {
                user.isBlocked = !user.isBlocked;
            }
            await user.save();
        }
        res.redirect('/admin/users');
    } catch (error) {
        res.status(500).send("Error updating user status");
    }
};

// @desc    Show Transactions Management Page
// @route   GET /admin/transactions
// @access  Private (Admin)
const showTransactionsPage = async (req, res) => {
    try {
        const transactions = await db.Transaction.findAll({
            include: ['user', 'package'],
            order: [['createdAt', 'DESC']]
        });
        res.render('admin/transactions', { transactions });
    } catch (error) {
        console.error("Admin Transactions Error:", error);
        res.status(500).send("Error fetching transactions");
    }
};

module.exports = {
    showLoginPage,
    loginAdmin,
    showDashboard,
    showSettingsPage,
    saveSettings,
    saveOtpDevice,
    showUsersPage,
    toggleUserBlock,
    showTransactionsPage,
};
