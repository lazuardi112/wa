const User = require('../models/userModel');
const Device = require('../models/deviceModel');

// @desc    Get user-specific dashboard stats
// @route   GET /api/v1/user/dashboard
// @access  Private
const getUserDashboard = async (req, res) => {
    try {
        const userId = req.user.id;
        const totalDevices = await Device.countDocuments({ user: userId });
        const connectedDevices = await Device.countDocuments({ user: userId, status: 'connected' });

        // You might want to add message stats later, e.g., by creating a MessageLog model
        const messagesSent = 0; // Placeholder
        const messagesFailed = 0; // Placeholder

        res.status(200).json({
            totalDevices,
            connectedDevices,
            messagesSent,
            messagesFailed,
            packageInfo: req.user.package,
            packageExpiresAt: req.user.packageExpiresAt
        });

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};


// @desc    Allows a user to request API access
// @route   POST /api/v1/user/api/request
// @access  Private
const requestApiAccess = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('package');

        if (!user.package || !user.package.apiAccess) {
            return res.status(403).json({ message: 'Your current package does not include API access. Please upgrade your plan.' });
        }

        if (user.apiAccessStatus === 'approved') {
            return res.status(400).json({ message: 'Your API access has already been approved.' });
        }

        if (user.apiAccessStatus === 'requested') {
            return res.status(400).json({ message: 'You have already submitted a request. Please wait for admin approval.' });
        }

        user.apiAccessStatus = 'requested';
        await user.save();

        res.status(200).json({ message: 'Your request for API access has been submitted successfully. Please wait for admin approval.' });

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = {
    getUserDashboard,
    requestApiAccess,
};
