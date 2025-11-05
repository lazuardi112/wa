const express = require('express');
const http = require('http');
const cors = require('cors');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const db = require('./models');
const { initIO } = require('./socket');
const { reconnectExistingSessions } = require('./services/whatsappService');

const app = express();
const server = http.createServer(app);

// Inisialisasi Socket.IO
const io = initIO(server);

// Middleware
// Izinkan CORS hanya dalam mode pengembangan
if (process.env.NODE_ENV === 'development') {
  app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
  }));
}
app.use(express.json());

// Konfigurasi Sesi
const sessionStore = new SequelizeStore({ db: db.sequelize });
app.use(session({
  secret: process.env.SESSION_SECRET || 'a very strong secret key',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 jam
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  }
}));
sessionStore.sync();

// Rute API
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/admin', require('./routes/adminRoutes'));
app.use('/api/v1/devices', require('./routes/deviceRoutes'));
app.use('/api/v1/user', require('./routes/userRoutes'));
app.use('/api/v1/message', require('./routes/messageRoutes'));
// Tambahkan rute lain di sini nanti

// ================== Integrasi Frontend untuk Produksi ==================
if (process.env.NODE_ENV === 'production') {
  // Sajikan file statis dari build React
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  // Tangani semua permintaan lain dengan mengembalikan index.html React
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/build', 'index.html'));
  });
} else {
    app.get('/', (req, res) => {
        res.send('API is running in development mode...');
    });
}
// ======================================================================

const PORT = process.env.PORT || 8080;

db.sequelize.sync({ force: false })
  .then(() => {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
        reconnectExistingSessions();
    });
    console.log('Database connected and synchronized.');
  })
  .catch(err => {
    console.error('Failed to sync database:', err);
  });

io.on('connection', (socket) => {
  console.log('A user connected via WebSocket:', socket.id);
  socket.on('join', (room) => {
    console.log(`Socket ${socket.id} joining room ${room}`);
    socket.join(room);
  });
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});
