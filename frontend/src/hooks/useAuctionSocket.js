import { useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';
import useAuctionStore from '../store/auctionStore';

// Maintain a single STOMP client instance per rfqId, never deactivate while on page
let activeClient = null;
let activeRfqId = null;

export function useAuctionSocket(rfqId) {
  const subscriptionRefs = useRef([]);
  const isSetup = useRef(false);

  const setupSubscriptions = useCallback(() => {
    if (!activeClient || !activeClient.connected) return;

    // Unsubscribe previous subscriptions first
    subscriptionRefs.current.forEach(sub => { try { sub.unsubscribe(); } catch(e) {} });
    subscriptionRefs.current = [];

    const store = useAuctionStore.getState();

    // ── Bid Events ─────────────────────────────────────────────────────────
    const bidSub = activeClient.subscribe(`/topic/auction/${rfqId}/bid`, (msg) => {
      const payload = JSON.parse(msg.body);
      const bid = payload.bid;
      useAuctionStore.getState().addBid(bid);
      useAuctionStore.getState().addEvent({
        id: bid.id + '_event' || Math.random().toString(),
        eventType: 'BID_SUBMITTED',
        description: `New bid submitted: ₹${new Intl.NumberFormat('en-IN').format(bid.totalCharges)}`,
        createdAt: new Date().toISOString()
      });
    });
    subscriptionRefs.current.push(bidSub);

    // ── Time Extension Events ───────────────────────────────────────────────
    const timeSub = activeClient.subscribe(`/topic/auction/${rfqId}/time`, (msg) => {
      const payload = JSON.parse(msg.body);
      useAuctionStore.getState().extendTime(payload.newCloseTime);
      useAuctionStore.getState().addEvent({
        id: Math.random().toString(),
        eventType: 'TIME_EXTENDED',
        description: `Auction extended by ${payload.extensionMinutes}m due to ${payload.reason}`,
        oldCloseTime: payload.oldCloseTime,
        newCloseTime: payload.newCloseTime,
        triggeredBy: payload.reason,
        createdAt: new Date().toISOString()
      });
    });
    subscriptionRefs.current.push(timeSub);

    // ── Status Change Events ────────────────────────────────────────────────
    const statusSub = activeClient.subscribe(`/topic/auction/${rfqId}/status`, (msg) => {
      const payload = JSON.parse(msg.body);
      useAuctionStore.getState().setStatus(payload.status);
      useAuctionStore.getState().addEvent({
        id: Math.random().toString(),
        eventType: 'STATUS_CHANGED',
        description: `Auction status changed to ${payload.status}`,
        createdAt: new Date().toISOString()
      });
    });
    subscriptionRefs.current.push(statusSub);

    // ── Auction Result (Winner Card) ────────────────────────────────────────
    const resultSub = activeClient.subscribe(`/topic/auction/${rfqId}/result`, (msg) => {
      const payload = JSON.parse(msg.body);
      useAuctionStore.getState().setAuctionResult(payload);
    });
    subscriptionRefs.current.push(resultSub);

    isSetup.current = true;
    console.log('[WS] Subscribed to rfq:', rfqId);
  }, [rfqId]);

  useEffect(() => {
    if (!rfqId) return;

    // If already connected to same rfqId, just re-subscribe
    if (activeClient && activeClient.connected && activeRfqId === rfqId) {
      setupSubscriptions();
      return;
    }

    // Tear down old client if switching rfq
    if (activeClient && activeRfqId !== rfqId) {
      try { activeClient.deactivate(); } catch(e) {}
      activeClient = null;
    }

    activeRfqId = rfqId;
    const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL?.trim();
    const isDev = import.meta.env.DEV;
    const SOCKET_URL = (configuredSocketUrl || (isDev ? 'http://localhost:8082' : window.location.origin)).replace(/\/$/, '');

    const client = new Client({
      webSocketFactory: () => new SockJS(`${SOCKET_URL}/ws`),
      reconnectDelay: 3000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('[WS] Connected');
        setupSubscriptions();
      },
      onDisconnect: () => {
        console.log('[WS] Disconnected');
        isSetup.current = false;
      },
      onStompError: (frame) => {
        console.error('[WS] STOMP error', frame);
      },
    });

    activeClient = client;
    client.activate();

    // Cleanup: only unsubscribe topics, keep client alive for reconnects
    return () => {
      subscriptionRefs.current.forEach(sub => { try { sub.unsubscribe(); } catch(e) {} });
      subscriptionRefs.current = [];
      isSetup.current = false;
    };
  }, [rfqId, setupSubscriptions]);
}
