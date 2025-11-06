const express = require('express');
const router = express.Router();
const multer = require('multer');
const { sendMessage } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const { userAuth } = require('../middleware/userAuth');
const { checkMessageLimit } = require('../middleware/messageLimitMiddleware');

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({ storage: storage });

// Protect all message routes and apply auth middleware
router.use(protect, userAuth);

// Apply message limit and file upload middleware to the send route
router.post('/send', upload.single('media'), checkMessageLimit, sendMessage);

module.exports = router;
