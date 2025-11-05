
module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('A user connected via Socket.IO');

    // Listen for a join event from the client
    socket.on('join', (room) => {
      console.log(`Socket ${socket.id} is joining room: ${room}`);
      socket.join(room);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected from Socket.IO');
    });
  });
};
