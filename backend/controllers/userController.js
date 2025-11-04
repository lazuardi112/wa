const db = require('../models');

// @desc    Get user-specific dashboard stats
// @route   GET /api/v1/user/dashboard
// @access  Private
const getUserDashboard = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await db.User.findByPk(userId, { include: 'package' });

        const totalDevices = await db.Device.count({ where: { userId } });
        const connectedDevices = await db.Device.count({ where: { userId, status: 'connected' } });

        res.status(200).json({
            totalDevices,
            connectedDevices,
            packageInfo: user.package,
            packageExpiresAt: user.packageExpiresAt
        });

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Request API access
// @route   POST /api/v1/user/api/request
// @access  Private
const requestApiAccess = async (req, res) => {
    try {
        const user = await db.User.findByPk(req.user.id, { include: 'package' });

        if (!user.package || !user.package.apiAccess) {
            return res.status(403).json({ message: 'Your current package does not grant API access.' });
        }
        if (user.apiAccessStatus === 'approved') {
            return res.status(400).json({ message: 'API access already approved.' });
        }
        if (user.apiAccessStatus === 'requested') {
            return res.status(400).json({ message: 'Request already submitted.' });
        }

        user.apiAccessStatus = 'requested';
        await user.save();

        res.status(200).json({ message: 'API access request submitted successfully.' });

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = {
    getUserDashboard,
    requestApiAccess,
};
