// socket.js
let io;

const initIO = (httpServer) => {
  io = require('socket.io')(httpServer, {
    cors: {
      origin: "*", // Adjust for your frontend URL in production
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('A user connected via WebSocket:', socket.id);

    socket.on('join_room', (sessionId) => {
      console.log(`Socket ${socket.id} is joining room ${sessionId}`);
      socket.join(sessionId);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

module.exports = { initIO, getIO };
