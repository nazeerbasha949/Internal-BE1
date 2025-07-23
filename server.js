const http = require('http');
const app = require('./app');
const { initializeSocket } = require('./socketServer'); // ✅ correct import


const server = http.createServer(app);

initializeSocket(server); // ✅ setup socket before listen

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
