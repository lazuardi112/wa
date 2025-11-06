const express = require('express');
const router = express.Router();
const multer = require('multer');
const { sendMessage, sendApiMessage } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const { userAuth } = require('../middleware/userAuth');
const { checkMessageLimit } = require('../middleware/messageLimitMiddleware');

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({ storage: storage });

// Protect all message routes and apply auth middleware
router.use(protect, userAuth);

// Route for sending messages from the UI (redirects on completion)
router.post('/send', upload.single('media'), checkMessageLimit, sendMessage);

// --- API Routes for programmatic access (return JSON) ---

// API route for sending text messages
router.post('/send-text', checkMessageLimit, (req, res) => {
    // We pass a messageType so the controller can handle it
    req.body.messageType = 'text';
    sendApiMessage(req, res);
});

// API route for sending images
router.post('/send-image', upload.single('media'), checkMessageLimit, (req, res) => {
    req.body.messageType = 'image';
    sendApiMessage(req, res);
});

// API route for sending documents
router.post('/send-document', upload.single('media'), checkMessageLimit, (req, res) => {
    req.body.messageType = 'document';
    sendApiMessage(req, res);
});

module.exports = router;
