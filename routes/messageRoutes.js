const express = require('express');
const router = express.Router();
const multer = require('multer');
const { sendMessage } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const { checkMessageLimit } = require('../middleware/messageLimitMiddleware');

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({ storage: storage });

// Protect all message routes
router.use(protect);

// Apply message limit and file upload middleware to the send route
router.post('/send', upload.single('media'), checkMessageLimit, sendMessage);

module.exports = router;
