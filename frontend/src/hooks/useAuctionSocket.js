import { useEffect } from 'react';
import { socket } from '../lib/socket';
import useAuctionStore from '../store/auctionStore';

function formatTriggerReason(reason) {
  if (!reason) return 'Unknown';
  return reason
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

export function useAuctionSocket(rfqId) {
  const { updateBids, addEvent, extendTime, setStatus } = useAuctionStore();

  useEffect(() => {
    if (!rfqId) return;

    // Explicitly connect (since autoConnect: false in socket.js)
    if (!socket.connected) {
      socket.connect();
    }

    const joinAuctionRoom = () => {
      socket.emit('join:auction', { rfqId });
    };

    // Join immediately (if already connected) and re-join on reconnect.
    joinAuctionRoom();
    socket.on('connect', joinAuctionRoom);

    socket.on('bid:new', ({ bid, l1Changed }) => {
      useAuctionStore.getState().addBid(bid);
      addEvent({
        id: bid.id || Math.random().toString(),
        eventType: 'BID_SUBMITTED',
        actor: bid.supplier,
        description: `New bid submitted: ₹${new Intl.NumberFormat('en-IN').format(bid.totalCharges)}`,
        createdAt: new Date().toISOString()
      });
    });

    socket.on('auction:time-extended', ({ oldCloseTime, newCloseTime, reason, extensionMinutes }) => {
      extendTime(newCloseTime);
      addEvent({
        id: Math.random().toString(),
        eventType: 'TIME_EXTENDED',
        description: `Auction extended +${extensionMinutes} min`,
        reason: formatTriggerReason(reason),
        oldCloseTime,
        newCloseTime,
        createdAt: new Date().toISOString()
      });
    });

    socket.on('auction:status-changed', ({ status }) => {
      setStatus(status);
      addEvent({
        id: Math.random().toString(),
        eventType: 'STATUS_CHANGED',
        description: `Auction status: ${status}`,
        createdAt: new Date().toISOString()
      });
    });

    return () => {
      socket.off('bid:new');
      socket.off('auction:time-extended');
      socket.off('auction:status-changed');
      socket.off('connect', joinAuctionRoom);
    };
  }, [rfqId, updateBids, addEvent, extendTime, setStatus]);
}
