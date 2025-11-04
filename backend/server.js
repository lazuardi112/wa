require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { initIO } = require('./socket');

// Connect to Database
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = initIO(server); // Initialize Socket.io

// Simple route for testing
app.get('/', (req, res) => {
  res.send('WhatsApp SaaS API is running...');
});

// Define API Routes
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/devices', require('./routes/deviceRoutes'));
app.use('/api/v1/message', require('./routes/messageRoutes'));
app.use('/api/v1/user', require('./routes/userRoutes'));
app.use('/api/v1/admin', require('./routes/adminRoutes'));
// This handles /packages, /subscription/order, and /notification from paymentRoutes
app.use('/api/v1', require('./routes/paymentRoutes'));

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Handle socket connections
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Join a room based on instanceId from the client
  socket.on('join', (instanceId) => {
    console.log(`Socket ${socket.id} joining room ${instanceId}`);
    socket.join(instanceId);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});
