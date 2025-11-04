const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getUserDashboard,
    requestApiAccess
} = require('../controllers/userController');

router.use(protect);

router.get('/dashboard', getUserDashboard);
router.post('/api/request', requestApiAccess);

module.exports = router;
