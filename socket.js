// socket.js
let io;

const initIO = (httpServer) => {
  io = require('socket.io')(httpServer, {
    cors: {
      origin: "*", // Adjust for your frontend URL in production
      methods: ["GET", "POST"]
    }
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
