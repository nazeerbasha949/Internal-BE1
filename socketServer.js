// socketServer.js
const { Server } = require('socket.io');

let io;
const connectedUsers = new Map();

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id);

    socket.on('register', ({ userId }) => {
      connectedUsers.set(userId, socket.id);
      console.log(`✅ User registered: ${userId} with socket: ${socket.id}`);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected:', socket.id);
      for (const [userId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          break;
        }
      }
    });
  });
};

module.exports = {
  initializeSocket,
  getIo: () => io,
  getConnectedUsers: () => connectedUsers,
};
