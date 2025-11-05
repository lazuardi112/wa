// =====================================================
// Main Server Script
// =====================================================
console.log("🚀 Server script starting...");

try {
    // Modul dan konfigurasi environment
    console.log("1. Loading modules...");
    const path = require('path');
    require('dotenv').config();
    const express = require('express');
    const http = require('http');
    const session = require('express-session');
    const SequelizeStore = require('connect-session-sequelize')(session.Store);
    const db = require('./models');
    const { initIO } = require('./socket');
    const { reconnectExistingSessions } = require('./services/whatsappService');
    console.log("   Modules loaded successfully.");

    // Inisialisasi Express dan HTTP Server
    console.log("2. Initializing Express app...");
    const app = express();
    const server = http.createServer(app);
    console.log("   Express app initialized.");

    // =====================================================
    // Konfigurasi View Engine (EJS)
    // =====================================================
    console.log("3. Configuring view engine...");
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    console.log("   View engine configured.");

    // =====================================================
    // Middleware
    // =====================================================
    console.log("4. Applying middleware...");
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    console.log("   Middleware applied.");

    // =====================================================
    // Konfigurasi Session
    // =====================================================
    console.log("5. Configuring session store...");
    const sessionStore = new SequelizeStore({ db: db.sequelize });
    app.use(
      session({
        secret: process.env.SESSION_SECRET || 'a_very_strong_secret_key',
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
          maxAge: 24 * 60 * 60 * 1000,
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
        },
      })
    );
    console.log("   Session store configured.");

    // =====================================================
    // Middleware untuk otentikasi
    // =====================================================
    const isAuthenticated = (req, res, next) => {
      if (req.session.user) return next();
      return res.redirect('/login');
    };

    // =====================================================
    // Rute Web (EJS Rendering)
    // =====================================================
    console.log("6. Setting up routes...");
    app.get('/', (req, res) => {
      if (req.session.user) return res.redirect('/dashboard');
      return res.redirect('/login');
    });
    app.get('/admin', (req, res) => {
      if (req.session.admin) return res.redirect('/admin/dashboard');
      return res.redirect('/admin/login');
    });
    app.get('/login', (req, res) => res.render('login', { error: '' }));
    app.get('/register', (req, res) => res.render('register', { error: '' }));
    app.get('/verify-otp', (req, res) => {
      if (!req.query.userId) return res.redirect('/register');
      res.render('verify-otp', { error: '', userId: req.query.userId });
    });
    app.get('/dashboard', isAuthenticated, async (req, res) => {
      try {
        const userId = req.session.user.id;
        const [user, deviceCount] = await Promise.all([
          db.User.findByPk(userId),
          db.Device.count({ where: { userId } }),
        ]);
        const subscription = db.Subscription ? await db.Subscription.findOne({ where: { userId }, order: [['expiresAt', 'DESC']] }) : null;
        const dashboardData = {
          deviceCount: deviceCount || 0,
          messageCount: user?.messageCount || 0,
          messageLimit: 50,
          subscriptionExpires: subscription ? subscription.expiresAt.toLocaleDateString() : 'N/A',
        };
        res.render('dashboard', { user: req.session.user, data: dashboardData });
      } catch (error) {
        console.error('Dashboard Error:', error);
        res.status(500).send('Error loading dashboard.');
      }
    });
    app.get('/devices', isAuthenticated, async (req, res) => {
      try {
        const devices = db.Device ? await db.Device.findAll({ where: { userId: req.session.user.id } }) : [];
        res.render('devices', { user: req.session.user, devices });
      } catch (error) {
        console.error('Devices Page Error:', error);
        res.status(500).send('Error loading devices page.');
      }
    });
    app.get('/subscribe', isAuthenticated, async (req, res) => {
      try {
        if (!db.Setting) return res.status(500).send('Settings model not defined.');
        const clientKeySetting = await db.Setting.findOne({ where: { key: 'midtransClientKey' } });
        if (!clientKeySetting?.value) return res.status(500).send('Midtrans Client Key is not configured by the admin.');
        res.render('subscribe', { midtransClientKey: clientKeySetting.value });
      } catch (error) {
        console.error('Subscribe Page Error:', error);
        res.status(500).send('Error loading subscription page.');
      }
    });
    app.get('/api-docs', isAuthenticated, async (req, res) => {
      try {
        if (!db.ApiKey) return res.status(500).send('ApiKey model not defined.');
        const newApiKey = req.session.newlyGeneratedApiKey;
        if (newApiKey) delete req.session.newlyGeneratedApiKey;
        const apiKeyExists = await db.ApiKey.findOne({ where: { userId: req.session.user.id } });
        res.render('api-docs', { apiKey: newApiKey || null, apiKeyExists: !!apiKeyExists });
      } catch (error) {
        console.error('API Docs Page Error:', error);
        res.status(500).send('Error loading API docs.');
      }
    });
    app.get('/messaging', isAuthenticated, async (req, res) => {
      try {
        const devices = db.Device ? await db.Device.findAll({ where: { userId: req.session.user.id } }) : [];
        res.render('messaging', { devices });
      } catch (error) {
        console.error('Messaging Page Error:', error);
        res.status(500).send('Error loading messaging page.');
      }
    });
    app.get('/bot', isAuthenticated, (req, res) => res.render('bot'));
    app.get('/logout', (req, res) => {
      req.session.destroy((err) => {
        if (err) return res.redirect('/dashboard');
        res.clearCookie('connect.sid');
        res.redirect('/login');
      });
    });
    app.use('/api/v1/auth', require('./routes/authRoutes'));
    app.use('/api/v1/admin', require('./routes/adminRoutes'));
    app.use('/api/v1/devices', require('./routes/deviceRoutes'));
    app.use('/api/v1/user', require('./routes/userRoutes'));
    app.use('/api/v1/message', require('./routes/messageRoutes'));
    app.use('/api/v1/payment', require('./routes/paymentRoutes'));
    console.log("   Routes set up successfully.");

    // =====================================================
    // Socket.IO Initialization
    // =====================================================
    console.log("7. Initializing Socket.IO...");
    initIO(server);
    console.log("   Socket.IO initialized.");

    // =====================================================
    // Jalankan Server
    // =====================================================
    const PORT = process.env.PORT || 8080;

    async function startServer() {
        console.log("8. Starting server...");
        // Pertama, sinkronkan session store
        await sessionStore.sync();
        console.log("   Session store synchronized.");

        // Kemudian, sinkronkan semua model database
        await db.sequelize.sync({ force: false });
        console.log("✅ Database connected and synchronized.");

        // Terakhir, jalankan server
        server.listen(PORT, () => {
            console.log(`✅ Server running on http://localhost:${PORT}`);
            reconnectExistingSessions();
        });
    }

    startServer().catch(err => {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    });

} catch (error) {
    console.error("🔥 A critical error occurred during server setup:", error);
    process.exit(1);
}
