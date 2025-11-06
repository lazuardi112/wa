const express = require('express');
const router = express.Router();
const {
    createBotFlow,
    toggleBotFlow,
    deleteBotFlow,
    updateBotFlow,
    // getBotFlows and updateBotFlow will be handled by viewController for page rendering
} = require('../controllers/botController');
const { protect } = require('../middleware/authMiddleware');
const { userAuth } = require('../middleware/userAuth');

// Protect all bot routes
router.use(protect, userAuth);

// Route to create a new bot flow
router.post('/create', createBotFlow);

// Route to toggle the isEnabled status of a bot flow
router.post('/toggle/:id', toggleBotFlow);

// Route to delete a bot flow
router.post('/delete/:id', deleteBotFlow);

// Route to update a bot flow
router.post('/update/:id', updateBotFlow);

module.exports = router;
