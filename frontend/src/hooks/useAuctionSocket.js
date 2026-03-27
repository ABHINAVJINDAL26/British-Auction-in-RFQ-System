import { useEffect } from 'react';
import { socket } from '../lib/socket';
import useAuctionStore from '../store/auctionStore';

export function useAuctionSocket(rfqId) {
  const { updateBids, addEvent, extendTime, setStatus } = useAuctionStore();

  useEffect(() => {
    if (!rfqId) return;

    socket.emit('join:auction', { rfqId });

    socket.on('bid:new', ({ bid, l1Changed }) => {
      // Update the bids list and rankings in real-time
      useAuctionStore.getState().addBid(bid);
      
      addEvent({
        id: bid.id || Math.random().toString(),
        eventType: 'BID_SUBMITTED',
        actor: bid.supplier,
        description: `New bid submitted: ₹${new Intl.NumberFormat('en-IN').format(bid.totalCharges)}`,
        createdAt: new Date().toISOString()
      });
    });

    socket.on('auction:time-extended', ({ newCloseTime, reason, extensionMinutes }) => {
      extendTime(newCloseTime);
      addEvent({
        id: Math.random().toString(),
        eventType: 'TIME_EXTENDED',
        description: `Extended by ${extensionMinutes}m (${reason})`,
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
    };
  }, [rfqId, updateBids, addEvent, extendTime, setStatus]);
}
