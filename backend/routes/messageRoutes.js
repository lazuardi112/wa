const express = require('express');
const router = express.Router();
const { sendMessage } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const { checkMessageLimit } = require('../middleware/messageLimitMiddleware');

// Protect all message routes
router.use(protect);

// Apply message limit middleware to the send route
router.post('/send', checkMessageLimit, sendMessage);

module.exports = router;
