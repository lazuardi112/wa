const express = require('express');
const router = express.Router();
const { addDevice, getUserDevices, deleteDevice, reconnectDevice } = require('../controllers/deviceController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(getUserDevices);

router.route('/add')
    .post(addDevice);

router.route('/:instanceId')
    .delete(deleteDevice);

router.route('/:instanceId/reconnect')
    .post(reconnectDevice);

module.exports = router;
