const socketIO = require('socket.io');

const initializeSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected');

    // Handle provider location updates
    socket.on('updateLocation', (data) => {
      io.emit(`provider-location-${data.providerId}`, {
        latitude: data.latitude,
        longitude: data.longitude
      });
    });

    // Handle request status updates
    socket.on('updateRequestStatus', (data) => {
      io.emit(`request-status-${data.requestId}`, {
        status: data.status,
        timestamp: new Date()
      });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  return io;
};

module.exports = initializeSocket;
