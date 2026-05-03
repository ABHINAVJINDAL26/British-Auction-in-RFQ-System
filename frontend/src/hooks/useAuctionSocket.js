import { useEffect, useRef } from 'react';
import { stompClient } from '../lib/socket';
import useAuctionStore from '../store/auctionStore';

export function useAuctionSocket(rfqId) {
  const { updateBids, addEvent, extendTime, setStatus } = useAuctionStore();
  const subscriptionRefs = useRef([]);

  useEffect(() => {
    if (!rfqId) return;

    const onConnect = () => {
      // Subscribe to Bid Events
      const bidSub = stompClient.subscribe(`/topic/auction/${rfqId}/bid`, (message) => {
        const payload = JSON.parse(message.body);
        const bid = payload.bid;
        useAuctionStore.getState().addBid(bid);
        
        addEvent({
          id: bid.id || Math.random().toString(),
          eventType: 'BID_SUBMITTED',
          actor: bid.supplier,
          description: `New bid submitted: ₹${new Intl.NumberFormat('en-IN').format(bid.totalCharges)}`,
          createdAt: new Date().toISOString()
        });
      });
      subscriptionRefs.current.push(bidSub);

      // Subscribe to Time Extension Events
      const timeSub = stompClient.subscribe(`/topic/auction/${rfqId}/time`, (message) => {
        const payload = JSON.parse(message.body);
        extendTime(payload.newCloseTime);
        
        addEvent({
          id: Math.random().toString(),
          eventType: 'TIME_EXTENDED',
          description: `Extended by ${payload.extensionMinutes}m (${payload.reason})`,
          createdAt: new Date().toISOString()
        });
      });
      subscriptionRefs.current.push(timeSub);

      // Subscribe to Status Change Events
      const statusSub = stompClient.subscribe(`/topic/auction/${rfqId}/status`, (message) => {
        const payload = JSON.parse(message.body);
        setStatus(payload.status);
        
        addEvent({
          id: Math.random().toString(),
          eventType: 'STATUS_CHANGED',
          description: `Auction status: ${payload.status}`,
          createdAt: new Date().toISOString()
        });
      });
      subscriptionRefs.current.push(statusSub);
    };

    if (!stompClient.active) {
      stompClient.onConnect = onConnect;
      stompClient.activate();
    } else {
      onConnect();
    }

    return () => {
      // Unsubscribe on cleanup
      subscriptionRefs.current.forEach(sub => sub.unsubscribe());
      subscriptionRefs.current = [];
      
      // If no more subscriptions exist globally, we could deactivate, 
      // but typically STOMP client stays active or we deactivate it if leaving auction pages entirely.
      stompClient.deactivate();
    };
  }, [rfqId, updateBids, addEvent, extendTime, setStatus]);
}
