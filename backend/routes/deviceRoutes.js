const express = require('express');
const router = express.Router();
const { addDevice, getUserDevices, deleteDevice } = require('../controllers/deviceController');
const { protect } = require('../middleware/authMiddleware');

// All these routes are protected and require a logged-in user
router.use(protect);

// @route   GET /api/v1/devices
// @desc    Get all devices for the logged-in user
// @access  Private
router.get('/', getUserDevices);

// @route   POST /api/v1/devices/add
// @desc    Add a new device and initiate connection
// @access  Private
router.post('/add', addDevice);

// @route   DELETE /api/v1/devices/:instanceId
// @desc    Delete a device instance and logout
// @access  Private
router.delete('/:instanceId', deleteDevice);

module.exports = router;
