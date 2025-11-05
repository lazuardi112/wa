const express = require('express');
const router = express.Router();
const { generateApiKey } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware'); // Assuming you have this middleware

// Note: You might need to adjust 'protect' middleware to work with sessions if it's token-based.
// For EJS app, session-based protection is handled by 'isAuthenticated' in server.js.
// We'll assume the API routes might still be protected by a different mechanism for external tools.

router.post('/generate-apikey', protect, generateApiKey);

module.exports = router;
