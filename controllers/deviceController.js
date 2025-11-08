const { generateQRCode, deleteSession } = require('../services/whatsappService');
const db = require('../models');

// @desc    Create a new device and generate QR code
// @route   POST /api/v1/devices
// @access  Private
const createDevice = async (req, res) => {
    const { deviceName: remark } = req.body; // Menggunakan deviceName dari frontend sebagai remark
    const userId = req.session.user.id;
    const instanceId = `user-${userId}_instance-${Date.now()}`;

    if (!remark) {
        return res.status(400).json({ success: false, message: 'Device name is required.' });
    }

    try {
        const device = await db.Device.create({
            remark: remark,
            instanceId: instanceId,
            userId: userId,
            status: 'uninitialized',
        });

        // Sekarang kita sebut generateQRCode dengan instanceId yang benar
        generateQRCode(instanceId, device.id);

        res.status(201).json({
            success: true,
            message: 'Device created. Please scan the QR code.',
            // Mengirimkan kembali instanceId dan deviceId agar frontend tahu sesi mana yang harus didengarkan
            instanceId: instanceId,
            deviceId: device.id
        });

    } catch (error) {
        console.error('Error creating device:', error);
        res.status(500).json({ success: false, message: 'Server error while creating device.' });
    }
};

// @desc    Delete a device
// @route   DELETE /api/v1/devices/:id
// @access  Private
const deleteDevice = async (req, res) => {
    const deviceId = req.params.id;
    const userId = req.session.user.id;

    try {
        const device = await db.Device.findOne({ where: { id: deviceId, userId: userId } });

        if (!device) {
            return res.status(404).json({ success: false, message: 'Device not found.' });
        }

        // Gunakan instanceId untuk menghapus sesi
        deleteSession(device.instanceId);
        await device.destroy();

        res.status(200).json({ success: true, message: 'Device deleted successfully.' });

    } catch (error) {
        console.error('Error deleting device:', error);
        res.status(500).json({ success: false, message: 'Server error while deleting device.' });
    }
};

// @desc    Reconnect a disconnected device
// @route   POST /api/v1/devices/reconnect
// @access  Private
const reconnectDevice = async (req, res) => {
    const { deviceId } = req.body;
    const userId = req.session.user.id;

    try {
        const device = await db.Device.findOne({ where: { id: deviceId, userId } });
        if (!device) {
            return res.status(404).json({ success: false, message: 'Device not found.' });
        }

        if (device.status === 'connected') {
             return res.status(400).json({ success: false, message: 'Device is already connected.'});
        }

        // Gunakan instanceId untuk menghasilkan QR baru, yang secara efektif menyambungkan kembali
        generateQRCode(device.instanceId, device.id);

        res.status(200).json({
            success: true,
            message: 'Reconnection initiated. Please check for a new QR code if needed.',
            instanceId: device.instanceId
        });

    } catch (error) {
        console.error('Error reconnecting device:', error);
        res.status(500).json({ success: false, message: 'Server error during reconnection.' });
    }
};


module.exports = {
    createDevice,
    deleteDevice,
    reconnectDevice
};
