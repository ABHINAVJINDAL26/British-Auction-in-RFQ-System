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
    const totalCharges = parseFloat(freightCharges) + parseFloat(originCharges || 0) + parseFloat(destinationCharges || 0);

    const result = await prisma.$transaction(async (tx) => {
      const rfq = await tx.rFQ.findUnique({ where: { id: rfqId } });
      if (!rfq || rfq.status !== 'ACTIVE') {
        throw new Error('Auction is not active');
      }

      const now = new Date();
      if (now > new Date(rfq.bidCloseTime)) {
        throw new Error('Auction has closed');
      }

      // Get current L1 before writing the new bid.
      const currentL1 = await tx.bid.findFirst({
        where: { rfqId, isLatest: true },
        orderBy: { totalCharges: 'asc' }
      });

      // Mark supplier's older latest bids as not-latest.
      await tx.bid.updateMany({
        where: { rfqId, supplierId, isLatest: true },
        data: { isLatest: false }
      });

      const newBid = await tx.bid.create({
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

      // Safety cleanup for race conditions: ensure only this supplier bid remains latest.
      await tx.bid.updateMany({
        where: {
          rfqId,
          supplierId,
          isLatest: true,
          id: { not: newBid.id }
        },
        data: { isLatest: false }
      });

      // Build one-row-per-supplier ranking from latest bids.
      const latestSupplierBids = await tx.bid.findMany({
        where: { rfqId, isLatest: true },
        orderBy: [{ supplierId: 'asc' }, { submittedAt: 'desc' }],
        distinct: ['supplierId']
      });

      const rankedBids = [...latestSupplierBids].sort((a, b) => a.totalCharges - b.totalCharges);

      for (let i = 0; i < rankedBids.length; i++) {
        await tx.bid.update({
          where: { id: rankedBids[i].id },
          data: { rank: i + 1 }
        });
      }

      const newL1 = rankedBids[0];
      const l1Changed = currentL1?.supplierId !== newL1?.supplierId;

      await tx.auctionEvent.create({
        data: {
          rfqId,
          eventType: 'BID_SUBMITTED',
          actorId: supplierId,
          description: `New bid of ₹${totalCharges} submitted`,
          triggeredBy: l1Changed ? 'L1_RANK_CHANGE' : null
        }
      });

      return { newBid, l1Changed };
    });

    // Broadcast
    req.io.to(rfqId).emit('bid:new', { bid: result.newBid, l1Changed: result.l1Changed });

    // Trigger extension check
    await checkAndExtendAuction(rfqId, req.io);

    res.status(201).json(result.newBid);
  } catch (err) {
    if (err.message === 'Auction is not active' || err.message === 'Auction has closed') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Get all bids for an RFQ
router.get('/', async (req, res) => {
  try {
    const { rfqId } = req.params;

    // Suppliers only see their own latest bid.
    if (req.user.role === 'SUPPLIER') {
      const myLatestBid = await prisma.bid.findFirst({
        where: { rfqId, supplierId: req.user.id },
        orderBy: { submittedAt: 'desc' },
        include: { supplier: true }
      });
      return res.json(myLatestBid ? [myLatestBid] : []);
    }

    // Buyers see one latest row per supplier, ranked by total charges.
    const dedupedLatestBids = await prisma.bid.findMany({
      where: { rfqId, isLatest: true },
      orderBy: [{ supplierId: 'asc' }, { submittedAt: 'desc' }],
      distinct: ['supplierId'],
      include: { supplier: true }
    });

    dedupedLatestBids.sort((a, b) => a.totalCharges - b.totalCharges);
    res.json(dedupedLatestBids);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
