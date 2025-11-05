const db = require('../models');
const { connectToWhatsApp, logoutInstance } = require('../services/whatsappService');
const crypto = require('crypto');

// @desc    Add a new device
// @route   POST /api/v1/devices/add
// @access  Private
const addDevice = async (req, res) => {
    const { remark } = req.body;
    const user = await db.User.findByPk(req.user.id, { include: 'package' });

    if (!user.package) {
        return res.status(403).json({ message: "You do not have an active package." });
    }

    try {
        const userDevicesCount = await db.Device.count({ where: { userId: user.id } });
        if (userDevicesCount >= user.package.maxDevices) {
            return res.status(403).json({ message: `Maximum device limit (${user.package.maxDevices}) reached for your package.` });
        }

        const instanceId = `instance_${user.id}_${crypto.randomBytes(4).toString('hex')}`;

        const newDevice = await db.Device.create({
            userId: user.id,
            instanceId,
            remark: remark || `Device ${userDevicesCount + 1}`,
        });

        connectToWhatsApp(instanceId).catch(err => {
            console.error(`[${instanceId}] Failed to initiate connection:`, err);
        });

        res.status(201).json({
            message: 'Device added successfully. Generating QR code...',
            device: {
                id: newDevice.id,
                instanceId: newDevice.instanceId,
                remark: newDevice.remark,
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all devices for a user
// @route   GET /api/v1/devices
// @access  Private
const getUserDevices = async (req, res) => {
    try {
        const devices = await db.Device.findAll({ where: { userId: req.user.id } });
        res.status(200).json(devices);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete a device
// @route   DELETE /api/v1/devices/:instanceId
// @access  Private
const deleteDevice = async (req, res) => {
    try {
        const { instanceId } = req.params;
        const device = await db.Device.findOne({ where: { instanceId } });

        if (!device || device.userId !== req.user.id) {
            return res.status(404).json({ message: 'Device not found or not authorized.' });
        }

        await logoutInstance(instanceId);
        await device.destroy();

        res.status(200).json({ message: 'Device deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Reconnect a device
// @route   POST /api/v1/devices/:instanceId/reconnect
// @access  Private
const reconnectDevice = async (req, res) => {
    try {
        const { instanceId } = req.params;
        const device = await db.Device.findOne({ where: { instanceId } });

        if (!device || device.userId !== req.user.id) {
            return res.status(404).json({ message: 'Device not found or not authorized.' });
        }

        // The service will handle the logic of creating a new session and emitting the QR code
        connectToWhatsApp(instanceId).catch(err => {
            console.error(`[${instanceId}] Failed to initiate reconnection:`, err);
        });

        res.status(200).json({ message: 'Reconnection process initiated. Please wait for the QR code.' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = {
    addDevice,
    getUserDevices,
    deleteDevice,
    reconnectDevice,
};
