import { create } from 'zustand';

const useAuctionStore = create((set) => ({
  user: JSON.parse(sessionStorage.getItem('user') || 'null'),
  token: sessionStorage.getItem('token') || null,
  rfqs: [],
  currentRfq: null,
  events: [],
  bids: [],
  auctionResult: null, // Winner Card data

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
    set({ user: null, token: null, rfqs: [], currentRfq: null, events: [], bids: [], auctionResult: null });
    window.location.href = '/login';
  },

  setRfqs: (rfqs) => set({ rfqs }),
  setCurrentRfq: (rfq) => set({ currentRfq: rfq, bids: rfq?.bids || [], events: rfq?.events || [] }),

  updateBids: (newBids) => set((state) => ({
    bids: newBids,
    currentRfq: state.currentRfq ? { ...state.currentRfq, bids: newBids } : null
  })),
  addBid: (bid) => set((state) => {
    const sId = bid.supplier?.id || bid.supplierId;
    const otherBids = state.bids.filter(b => {
      const existingId = b.supplier?.id || b.supplierId;
      return existingId !== sId;
    });
    const updatedBids = [...otherBids, bid].sort((a, b) => a.totalCharges - b.totalCharges);
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

  setAuctionResult: (result) => set({ auctionResult: result }),
  clearAuctionResult: () => set({ auctionResult: null }),
}));

export default useAuctionStore;
