require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const db = require('./models');
const { initIO } = require('./socket');
const { reconnectExistingSessions } = require('./services/whatsappService');

const app = express();
// Use cors middleware with credentials support
app.use(cors({
  origin: 'http://localhost:3000', // Frontend URL
  credentials: true
}));
app.use(express.json());

const server = http.createServer(app);
const io = initIO(server);

// Session store
const sessionStore = new SequelizeStore({
  db: db.sequelize,
});

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'a very strong secret key',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true
  }
}));

// Create Sessions table if it doesn't exist
sessionStore.sync();

// API Routes
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/admin', require('./routes/adminRoutes'));
app.use('/api/v1/devices', require('./routes/deviceRoutes'));
app.use('/api/v1/user', require('./routes/userRoutes'));
// Add payment and message routes later
// app.use('/api/v1', require('./routes/paymentRoutes'));
// app.use('/api/v1/message', require('./routes/messageRoutes'));

app.get('/', (req, res) => {
  res.send('WhatsApp SaaS API with MySQL is running...');
});

const PORT = process.env.PORT || 8080;

db.sequelize.sync({ force: false })
  .then(() => {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        reconnectExistingSessions();
    });
    console.log('Database connected and synchronized.');
  })
  .catch(err => {
    console.error('Failed to sync database:', err);
  });

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('join', (room) => {
    console.log(`Socket ${socket.id} joining room ${room}`);
    socket.join(room);
  });
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});
