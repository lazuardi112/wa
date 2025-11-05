const db = require('../models');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// @desc    Generate an API Key for the user
// @route   POST /api/v1/user/generate-apikey
// @access  Private
const generateApiKey = async (req, res) => {
    try {
        const userId = req.session.user.id;

        const existingKey = await db.ApiKey.findOne({ where: { userId } });
        if (existingKey) {
            return res.status(400).redirect('/api-docs'); // Redirect back if key exists
        }

        const rawApiKey = crypto.randomBytes(32).toString('hex');
        const hashedKey = await bcrypt.hash(rawApiKey, 10);

        await db.ApiKey.create({
            userId,
            key: hashedKey
        });

        // Store the raw key in the session to be displayed ONCE.
        req.session.newlyGeneratedApiKey = rawApiKey;

        res.redirect('/api-docs');

    } catch (error) {
        console.error("API Key Generation Error:", error);
        res.status(500).redirect('/api-docs');
    }
};

module.exports = { generateApiKey };
