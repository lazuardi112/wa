// Impor modul yang diperlukan
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const http = require('http');
const path = require('path');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const db = require('./models');
const { initIO } = require('./socket');
const { reconnectExistingSessions } = require('./services/whatsappService');

// Inisialisasi Aplikasi Express
const app = express();
const server = http.createServer(app);

// Konfigurasi View Engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json()); // Untuk parsing body JSON dari API
app.use(express.urlencoded({ extended: true })); // Untuk parsing data form (login)

// Konfigurasi Sesi
const sessionStore = new SequelizeStore({ db: db.sequelize });
app.use(session({
  secret: process.env.SESSION_SECRET || 'a_very_strong_secret_key',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 jam
  }
}));
sessionStore.sync();

// Middleware sederhana untuk memeriksa otentikasi
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect('/login');
};

// ================== Rute Halaman Web (EJS Rendering) ==================
// Rute Admin Root
app.get('/admin', (req, res) => {
    if (req.session.admin) {
        res.redirect('/admin/dashboard');
    } else {
        res.redirect('/admin/login');
    }
});

// Rute Root: Arahkan ke dasbor jika sudah login, jika tidak, ke halaman login
app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

// Rute Halaman Login (GET)
app.get('/login', (req, res) => {
  res.render('login', { error: '' }); // Render login.ejs
});

// Rute Proses Login (POST)
// Formulir login sekarang akan mengirimkan ke rute API otentikasi
// Lihat backend/routes/authRoutes.js untuk logika penanganan


// Rute Halaman Dasbor (GET, dilindungi)
app.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const deviceCount = await db.Device.count({ where: { userId } });
        const user = await db.User.findByPk(userId);
        // Find the latest subscription for the user
        const subscription = await db.Subscription.findOne({
            where: { userId },
            order: [['expiresAt', 'DESC']]
        });

        const dashboardData = {
            deviceCount,
            messageCount: user.messageCount,
            messageLimit: 50, // This should be dynamic based on package later
            subscriptionExpires: subscription ? subscription.expiresAt.toLocaleDateString() : 'N/A'
        };
        res.render('dashboard', { user: req.session.user, data: dashboardData });
    } catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).send("Error loading dashboard.");
    }
});

// Rute Halaman Perangkat (GET, dilindungi)
app.get('/devices', isAuthenticated, async (req, res) => {
    try {
        const devices = await db.Device.findAll({ where: { userId: req.session.user.id } });
        res.render('devices', { user: req.session.user, devices });
    } catch (error) {
        console.error("Devices Page Error:", error);
        res.status(500).send("Error loading devices page.");
    }
});

// Rute Halaman Langganan (GET, dilindungi)
app.get('/subscribe', isAuthenticated, async (req, res) => {
    try {
        const clientKeySetting = await db.Setting.findOne({ where: { key: 'midtransClientKey' } });
        if (!clientKeySetting || !clientKeySetting.value) {
            // Sebaiknya jangan tampilkan halaman error, tapi mungkin halaman "pembayaran sedang tidak tersedia"
            return res.status(500).send("Midtrans Client Key is not configured by the admin.");
        }
        res.render('subscribe', { midtransClientKey: clientKeySetting.value });
    } catch (error) {
        res.status(500).send("Error loading subscription page.");
    }
});

// Rute Halaman Dokumentasi API (GET, dilindungi)
app.get('/api-docs', isAuthenticated, async (req, res) => {
    try {
        // Check for a newly generated key in the session (flash message)
        const newApiKey = req.session.newlyGeneratedApiKey;
        // Clear the key from the session so it's only shown once
        if (newApiKey) {
            delete req.session.newlyGeneratedApiKey;
        }

        const apiKeyExists = await db.ApiKey.findOne({ where: { userId: req.session.user.id } });

        res.render('api-docs', {
            apiKey: newApiKey, // This will be the raw key or null
            apiKeyExists: !!apiKeyExists
        });
    } catch (error) {
        res.status(500).send("Error loading API docs.");
    }
});

// Rute Halaman Pengiriman Pesan (GET, dilindungi)
app.get('/messaging', isAuthenticated, async (req, res) => {
    try {
        const devices = await db.Device.findAll({ where: { userId: req.session.user.id } });
        res.render('messaging', { devices });
    } catch (error) {
        res.status(500).send("Error loading messaging page.");
    }
});

// Rute Halaman Bot (GET, dilindungi)
app.get('/bot', isAuthenticated, (req, res) => {
    res.render('bot');
});

// Rute Logout
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/dashboard');
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

// ================== Rute API (Tetap berfungsi seperti biasa) ==================
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/admin', require('./routes/adminRoutes'));
app.use('/api/v1/devices', require('./routes/deviceRoutes'));
app.use('/api/v1/user', require('./routes/userRoutes'));
app.use('/api/v1/message', require('./routes/messageRoutes'));
app.use('/api/v1/payment', require('./routes/paymentRoutes'));

// ======================================================================

// Inisialisasi Socket.IO
const io = initIO(server);
io.on('connection', (socket) => {
  console.log('A user connected via WebSocket:', socket.id);
});

// Sinkronisasi Database dan Mulai Server
const PORT = process.env.PORT || 8080;
db.sequelize.sync({ force: false })
  .then(() => {
    server.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        reconnectExistingSessions();
    });
    console.log('Database connected and synchronized.');
  })
  .catch(err => {
    console.error('Failed to sync database:', err);
  });
