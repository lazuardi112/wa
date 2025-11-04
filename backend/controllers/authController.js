const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const Package = require('../models/packageModel');

// Function to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/v1/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please add all fields' });
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Find the default "Free" package
    const freePackage = await Package.findOne({ name: 'Free' });
    if (!freePackage) {
        // This is a critical setup issue. A 'Free' package must exist.
        // For now, let's create one if it doesn't exist for robustness.
        const newFreePackage = await Package.create({
            name: 'Free',
            price: 0,
            durationDays: 9999, // or a specific trial period
            maxDevices: 1,
            apiAccess: false
        });
        console.log("Default 'Free' package was not found. Created one.");
        freePackage = newFreePackage;
    }

    const packageExpiresAt = new Date();
    packageExpiresAt.setDate(packageExpiresAt.getDate() + freePackage.durationDays);

    const user = await User.create({
      name,
      email,
      password,
      package: freePackage._id,
      packageExpiresAt
    });

    if (user) {
      res.status(201).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/v1/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get current user's data
// @route   GET /api/v1/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    // req.user is populated by the 'protect' middleware
    const user = await User.findById(req.user.id).select('-password').populate('package');
    if(user){
        res.status(200).json(user);
    } else {
        res.status(404).json({ message: "User not found" });
    }
  } catch(error){
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
};
