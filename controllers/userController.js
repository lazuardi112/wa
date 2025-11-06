const db = require('../models');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// @desc    Generate an API Key for the user
// @route   POST /api/v1/user/generate-apikey
// @access  Private
const generateApiKey = async (req, res) => {
    try {
        const userId = req.session.user.id;

        // Invalidate any old API key by deleting it
        await db.ApiKey.destroy({ where: { userId } });

        // Generate the raw API key to show to the user
        const rawApiKey = crypto.randomBytes(32).toString('hex');

        // Create a SHA256 hash of the key for database storage
        const hashedKey = crypto.createHash('sha256').update(rawApiKey).digest('hex');

        // Store the hashed key in the database
        await db.ApiKey.create({
            userId,
            key: hashedKey // Store the hash
        });

        // Store the raw key in the session to be displayed ONCE.
        req.session.newlyGeneratedApiKey = rawApiKey;

        res.redirect('/api-docs');

    } catch (error) {
        console.error("API Key Generation Error:", error);
        res.redirect('/api-docs?status=error&msg=Could%20not%20generate%20API%20key.');
    }
};

module.exports = { generateApiKey };
