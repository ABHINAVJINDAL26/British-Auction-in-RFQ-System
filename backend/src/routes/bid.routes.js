const express = require('express');
const router = express.Router({ mergeParams: true });
const prisma = require('../config/db');
const { checkAndExtendAuction } = require('../services/auctionExtension.engine');

const { roleMiddleware } = require('../middlewares/auth.middleware');

// Submit a bid
router.post('/', roleMiddleware(['SUPPLIER']), async (req, res) => {
  const { rfqId } = req.params;
  const { carrierName, freightCharges, originCharges, destinationCharges, transitTime, quoteValidity, notes } = req.body;
  const supplierId = req.user.id; // From token

  try {
    const rfq = await prisma.rFQ.findUnique({ where: { id: rfqId } });
    if (!rfq || rfq.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Auction is not active' });
    }

    const now = new Date();
    if (now > new Date(rfq.bidCloseTime)) {
      return res.status(400).json({ error: 'Auction has closed' });
    }

    const totalCharges = parseFloat(freightCharges) + parseFloat(originCharges || 0) + parseFloat(destinationCharges || 0);

    // Get current L1
    const currentL1 = await prisma.bid.findFirst({
      where: { rfqId, isLatest: true },
      orderBy: { totalCharges: 'asc' }
    });

    // Mark previous bid as not latest
    await prisma.bid.updateMany({
      where: { rfqId, supplierId, isLatest: true },
      data: { isLatest: false }
    });

    // Create new bid
    const newBid = await prisma.bid.create({
      data: {
        rfqId,
        supplierId,
        carrierName,
        freightCharges: parseFloat(freightCharges),
        originCharges: parseFloat(originCharges || 0),
        destinationCharges: parseFloat(destinationCharges || 0),
        totalCharges,
        transitTime: parseInt(transitTime),
        quoteValidity: new Date(quoteValidity),
        notes,
        isLatest: true
      }
    });

    // Recalculate ranks
    const allBids = await prisma.bid.findMany({
      where: { rfqId, isLatest: true },
      orderBy: { totalCharges: 'asc' }
    });

    for (let i = 0; i < allBids.length; i++) {
      await prisma.bid.update({
        where: { id: allBids[i].id },
        data: { rank: i + 1 }
      });
    }

    // Check if L1 changed
    const newL1 = await prisma.bid.findFirst({
      where: { rfqId, isLatest: true },
      orderBy: { totalCharges: 'asc' }
    });

    const l1Changed = currentL1?.supplierId !== newL1?.supplierId;

    // Log event
    await prisma.auctionEvent.create({
      data: {
        rfqId,
        eventType: 'BID_SUBMITTED',
        actorId: supplierId,
        description: `New bid of ₹${totalCharges} submitted`,
        triggeredBy: l1Changed ? 'L1_RANK_CHANGE' : null
      }
    });

    // Broadcast
    req.io.to(rfqId).emit('bid:new', { bid: newBid, l1Changed });

    // Trigger extension check
    await checkAndExtendAuction(rfqId, req.io);

    res.status(201).json(newBid);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all bids for an RFQ
router.get('/', async (req, res) => {
  try {
    const where = { rfqId: req.params.rfqId, isLatest: true };
    
    // Suppliers only see their own bids
    if (req.user.role === 'SUPPLIER') {
      where.supplierId = req.user.id;
    }

    const bids = await prisma.bid.findMany({
      where,
      orderBy: { totalCharges: 'asc' },
      include: { supplier: true }
    });
    res.json(bids);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
