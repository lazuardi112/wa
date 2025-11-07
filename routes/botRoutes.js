const express = require('express');
const router = express.Router();
const {
    createBot,
    deleteBot,
    createTrigger,
    deleteTrigger,
    createAction,
    deleteAction
} = require('../controllers/botController');
const { protectView, protect } = require('../middleware/authMiddleware');
const { userAuth } = require('../middleware/userAuth');

// All routes in this file are for POST actions and should be protected.
// The GET route for the bot page is in viewRoutes.js and adminViewRoutes.js.
router.use(protect, userAuth);

// Bot routes
router.post('/create', createBot);
router.post('/delete/:id', deleteBot);

// Trigger routes
router.post('/trigger/create', createTrigger);
router.post('/trigger/delete/:id', deleteTrigger);

// Action routes
router.post('/action/create', createAction);
router.post('/action/delete/:id', deleteAction);

module.exports = router;
