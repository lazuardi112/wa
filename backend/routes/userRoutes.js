const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getUserDashboard,
    requestApiAccess
} = require('../controllers/userController');

// All routes are protected
router.use(protect);

// @route   GET /api/v1/user/dashboard
// @desc    Get user-specific dashboard stats
// @access  Private
router.get('/dashboard', getUserDashboard);

// @route   POST /api/v1/user/api/request
// @desc    Allows a user to request API access
// @access  Private
router.post('/api/request', requestApiAccess);

module.exports = router;
