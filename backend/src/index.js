require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cron = require('node-cron');
const prisma = require('./config/db');
const { checkAndExtendAuction } = require('./services/auctionExtension.engine');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // In production, specify your frontend URL
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Socket.IO Connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join:auction', ({ rfqId }) => {
    socket.join(rfqId);
    console.log(`Socket ${socket.id} joined auction ${rfqId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Middleware to inject io into requests if needed
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Cron Job: Check for extensions every 30 seconds
cron.schedule('*/30 * * * * *', async () => {
  try {
    const activeRfqs = await prisma.rFQ.findMany({
      where: { status: 'ACTIVE' }
    });

    for (const rfq of activeRfqs) {
      await checkAndExtendAuction(rfq.id, io);
      
      // Auto-close if time expired
      const now = new Date();
      if (now >= new Date(rfq.bidCloseTime)) {
        const status = now >= new Date(rfq.forcedCloseTime) ? 'FORCE_CLOSED' : 'CLOSED';
        await prisma.rFQ.update({
          where: { id: rfq.id },
          data: { status }
        });
        io.to(rfq.id).emit('auction:status-changed', { rfqId: rfq.id, status });
        console.log(`Auction ${rfq.id} ${status}`);
      }
    }
  } catch (err) {
    console.error('Cron error:', err);
  }
});

// Basic Health Check
const authRoutes = require('./routes/auth.routes');
const { authMiddleware } = require('./middlewares/auth.middleware');
const rfqRoutes = require('./routes/rfq.routes');
const bidRoutes = require('./routes/bid.routes');

app.get('/status', (req, res) => res.json({ status: 'OK' }));

// Routes
// Use auth for RFQ and Bid routes
app.use('/api/auth', authRoutes);
app.use('/api/rfqs', authMiddleware, rfqRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
