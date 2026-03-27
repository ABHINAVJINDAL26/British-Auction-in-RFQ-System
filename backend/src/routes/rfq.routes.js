const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const bidRoutes = require('./bid.routes');

// List all RFQs
router.get('/', async (req, res) => {
  try {
    const rfqs = await prisma.rFQ.findMany({
      include: { 
        auctionConfig: true, 
        buyer: true,
        bids: {
          where: { isLatest: true },
          orderBy: { totalCharges: 'asc' },
          take: 1
        }
      },
      orderBy: { bidCloseTime: 'asc' }
    });
    res.json(rfqs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get RFQ details
router.get('/:id', async (req, res) => {
  try {
    const rfq = await prisma.rFQ.findUnique({
      where: { id: req.params.id },
      include: { 
        auctionConfig: true, 
        buyer: true,
        bids: { 
          where: { isLatest: true },
          orderBy: { totalCharges: 'asc' },
          include: { supplier: true }
        },
        events: {
          orderBy: { createdAt: 'desc' },
          include: { actor: true }
        }
      }
    });
    if (!rfq) return res.status(404).json({ error: 'RFQ not found' });
    res.json(rfq);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const { roleMiddleware } = require('../middlewares/auth.middleware');

// Create RFQ
router.post('/', roleMiddleware(['BUYER']), async (req, res) => {
  const { name, referenceId, pickupDate, bidStartTime, bidCloseTime, forcedCloseTime, auctionConfig } = req.body;
  const buyerId = req.user.id; // Get from token
  try {
    const rfq = await prisma.rFQ.create({
      data: {
        name,
        referenceId,
        buyerId,
        pickupDate: new Date(pickupDate),
        bidStartTime: new Date(bidStartTime),
        bidCloseTime: new Date(bidCloseTime),
        forcedCloseTime: new Date(forcedCloseTime),
        originalCloseTime: new Date(bidCloseTime),
        status: 'ACTIVE', // Defaulting to ACTIVE for demo
        auctionConfig: {
          create: {
            triggerWindowX: auctionConfig.triggerWindowX,
            extensionDurationY: auctionConfig.extensionDurationY,
            triggerType: auctionConfig.triggerType
          }
        }
      }
    });
    res.status(201).json(rfq);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.use('/:rfqId/bids', bidRoutes);

module.exports = router;
