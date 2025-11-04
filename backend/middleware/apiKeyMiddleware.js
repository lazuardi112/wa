const User = require('../models/userModel');

const apiKeyAuth = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ message: 'API Key is required' });
  }

  try {
    const user = await User.findOne({ apiKey });
    if (!user || user.apiAccessStatus !== 'approved') {
      return res.status(403).json({ message: 'Invalid or unauthorized API Key' });
    }

    // Check if the user's package has expired
    if (user.packageExpiresAt && new Date() > new Date(user.packageExpiresAt)) {
      return res.status(403).json({ message: 'Your package has expired. Please renew to use the API.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('API Key Auth Error:', error);
    res.status(500).json({ message: 'Server Error during API Key authentication' });
  }
};

module.exports = { apiKeyAuth };
