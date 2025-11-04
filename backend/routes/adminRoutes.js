const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');

const {
    getDashboardStats,
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    getApiRequests,
    approveApiRequest
} = require('../controllers/adminController');

// All routes in this file are protected and require admin privileges
router.use(protect, admin);

// Dashboard
router.get('/dashboard', getDashboardStats);

// User Management
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// API Access Management
router.get('/api-requests', getApiRequests);
router.post('/api-requests/:userId/approve', approveApiRequest);

// TODO: Add routes for Package and Transaction Management
// router.get('/packages', ...);
// router.post('/packages', ...);
// router.get('/transactions', ...);

module.exports = router;
