const express = require('express');
const router = express.Router();
const { addDevice, getUserDevices, deleteDevice } = require('../controllers/deviceController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(getUserDevices);

router.route('/add')
    .post(addDevice);

router.route('/:instanceId')
    .delete(deleteDevice);

module.exports = router;
