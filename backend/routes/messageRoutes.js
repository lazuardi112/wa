const express = require('express');
const router = express.Router();
const { sendMessage, sendBroadcast } = require('../controllers/messageController');
const { apiKeyAuth } = require('../middleware/apiKeyMiddleware');

// All routes in this file are protected by an API Key
router.use(apiKeyAuth);

// @route   POST /api/v1/message/send
// @desc    Send a single message
// @access  Private (API Key)
router.post('/send', sendMessage);

// @route   POST /api/v1/message/broadcast
// @desc    Send a message to multiple numbers
// @access  Private (API Key)
router.post('/broadcast', sendBroadcast);

module.exports = router;
