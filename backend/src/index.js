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
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true
}));
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
    const monitoredRfqs = await prisma.rFQ.findMany({
      where: {
        status: { in: ['DRAFT', 'ACTIVE'] }
      }
    });

    for (const rfq of monitoredRfqs) {
      const now = new Date();

      // Auto-start at bid start time.
      if (rfq.status === 'DRAFT' && now >= new Date(rfq.bidStartTime)) {
        await prisma.rFQ.update({
          where: { id: rfq.id },
          data: { status: 'ACTIVE' }
        });
        await prisma.auctionEvent.create({
          data: {
            rfqId: rfq.id,
            eventType: 'AUCTION_STARTED',
            description: 'Auction started at bid start time'
          }
        });
        io.to(rfq.id).emit('auction:status-changed', { rfqId: rfq.id, status: 'ACTIVE' });
        console.log(`Auction ${rfq.id} ACTIVE`);
        continue;
      }

      if (rfq.status !== 'ACTIVE') {
        continue;
      }

      await checkAndExtendAuction(rfq.id, io);

      // Re-fetch after extension so close checks use fresh bidCloseTime.
      const latestRfq = await prisma.rFQ.findUnique({ where: { id: rfq.id } });
      if (!latestRfq || latestRfq.status !== 'ACTIVE') {
        continue;
      }

      const latestNow = new Date();
      let nextStatus = null;
      if (latestNow >= new Date(latestRfq.forcedCloseTime)) {
        nextStatus = 'FORCE_CLOSED';
      } else if (latestNow >= new Date(latestRfq.bidCloseTime)) {
        nextStatus = 'CLOSED';
      }

      if (nextStatus) {
        await prisma.rFQ.update({
          where: { id: latestRfq.id },
          data: { status: nextStatus }
        });
        await prisma.auctionEvent.create({
          data: {
            rfqId: latestRfq.id,
            eventType: nextStatus === 'FORCE_CLOSED' ? 'AUCTION_FORCE_CLOSED' : 'AUCTION_CLOSED',
            description: nextStatus === 'FORCE_CLOSED' ? 'Auction force closed at hard cap' : 'Auction closed at bid close time'
          }
        });
        io.to(latestRfq.id).emit('auction:status-changed', { rfqId: latestRfq.id, status: nextStatus });
        console.log(`Auction ${latestRfq.id} ${nextStatus}`);
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
