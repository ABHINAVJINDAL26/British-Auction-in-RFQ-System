const prisma = require('../config/db');

/**
 * Checks if an auction should be extended and performs the extension.
 */
async function checkAndExtendAuction(rfqId, io) {
  const rfq = await prisma.rFQ.findUnique({
    where: { id: rfqId },
    include: { auctionConfig: true }
  });

  if (!rfq || rfq.status !== 'ACTIVE') return;

  const now = new Date();
  const { triggerWindowX, extensionDurationY, triggerType } = rfq.auctionConfig;

  // Calculate trigger window start
  const windowStart = new Date(rfq.bidCloseTime);
  windowStart.setMinutes(windowStart.getMinutes() - triggerWindowX);

  // Only evaluate if we're inside the trigger window
  if (now < windowStart || now > rfq.bidCloseTime) return;

  let shouldExtend = false;

  if (triggerType === 'BID_RECEIVED') {
    // Check if any bid was placed in the trigger window
    const recentBid = await prisma.bid.findFirst({
      where: { rfqId: rfqId, submittedAt: { gte: windowStart } }
    });
    shouldExtend = !!recentBid;
  }
  else if (triggerType === 'ANY_RANK_CHANGE') {
    // Check if any bid changed rankings in window
    const rankEvent = await prisma.auctionEvent.findFirst({
      where: {
        rfqId: rfqId,
        eventType: 'BID_SUBMITTED',
        createdAt: { gte: windowStart }
      }
    });
    shouldExtend = !!rankEvent;
  }
  else if (triggerType === 'L1_RANK_CHANGE') {
    // Check if L1 changed in the window
    const l1ChangeEvent = await prisma.auctionEvent.findFirst({
      where: {
        rfqId: rfqId,
        triggeredBy: 'L1_RANK_CHANGE',
        createdAt: { gte: windowStart }
      }
    });
    shouldExtend = !!l1ChangeEvent;
  }

  if (shouldExtend) {
    await extendAuction(rfq, extensionDurationY, triggerType, io);
  }
}

async function extendAuction(rfq, extensionMinutes, reason, io) {
  const currentClose = new Date(rfq.bidCloseTime);
  const newCloseTime = new Date(currentClose.getTime() + extensionMinutes * 60000);

  // HARD RULE: Never exceed forced close time
  const forcedClose = new Date(rfq.forcedCloseTime);
  const finalCloseTime = newCloseTime > forcedClose ? forcedClose : newCloseTime;

  // Don't extend if already at forced close
  if (currentClose.getTime() >= forcedClose.getTime()) return;

  await prisma.rFQ.update({
    where: { id: rfq.id },
    data: { bidCloseTime: finalCloseTime }
  });

  // Log the extension event
  await prisma.auctionEvent.create({
    data: {
      rfqId: rfq.id,
      eventType: 'TIME_EXTENDED',
      description: `Auction extended by ${extensionMinutes} min due to ${reason}`,
      oldCloseTime: currentClose,
      newCloseTime: finalCloseTime,
      triggeredBy: reason
    }
  });

  // Broadcast to all connected clients
  if (io) {
    io.to(rfq.id).emit('auction:time-extended', {
      rfqId: rfq.id,
      oldCloseTime: currentClose,
      newCloseTime: finalCloseTime,
      reason,
      extensionMinutes
    });
  }
}

module.exports = { checkAndExtendAuction };
