const User = require('../models/userModel');
const Device = require('../models/deviceModel');
const Transaction = require('../models/transactionModel');
const Package = require('../models/packageModel');
const crypto = require('crypto');

// @desc    Get dashboard statistics for admin
// @route   GET /api/v1/admin/dashboard
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalDevices = await Device.countDocuments();
        const connectedDevices = await Device.countDocuments({ status: 'connected' });
        const totalTransactions = await Transaction.countDocuments({ status: 'success' });

        res.status(200).json({
            totalUsers,
            totalDevices,
            connectedDevices,
            totalTransactions,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all users (admin)
// @route   GET /api/v1/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
    try {
        // Pagination logic could be added here
        const users = await User.find({}).select('-password').populate('package', 'name');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new user (admin)
// @route   POST /api/v1/admin/users
// @access  Private/Admin
const createUser = async (req, res) => {
    // This is similar to registerUser, but done by an admin
    const { name, email, password, role, packageId } = req.body;
    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }
        const userPackage = await Package.findById(packageId) || await Package.findOne({name: 'Free'});

        const user = await User.create({
            name,
            email,
            password,
            role: role || 'user',
            package: userPackage._id,
            packageExpiresAt: new Date(new Date().setDate(new Date().getDate() + userPackage.durationDays))
        });
        res.status(201).json({ message: 'User created successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update a user (admin)
// @route   PUT /api/v1/admin/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Update fields
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.role = req.body.role || user.role;
        // Optionally update package
        if(req.body.packageId) {
            const newPackage = await Package.findById(req.body.packageId);
            if(newPackage){
                user.package = newPackage._id;
                user.packageExpiresAt = new Date(new Date().setDate(new Date().getDate() + newPackage.durationDays));
            }
        }
        // Update password if provided
        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();
        res.status(200).json({ message: 'User updated successfully', user: updatedUser });

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete a user (admin)
// @route   DELETE /api/v1/admin/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
     try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // TODO: Handle user's devices and other data upon deletion
        await Device.deleteMany({ user: user._id });
        await User.deleteOne({ _id: user._id });
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get list of users requesting API access
// @route   GET /api/v1/admin/api-requests
// @access  Private/Admin
const getApiRequests = async (req, res) => {
    try {
        const users = await User.find({ apiAccessStatus: 'requested' }).select('name email');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Approve a user's API access request
// @route   POST /api/v1/admin/api-requests/:userId/approve
// @access  Private/Admin
const approveApiRequest = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        if(user.apiAccessStatus !== 'requested'){
            return res.status(400).json({ message: 'User has not requested API access or has already been approved.' });
        }

        user.apiAccessStatus = 'approved';
        // Generate a unique API key if it doesn't exist
        if (!user.apiKey) {
            user.apiKey = `SAAS_${crypto.randomBytes(16).toString('hex')}`;
        }

        await user.save();
        res.status(200).json({ message: 'API access approved successfully.', apiKey: user.apiKey });

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};


module.exports = {
    getDashboardStats,
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    getApiRequests,
    approveApiRequest,
};
