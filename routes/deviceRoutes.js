const express = require('express');
const router = express.Router();
const { createDevice, deleteDevice, reconnectDevice } = require('../controllers/deviceController');
const { protect } = require('../middleware/authMiddleware');

// Semua rute di file ini harus diproteksi
router.use(protect);

router.post('/', createDevice);
router.delete('/:id', deleteDevice);
router.post('/reconnect', reconnectDevice);

module.exports = router;
