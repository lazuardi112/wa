const db = require('../models');
const fs = require('fs');
const path = require('path');

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
        const [settingsData, allDevices, allUsers] = await Promise.all([
            db.Setting.findAll(),
            db.Device.findAll({ where: { status: 'connected' } }),
            db.User.findAll({ attributes: ['id', 'email'] })
        ]);

        // Create a map for easy user lookup
        const userMap = allUsers.reduce((map, user) => {
            map[user.id] = user.email;
            return map;
        }, {});

        // Format settings into a simple object
        const settings = settingsData.reduce((acc, setting) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {});

        // Set default if not in DB
        if (!settings.midtransEnv) {
            settings.midtransEnv = 'sandbox';
        }

        res.render('admin/settings', {
            settings,
            allDevices,
            userMap, // Pass the user map to the view
            message: req.query.message || ''
        });
    } catch (error) {
        console.error("Admin Settings Page Error:", error);
        res.status(500).send("Error fetching settings");
    }
};


// @desc    Save Midtrans Settings
// @route   POST /api/v1/admin/settings
// @access  Private (Admin)
const saveSettings = async (req, res) => {
    const { midtransServerKey, midtransClientKey, midtransNotificationUrl, midtransEnv } = req.body;
    try {
        // Save DB settings
        await db.Setting.upsert({ key: 'midtransServerKey', value: midtransServerKey });
        await db.Setting.upsert({ key: 'midtransClientKey', value: midtransClientKey });
        await db.Setting.upsert({ key: 'midtransNotificationUrl', value: midtransNotificationUrl });
        await db.Setting.upsert({ key: 'midtransEnv', value: midtransEnv }); // Save to DB

        res.redirect('/admin/settings?message=Midtrans settings saved successfully!');
    } catch (error) {
        console.error("Save Settings Error:", error);
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

// @desc    Render Session Management Page
// @route   GET /admin/sessions
// @access  Private (Admin)
const renderSessionsPage = (req, res) => {
    const sessionsDir = path.join(__dirname, '..', 'sessions');
    try {
        const sessionFiles = fs.readdirSync(sessionsDir);
        res.render('admin/sessions', { sessions: sessionFiles, query: req.query || {} });
    } catch (error) {
        console.error("Error reading sessions directory:", error);
        res.render('admin/sessions', { sessions: [], query: { error: 'Gagal membaca direktori sesi.' } });
    }
};

// @desc    Delete a session file/folder
// @route   POST /api/v1/admin/sessions/delete
// @access  Private (Admin)
const deleteSession = (req, res) => {
    const { sessionFile } = req.body;
    if (!sessionFile || !/^[a-zA-Z0-9-_]+$/.test(sessionFile)) {
        return res.redirect('/admin/sessions?error=Nama file sesi tidak valid.');
    }

    const sessionPath = path.join(__dirname, '..', 'sessions', sessionFile);

    try {
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            return res.redirect('/admin/sessions?success=Sesi berhasil dihapus.');
        } else {
            return res.redirect('/admin/sessions?error=File sesi tidak ditemukan.');
        }
    } catch (error) {
        console.error(`Error deleting session ${sessionFile}:`, error);
        return res.redirect(`/admin/sessions?error=Gagal menghapus sesi ${sessionFile}.`);
    }
};


// @desc    Render Edit User Page
// @route   GET /admin/users/edit/:id
// @access  Private (Admin)
const renderEditUserPage = async (req, res) => {
    try {
        const [userToEdit, packages] = await Promise.all([
            db.User.findByPk(req.params.id),
            db.Package.findAll()
        ]);

        if (!userToEdit) {
            return res.status(404).send('User not found.');
        }

        res.render('admin/edit-user', { userToEdit, packages, query: req.query || {} });
    } catch (error) {
        console.error("Render Edit User Page Error:", error);
        res.status(500).send('Error loading edit user page.');
    }
};

// @desc    Handle Edit User Form Submission
// @route   POST /api/v1/admin/users/edit/:id
// @access  Private (Admin)
const updateUser = async (req, res) => {
    try {
        const user = await db.User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).send('User not found.');
        }

        const { email, name, phone, messageLimit, packageId, isBlocked } = req.body;

        await user.update({
            email,
            name,
            phone,
            messageLimit: parseInt(messageLimit, 10),
            packageId: parseInt(packageId, 10),
            isBlocked: isBlocked === 'on' // Checkbox sends 'on'
        });

        res.redirect('/admin/users');
    } catch (error) {
        console.error("Handle Edit User Error:", error);
        res.redirect(`/admin/users/edit/${req.params.id}?error=Failed to update user.`);
    }
};

// @desc    Handle Delete User
// @route   POST /api/v1/admin/users/delete/:id
// @access  Private (Admin)
const deleteUser = async (req, res) => {
    try {
        const user = await db.User.findByPk(req.params.id);
        if (user) {
            await user.destroy();
        }
        res.redirect('/admin/users');
    } catch (error) {
        console.error("Handle Delete User Error:", error);
        res.status(500).send('Error deleting user.');
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
    renderSessionsPage,
    deleteSession,
    renderEditUserPage,
    updateUser,
    deleteUser,
};
