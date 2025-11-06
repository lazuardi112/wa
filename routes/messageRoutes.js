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

// --- API Routes for programmatic access (return JSON) ---

const apiNotSupportedGet = (req, res) => {
    res.status(405).json({
        success: false,
        message: `Method GET is not allowed for this endpoint. Please use POST to send a message. See the documentation at /api-docs for details.`
    });
};

// API route for sending text messages
router.route('/send-text')
    .post(checkMessageLimit, (req, res) => {
        req.body.messageType = 'text';
        sendApiMessage(req, res);
    })
    .get(apiNotSupportedGet);

// API route for sending images
router.route('/send-image')
    .post(upload.single('media'), checkMessageLimit, (req, res) => {
        req.body.messageType = 'image';
        sendApiMessage(req, res);
    })
    .get(apiNotSupportedGet);

// API route for sending documents
router.route('/send-document')
    .post(upload.single('media'), checkMessageLimit, (req, res) => {
        req.body.messageType = 'document';
        sendApiMessage(req, res);
    })
    .get(apiNotSupportedGet);

module.exports = router;
