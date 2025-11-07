// =====================================================
// Main Server Script
// =====================================================
console.log("🚀 Server script starting...");

try {
    // --- 1. Module Imports & Environment Config ---
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
    // Import middleware
    const { protectView, redirectIfLoggedIn } = require('./middleware/authMiddleware');
    const { userAuth } = require('./middleware/userAuth');
    console.log("   Modules loaded successfully.");

    // --- 2. Express App Initialization ---
    console.log("2. Initializing Express app...");
    const app = express();
    const server = http.createServer(app);
    console.log("   Express app initialized.");

    // --- 3. View Engine Configuration (EJS) ---
    console.log("3. Configuring view engine...");
    const ejs = require('ejs');
    app.engine('ejs', ejs.__express);
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    console.log("   View engine configured.");

    // --- 4. Core Middleware ---
    console.log("4. Applying middleware...");
    app.use(express.json()); // <-- IMPORTANT: This must come BEFORE the webhook route

    // --- PUBLIC WEBHOOK ---
    const paymentController = require('./controllers/paymentController');
    app.post('/notif/midtrans', paymentController.handleMidtransNotification);

    app.use(express.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, 'public')));
    console.log("   Middleware applied.");

    // --- 5. Session Configuration ---
    console.log("5. Configuring session store...");
    const sessionStore = new SequelizeStore({ db: db.sequelize });
    app.use(
      session({
        secret: process.env.SESSION_SECRET || 'a_very_strong_secret_key',
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 24 * 60 * 60 * 1000 },
      })
    );
    console.log("   Session store configured.");

    // --- 6. Route Setup ---
    console.log("6. Setting up routes...");
    // API Routes (already protected internally where needed)
    app.use('/api/v1/auth', require('./routes/authRoutes'));
    app.use('/api/v1/admin', require('./routes/adminRoutes'));
    app.use('/api/v1/devices', require('./routes/deviceRoutes'));
    app.use('/api/v1/user', require('./routes/userRoutes'));
    app.use('/api/v1/message', require('./routes/messageRoutes'));
    app.use('/api/v1/payment', require('./routes/paymentRoutes'));
    app.use('/api/v1/bot', require('./routes/botRoutes'));

    // Admin View Routes
    app.use('/admin', require('./routes/adminViewRoutes'));

    // --- Main User View Routes ---
    const viewController = require('./controllers/viewController');

    // Public routes must be defined BEFORE protected routes
    app.get('/login', redirectIfLoggedIn, (req, res) => res.render('login', { error: req.query.error || null }));
    app.get('/register', redirectIfLoggedIn, (req, res) => res.render('register', { error: req.query.error || null }));
    app.get('/verify-otp', redirectIfLoggedIn, (req, res) => {
        if (!req.query.userId) return res.redirect('/register');
        res.render('verify-otp', { error: req.query.error || null, userId: req.query.userId });
    });
    app.get('/', (req, res) => {
        // If the user is logged in, redirect to dashboard. Otherwise, show landing page.
        if (req.session.user) {
            return res.redirect('/dashboard');
        }
        viewController.renderLandingPage(req, res);
    });

    // Create a separate router for protected view routes
    const protectedViews = express.Router();
    protectedViews.use(protectView, userAuth); // Apply protection to this entire router

    // Assign protected routes to the protected router

    // Assign protected routes to the protected router
    protectedViews.get('/dashboard', viewController.renderDashboard);
    protectedViews.get('/devices', viewController.renderDevicesPage);
    protectedViews.get('/messaging', viewController.renderMessagingPage);
    protectedViews.get('/bot', viewController.renderBotPage);
    protectedViews.get('/bot/edit/:id', viewController.renderEditBotPage);
    protectedViews.get('/api-docs', viewController.renderApiDocsPage);
    protectedViews.get('/subscribe', viewController.renderSubscribePage);
    protectedViews.get('/history', viewController.renderHistoryPage);
    protectedViews.get('/logout', (req, res) => {
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.redirect('/login');
        });
    });

    // Use the protected router for all subsequent routes
    app.use('/', protectedViews);

    console.log("   Routes set up successfully.");

    // --- 7. Socket.IO Initialization ---
    console.log("7. Initializing Socket.IO...");
    initIO(server);
    console.log("   Socket.IO initialized.");

    // --- 8. Server Start ---
    const PORT = process.env.PORT || 8080;
    async function startServer() {
        console.log("8. Starting server...");
        await sessionStore.sync();
        console.log("   Session store synchronized.");
        await db.sequelize.sync({ force: false });
        console.log("✅ Database connected and synchronized.");
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
