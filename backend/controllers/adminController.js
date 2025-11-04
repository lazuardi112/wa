const db = require('../models');
const { connectToWhatsApp, getInstance } = require('../services/whatsappService');

// @desc    Setup or change the OTP sending device
// @route   POST /api/v1/admin/settings/otp-device
// @access  Private/Admin
const setupOtpDevice = async (req, res) => {
    // This will generate a new instance ID for the OTP device
    const instanceId = `otp_device_${Date.now()}`;

    try {
        await db.AdminSetting.upsert({
            key: 'otp_instance_id',
            value: instanceId
        });

        // Initiate connection, QR will be sent via Socket.io
        connectToWhatsApp(instanceId);

        res.status(200).json({
            message: 'OTP device setup initiated. Scan the QR code in the admin panel.',
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
            return res.status(404).json({ status: 'unconfigured' });
        }

        const instance = getInstance(setting.value);
        const status = (instance && instance.user) ? 'connected' : 'disconnected';

        res.status(200).json({ status });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};


// Note: Other admin functionalities like user management would go here
// For brevity, I'm focusing on the OTP logic as requested.
module.exports = {
    setupOtpDevice,
    getOtpDeviceStatus,
};
