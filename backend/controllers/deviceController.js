const Device = require('../models/deviceModel');
const User = require('../models/userModel');
const { connectToWhatsApp, logoutInstance } = require('../services/whatsappService');
const crypto = require('crypto');

// @desc    Add a new device and initiate connection
// @route   POST /api/v1/devices/add
// @access  Private
const addDevice = async (req, res) => {
    const { remark } = req.body;
    const user = await User.findById(req.user.id).populate('package');

    if (!user) {
        return res.status(404).json({ message: "User not found." });
    }
    if (!user.package) {
        return res.status(403).json({ message: "You do not have an active package." });
    }

    try {
        const userDevicesCount = await Device.countDocuments({ user: user._id });
        if (userDevicesCount >= user.package.maxDevices) {
            return res.status(403).json({ message: `You have reached the maximum number of devices (${user.package.maxDevices}) for your current package.` });
        }

        const instanceId = `instance_${user._id}_${crypto.randomBytes(4).toString('hex')}`;

        const newDevice = await Device.create({
            user: user._id,
            instanceId,
            remark: remark || `Device ${userDevicesCount + 1}`,
            status: 'uninitialized'
        });

        // Don't wait for the connection to be established to respond to the user
        connectToWhatsApp(instanceId).catch(err => {
            console.error(`[${instanceId}] Failed to connect to WhatsApp:`, err);
            // Optionally update device status to reflect connection failure
        });

        res.status(201).json({
            message: 'Device added successfully. Please scan the QR code.',
            device: newDevice
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all devices for the logged-in user
// @route   GET /api/v1/devices
// @access  Private
const getUserDevices = async (req, res) => {
    try {
        const devices = await Device.find({ user: req.user.id });
        res.status(200).json(devices);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete a device instance and logout
// @route   DELETE /api/v1/devices/:instanceId
// @access  Private
const deleteDevice = async (req, res) => {
    try {
        const { instanceId } = req.params;
        const device = await Device.findOne({ instanceId });

        // Ensure the device belongs to the logged-in user
        if (!device || device.user.toString() !== req.user.id) {
            return res.status(404).json({ message: 'Device not found or you are not authorized to delete it.' });
        }

        // Logout from WhatsApp and delete session files
        await logoutInstance(instanceId);

        // Delete from database
        await Device.deleteOne({ _id: device._id });

        res.status(200).json({ message: 'Device deleted successfully.' });

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = {
    addDevice,
    getUserDevices,
    deleteDevice,
};
