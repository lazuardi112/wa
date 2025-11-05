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
    // Routes
    // =====================================================
    console.log("6. Setting up routes...");
    // API Routes
    app.use('/api/v1/auth', require('./routes/authRoutes'));
    app.use('/api/v1/admin', require('./routes/adminRoutes'));
    app.use('/api/v1/devices', require('./routes/deviceRoutes'));
    app.use('/api/v1/user', require('./routes/userRoutes'));
    app.use('/api/v1/message', require('./routes/messageRoutes'));
    app.use('/api/v1/payment', require('./routes/paymentRoutes'));
    app.use('/api/v1/bot', require('./routes/botRoutes'));

    // View Routes (EJS Rendering)
    app.use('/admin', require('./routes/adminViewRoutes')); // Admin view routes
    app.use('/', require('./routes/viewRoutes')); // Main user view routes
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
