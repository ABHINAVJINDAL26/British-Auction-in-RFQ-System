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
      if (now < new Date(rfq.bidStartTime)) {
        throw new Error('Bidding has not started yet');
      }
      if (now > new Date(rfq.bidCloseTime)) {
        throw new Error('Auction has closed');
      }

      // Snapshot ranking state before writing the new bid.
      const previousLatestSupplierBids = await tx.bid.findMany({
        where: { rfqId, isLatest: true },
        orderBy: [{ supplierId: 'asc' }, { submittedAt: 'desc' }],
        distinct: ['supplierId']
      });

      const previousRankedBids = [...previousLatestSupplierBids].sort((a, b) => a.totalCharges - b.totalCharges);
      const previousL1 = previousRankedBids[0] || null;
      const previousRankMap = new Map(previousRankedBids.map((bid, index) => [bid.supplierId, index + 1]));

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
      const l1Changed = previousL1?.supplierId !== newL1?.supplierId;

      const newRankMap = new Map(rankedBids.map((bid, index) => [bid.supplierId, index + 1]));
      const allSupplierIds = new Set([...previousRankMap.keys(), ...newRankMap.keys()]);

      let anyRankChanged = false;
      for (const supplierKey of allSupplierIds) {
        if (previousRankMap.get(supplierKey) !== newRankMap.get(supplierKey)) {
          anyRankChanged = true;
          break;
        }
      }

      const triggeredBy = l1Changed
        ? 'L1_RANK_CHANGE'
        : anyRankChanged
        ? 'ANY_RANK_CHANGE'
        : null;

      await tx.auctionEvent.create({
        data: {
          rfqId,
          eventType: 'BID_SUBMITTED',
          actorId: supplierId,
          description: `New bid of ₹${totalCharges} submitted`,
          triggeredBy
        }
      });

      return { newBid, l1Changed, rankedBids };
    });

    // Broadcast
    req.io.to(rfqId).emit('bid:new', {
      bid: result.newBid,
      l1Changed: result.l1Changed,
      newRankings: result.rankedBids
    });

    // Trigger extension check immediately on bid submit.
    const extensionResult = await checkAndExtendAuction(rfqId, req.io);

    res.status(200).json({
      bid: result.newBid,
      rankings: result.rankedBids,
      l1Changed: result.l1Changed,
      extended: !!extensionResult?.extended,
      oldCloseTime: extensionResult?.oldCloseTime || null,
      newCloseTime: extensionResult?.newCloseTime || null,
      reason: extensionResult?.reason || null,
      extensionMinutes: extensionResult?.extensionMinutes || null
    });
  } catch (err) {
    if (err.message === 'Auction is not active' || err.message === 'Auction has closed' || err.message === 'Bidding has not started yet') {
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
