const db = require('../models');
const { connectToWhatsApp, getInstance } = require('../services/whatsappService');

// @desc    Login for admin users
// @route   POST /api/v1/admin/login
// @access  Public
const adminLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await db.User.findOne({ where: { email, role: 'admin' } });
        if (!user) {
            return res.status(401).json({ message: 'Access denied or invalid credentials.' });
        }
        if (await user.matchPassword(password)) {
            // Create a session for the admin
            req.session.user = {
                id: user.id,
                name: user.name,
                role: user.role,
            };
            res.status(200).json({ message: "Admin logged in successfully", user: req.session.user });
        } else {
            res.status(401).json({ message: 'Access denied or invalid credentials.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Logout admin (clears session)
// @route   POST /api/v1/admin/logout
// @access  Private/Admin
const adminLogout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Could not log out.' });
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ message: 'Admin logged out successfully.' });
    });
};

// @desc    Get admin auth status
// @route   GET /api/v1/admin/status
// @access  Public
const getAdminStatus = (req, res) => {
    if (req.session.user && req.session.user.role === 'admin') {
        res.status(200).json({ isAuthenticated: true, user: req.session.user });
    } else {
        res.status(200).json({ isAuthenticated: false, user: null });
    }
};


// @desc    Setup or change the OTP sending device
// @route   POST /api/v1/admin/settings/otp-device
// @access  Private/Admin
const setupOtpDevice = async (req, res) => {
    const instanceId = `otp_device_${Date.now()}`;
    try {
        await db.AdminSetting.upsert({
            key: 'otp_instance_id',
            value: instanceId
        });
        connectToWhatsApp(instanceId);
        res.status(200).json({
            message: 'OTP device setup initiated. Scan the QR code.',
            instanceId
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get the status of the OTP sending device
// @route   GET /api/v1/admin/settings/otp-device-status
// @access  Private/Admin
const getOtpDeviceStatus = async (req, res) => {
    try {
        const setting = await db.AdminSetting.findOne({ where: { key: 'otp_instance_id' } });
        if (!setting) {
            return res.status(200).json({ status: 'unconfigured' });
        }
        const instance = getInstance(setting.value);
        const status = (instance && instance.user) ? 'connected' : 'disconnected';
        res.status(200).json({ status });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = {
    adminLogin,
    adminLogout,
    getAdminStatus,
    setupOtpDevice,
    getOtpDeviceStatus,
};
