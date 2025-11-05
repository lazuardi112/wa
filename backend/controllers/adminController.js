const db = require('../models');

// @desc    Show Admin Login Page
// @route   GET /admin/login
// @access  Public
const showLoginPage = (req, res) => {
    res.render('admin/login', { error: '' });
};

// @desc    Authenticate Admin
// @route   POST /api/v1/admin/login
// @access  Public
const loginAdmin = async (req, res) => {
    const { email, password } = req.body;
    try {
        const admin = await db.User.findOne({ where: { email, role: 'admin' } });
        if (!admin || !(await admin.matchPassword(password))) {
            return res.status(401).render('admin/login', { error: 'Invalid credentials' });
        }
        req.session.admin = { id: admin.id, name: admin.name };
        res.redirect('/admin/dashboard');
    } catch (error) {
        res.status(500).render('admin/login', { error: 'Server error' });
    }
};

// @desc    Show Admin Dashboard
// @route   GET /admin/dashboard
// @access  Private (Admin)
const showDashboard = (req, res) => {
    res.render('admin/dashboard');
};

// @desc    Show Settings Page
// @route   GET /admin/settings
// @access  Private (Admin)
const showSettingsPage = async (req, res) => {
    try {
        const serverKey = await db.Setting.findOne({ where: { key: 'midtransServerKey' } });
        const clientKey = await db.Setting.findOne({ where: { key: 'midtransClientKey' } });
        const notificationUrl = await db.Setting.findOne({ where: { key: 'midtransNotificationUrl' } });
        const settings = {
            midtransServerKey: serverKey ? serverKey.value : '',
            midtransClientKey: clientKey ? clientKey.value : '',
            midtransNotificationUrl: notificationUrl ? notificationUrl.value : '',
        };
        res.render('admin/settings', { settings, message: '' });
    } catch (error) {
        res.status(500).send("Error fetching settings");
    }
};

// @desc    Save Settings
// @route   POST /api/v1/admin/settings
// @access  Private (Admin)
const saveSettings = async (req, res) => {
    const { midtransServerKey, midtransClientKey, midtransNotificationUrl } = req.body;
    try {
        await db.Setting.upsert({ key: 'midtransServerKey', value: midtransServerKey });
        await db.Setting.upsert({ key: 'midtransClientKey', value: midtransClientKey });
        await db.Setting.upsert({ key: 'midtransNotificationUrl', value: midtransNotificationUrl });

        // Re-fetch all settings to show the updated values
        const serverKey = await db.Setting.findOne({ where: { key: 'midtransServerKey' } });
        const clientKey = await db.Setting.findOne({ where: { key: 'midtransClientKey' } });
        const notificationUrl = await db.Setting.findOne({ where: { key: 'midtransNotificationUrl' } });
        const settings = {
            midtransServerKey: serverKey ? serverKey.value : '',
            midtransClientKey: clientKey ? clientKey.value : '',
            midtransNotificationUrl: notificationUrl ? notificationUrl.value : '',
        };
        res.render('admin/settings', { settings, message: 'Settings saved successfully!' });
    } catch (error) {
        res.status(500).send("Error saving settings");
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
            user.isBlocked = !user.isBlocked;
            await user.save();
        }
        res.redirect('/admin/users');
    } catch (error) {
        res.status(500).send("Error updating user status");
    }
};

module.exports = {
    showLoginPage,
    loginAdmin,
    showDashboard,
    showSettingsPage,
    saveSettings,
    showUsersPage,
    toggleUserBlock,
};
