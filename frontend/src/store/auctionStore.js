import { create } from 'zustand';

const useAuctionStore = create((set) => ({
  user: JSON.parse(sessionStorage.getItem('user') || 'null'),
  token: sessionStorage.getItem('token') || null,
  rfqs: [],
  currentRfq: null,
  events: [],
  bids: [],

  setAuth: (user, token) => {
    sessionStorage.setItem('user', JSON.stringify(user));
    sessionStorage.setItem('token', token);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user, token });
  },
  logout: () => {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, token: null, rfqs: [], currentRfq: null, events: [], bids: [] });
    window.location.href = '/login'; // Force full refresh for clean slate
  },
  
  setRfqs: (rfqs) => set({ rfqs }),
  setCurrentRfq: (rfq) => set({ currentRfq: rfq, bids: rfq?.bids || [], events: rfq?.events || [] }),
  
  updateBids: (newBids) => set({ bids: newBids }),
  addBid: (bid) => set((state) => {
    // 1. Update standalone bids array
    // Filter out any existing bid from the same supplier for the same RFQ to replace it
    const otherBids = state.bids.filter(b => b.supplierId !== bid.supplierId);
    const updatedBids = [...otherBids, bid].sort((a, b) => a.totalCharges - b.totalCharges);
    
    // 2. Also update currentRfq.bids if it exists
    const updatedRfq = state.currentRfq ? {
      ...state.currentRfq,
      bids: updatedBids
    } : null;

    return { bids: updatedBids, currentRfq: updatedRfq };
  }),
  addEvent: (event) => set((state) => ({ events: [event, ...state.events] })),
  
  extendTime: (newCloseTime) => set((state) => {
    if (!state.currentRfq) return state;
    return {
      currentRfq: { ...state.currentRfq, bidCloseTime: newCloseTime }
    };
  }),
  
  setStatus: (status) => set((state) => {
    if (!state.currentRfq) return state;
    return {
      currentRfq: { ...state.currentRfq, status }
    };
  }),
}));

export default useAuctionStore;
