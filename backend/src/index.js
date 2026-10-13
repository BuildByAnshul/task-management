require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/db');
const { initSocket } = require('./sockets');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initSocket(server);

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 NovaBoard server running on port ${PORT}`);
    console.log(`📡 Socket.io ready`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  });
}).catch((err) => {
  console.error('Failed to connect to DB:', err);
  process.exit(1);
});
