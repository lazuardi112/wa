const express = require('express');
const router = express.Router();
const { sendMessage, sendBroadcast } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

// All message routes are for logged-in users
router.use(protect);

router.post('/send', sendMessage);
router.post('/broadcast', sendBroadcast);

module.exports = router;
