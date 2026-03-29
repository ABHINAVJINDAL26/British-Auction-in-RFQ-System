const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const bidRoutes = require('./bid.routes');

function parseRfqDateTime(value) {
  if (!value) return null;

  // If frontend sends "YYYY-MM-DDTHH:mm" without timezone, interpret it as IST.
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return new Date(`${value}:00+05:30`);
  }

  return new Date(value);
}

// List all RFQs
router.get('/', async (req, res) => {
  try {
    const rfqs = await prisma.rFQ.findMany({
      include: {
        auctionConfig: true,
        buyer: true
      },
      orderBy: { bidCloseTime: 'asc' }
    });

    const rfqIds = rfqs.map((rfq) => rfq.id);
    const latestRows = rfqIds.length
      ? await prisma.bid.findMany({
          where: { rfqId: { in: rfqIds }, isLatest: true },
          orderBy: [{ rfqId: 'asc' }, { supplierId: 'asc' }, { submittedAt: 'desc' }],
          distinct: ['rfqId', 'supplierId']
        })
      : [];

    // Pick L1 bid per RFQ from deduped latest supplier bids.
    const l1ByRfq = new Map();
    for (const bid of latestRows) {
      const current = l1ByRfq.get(bid.rfqId);
      if (!current || bid.totalCharges < current.totalCharges) {
        l1ByRfq.set(bid.rfqId, bid);
      }
    }

    const response = rfqs.map((rfq) => ({
      ...rfq,
      bids: l1ByRfq.has(rfq.id) ? [l1ByRfq.get(rfq.id)] : []
    }));

    res.json(response);
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
        events: {
          orderBy: { createdAt: 'desc' },
          include: { actor: true }
        }
      }
    });
    if (!rfq) return res.status(404).json({ error: 'RFQ not found' });

    // One latest bid per supplier; then rank view sorted by total charges.
    const dedupedLatestBids = await prisma.bid.findMany({
      where: { rfqId: req.params.id, isLatest: true },
      orderBy: [{ supplierId: 'asc' }, { submittedAt: 'desc' }],
      distinct: ['supplierId'],
      include: { supplier: true }
    });
    dedupedLatestBids.sort((a, b) => a.totalCharges - b.totalCharges);

    res.json({ ...rfq, bids: dedupedLatestBids });
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
    const triggerWindowX = parseInt(auctionConfig?.triggerWindowX, 10);
    const extensionDurationY = parseInt(auctionConfig?.extensionDurationY, 10);

    if (!Number.isInteger(triggerWindowX) || triggerWindowX <= 0) {
      return res.status(400).json({ error: 'Trigger window must be a positive integer.' });
    }

    if (!Number.isInteger(extensionDurationY) || extensionDurationY <= 0) {
      return res.status(400).json({ error: 'Extension duration must be a positive integer.' });
    }

    const parsedPickupDate = parseRfqDateTime(pickupDate);
    const parsedBidStartTime = parseRfqDateTime(bidStartTime);
    const parsedBidCloseTime = parseRfqDateTime(bidCloseTime);
    const parsedForcedCloseTime = parseRfqDateTime(forcedCloseTime);

    if (parsedBidCloseTime <= parsedBidStartTime) {
      return res.status(400).json({ error: 'Bid close time must be after bid start time.' });
    }

    if (parsedForcedCloseTime <= parsedBidCloseTime) {
      return res.status(400).json({ error: 'Forced close time must be after bid close time.' });
    }

    const initialStatus = new Date() >= parsedBidStartTime ? 'ACTIVE' : 'DRAFT';

    const rfq = await prisma.rFQ.create({
      data: {
        name,
        referenceId,
        buyerId,
        pickupDate: parsedPickupDate,
        bidStartTime: parsedBidStartTime,
        bidCloseTime: parsedBidCloseTime,
        forcedCloseTime: parsedForcedCloseTime,
        originalCloseTime: parsedBidCloseTime,
        status: initialStatus,
        auctionConfig: {
          create: {
            triggerWindowX,
            extensionDurationY,
            triggerType: auctionConfig.triggerType
          }
        }
      }
    });

    if (req.io) {
      req.io.emit('rfq:created', {
        rfqId: rfq.id,
        status: rfq.status
      });
    }

    res.status(201).json(rfq);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.use('/:rfqId/bids', bidRoutes);

module.exports = router;
