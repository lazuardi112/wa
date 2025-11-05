const db = require('../models');

// User-facing controllers
const renderLogin = (req, res) => {
  res.render('login', { error: null });
};

const renderRegister = (req, res) => {
  res.render('register', { error: null });
};

const renderDashboard = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.session.user.id, {
      include: [
        { model: db.Package, as: 'package' },
        { model: db.Device, as: 'devices' }
      ]
    });

    if (!user) {
      return res.redirect('/login');
    }

    const subscription = await db.Subscription.findOne({
      where: { userId: user.id, status: 'active' },
      order: [['expiresAt', 'DESC']]
    });

    const data = {
      subscriptionExpires: subscription ? new Date(subscription.expiresAt).toLocaleDateString() : 'N/A',
      deviceCount: user.devices ? user.devices.length : 0,
      messageCount: user.messageCount,
      messageLimit: user.package ? user.package.messageLimitPerDay : 0,
    };

    res.render('dashboard', { user, data });
  } catch (error) {
    console.error('Dashboard Error:', error);
    res.status(500).send('Server Error');
  }
};

const renderDevices = (req, res) => {
  res.render('devices');
};

const renderMessaging = (req, res) => {
  res.render('messaging');
};

const renderBot = (req, res) => {
  res.render('bot');
};

const renderApiDocs = (req, res) => {
  res.render('api-docs');
};

const renderSubscribe = (req, res) => {
  res.render('subscribe');
};

const renderVerifyOtp = (req, res) => {
    const { userId } = req.query;
    if (!userId) {
        return res.redirect('/register');
    }
    res.render('verify-otp', { error: null, userId });
};

// Admin-facing controllers
const renderAdminLogin = (req, res) => {
  res.render('admin/login', { error: null });
};

const renderAdminDashboard = async (req, res) => {
  try {
    const userCount = await db.User.count();
    const activeSubscriptions = await db.Subscription.count({ where: { status: 'active' } });
    const connectedDevices = await db.Device.count({ where: { status: 'connected' } });

    const data = {
      userCount,
      activeSubscriptions,
      connectedDevices,
    };

    res.render('admin/dashboard', { data });
  } catch (error) {
    console.error('Admin Dashboard Error:', error);
    res.status(500).send('Server Error');
  }
};

const renderAdminSettings = (req, res) => {
  res.render('admin/settings');
};

const renderAdminUsers = (req, res) => {
  res.render('admin/users');
};

module.exports = {
  renderLogin,
  renderRegister,
  renderDashboard,
  renderDevices,
  renderMessaging,
  renderBot,
  renderApiDocs,
  renderSubscribe,
  renderVerifyOtp,
  renderAdminLogin,
  renderAdminDashboard,
  renderAdminSettings,
  renderAdminUsers,
};
