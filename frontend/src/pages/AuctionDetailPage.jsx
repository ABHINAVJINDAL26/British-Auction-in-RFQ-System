import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import useAuctionStore from '../store/auctionStore';
import { useAuctionSocket } from '../hooks/useAuctionSocket';
import CountdownTimer from '../components/auction/CountdownTimer';
import { Trophy, Clock, Activity, ArrowLeft, Send } from 'lucide-react';

const AuctionDetailPage = () => {
  const { id } = useParams();
  const { currentRfq, setCurrentRfq, events, bids, user, logout } = useAuctionStore();
  const [showBidForm, setShowBidForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useAuctionSocket(id);

  useEffect(() => {
    const fetchRfq = async () => {
      try {
        const res = await api.get(`/rfqs/${id}`);
        setCurrentRfq(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRfq();
  }, [id, setCurrentRfq]);

  if (loading || !currentRfq) return <div className="p-8 text-center text-text-muted">Loading auction data...</div>;

  return (
    <div className="p-8 min-h-screen bg-bg-primary text-text-primary animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <Link to="/" className="flex items-center text-text-muted hover:text-accent-blue transition-all duration-300 font-bold group">
          <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center mr-3 group-hover:bg-accent-blue/10 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </div>
          Dashboard
        </Link>
        <div className="flex items-center gap-6">
           <div className="text-right">
              <p className="text-white font-bold leading-none mb-1">{user?.name}</p>
              <p className="text-text-muted text-[10px] uppercase font-black tracking-widest">{user?.role} • {user?.company}</p>
           </div>
           <button 
            onClick={logout} 
            className="bg-bg-elevated hover:bg-bg-primary border border-white/5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:border-accent-red/30 hover:text-accent-red transition-all duration-300 active:scale-95"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Panel - Rankings */}
        <div className="col-span-12 lg:col-span-7 bg-bg-card border border-border-color rounded-xl overflow-hidden self-start">
          <div className="px-6 py-4 border-b border-border-color bg-bg-elevated flex justify-between items-center">
             <h2 className="text-xl font-bold flex items-center">
               <Trophy className="w-5 h-5 mr-2 text-accent-green" /> Live Rankings
             </h2>
             <span className="text-xs text-text-muted font-mono uppercase tracking-widest">
                Real-time Sync Active
             </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-bg-primary/50 text-text-muted text-xs uppercase font-bold tracking-wider">
                <tr>
                   <th className="px-6 py-3">Rank</th>
                   <th className="px-6 py-3">Carrier</th>
                   <th className="px-6 py-3">Charges (Landed)</th>
                   <th className="px-6 py-3">Transit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color">
                {bids.map((bid, index) => (
                   <tr key={bid.id} className={`${index === 0 ? 'bg-accent-green/10 border-l-4 border-l-accent-green' : ''} hover:bg-bg-elevated/50 transition-colors animate-slide-right`} style={{ animationDelay: `${index * 50}ms` }}>
                      <td className="px-6 py-4 font-mono font-bold text-lg flex items-center">
                        {index === 0 ? (
                          <>
                            <span className="mr-2">🥇</span>
                            <span className="text-accent-green">L1</span>
                          </>
                        ) : index === 1 ? '🥈 L2' : index === 2 ? '🥉 L3' : `L${index + 1}`}
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        {bid.carrierName || bid.supplier?.company || 'Supplier'}
                        {bid.supplierId === user?.id && <span className="ml-2 text-[10px] bg-accent-blue/20 text-accent-blue px-2 py-0.5 rounded uppercase font-black">You</span>}
                      </td>
                      <td className={`px-6 py-4 font-mono font-bold ${index === 0 ? 'text-accent-green' : 'text-text-primary'}`}>
                        ₹{new Intl.NumberFormat('en-IN').format(bid.totalCharges)}
                      </td>
                      <td className="px-6 py-4 text-text-muted">{bid.transitTime} days</td>
                   </tr>
                ))}
                {bids.length === 0 && (
                   <tr>
                     <td colSpan="4" className="px-6 py-20 text-center text-text-muted italic">
                        No bids received yet.
                     </td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Center Panel - Control Center */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
           <div className="bg-bg-card border border-border-color rounded-xl p-8 flex flex-col items-center text-center">
              <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-4 bg-opacity-20 ${
                currentRfq.status === 'ACTIVE' ? 'bg-accent-green text-accent-green' : 'bg-accent-red text-accent-red'
              }`}>
                {currentRfq.status}
              </span>
              <h1 className="text-2xl font-bold mb-2">{currentRfq.name}</h1>
              <p className="text-text-muted mb-8 text-sm">Ref: {currentRfq.referenceId}</p>
              
              <div className="mb-10 w-full">
                 <p className="text-text-muted text-sm uppercase font-black tracking-widest mb-2 flex items-center justify-center">
                   <Clock className="w-4 h-4 mr-2" /> Closes In
                 </p>
                 <CountdownTimer targetDate={currentRfq.bidCloseTime} />
              </div>

              <div className="w-full bg-bg-elevated h-2 rounded-full mb-2 overflow-hidden relative border border-white/5">
                 <div 
                  className={`absolute left-0 top-0 h-full transition-all duration-1000 ${
                    (() => {
                      const totalTerm = new Date(currentRfq.forcedCloseTime) - new Date(currentRfq.bidStartTime);
                      const elapsed = new Date() - new Date(currentRfq.bidStartTime);
                      const pct = Math.min(100, Math.max(0, (elapsed / totalTerm) * 100));
                      return pct > 90 ? 'bg-accent-red shadow-[0_0_10px_rgba(239,68,68,0.5)]' : pct > 70 ? 'bg-accent-amber' : 'bg-accent-blue';
                    })()
                  }`} 
                  style={{ 
                    width: `${Math.min(100, Math.max(0, ((new Date() - new Date(currentRfq.bidStartTime)) / (new Date(currentRfq.forcedCloseTime) - new Date(currentRfq.bidStartTime))) * 100))}%` 
                  }}
                ></div>
              </div>
              <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-10 w-full text-left flex justify-between px-1">
                <span>Hard Cap: {new Date(currentRfq.forcedCloseTime).toLocaleTimeString()}</span>
                <span className="text-accent-blue italic tracking-normal">
                  {(() => {
                    const diff = new Date(currentRfq.forcedCloseTime) - new Date();
                    if (diff <= 0) return 'HARD CAP REACHED';
                    const mins = Math.floor(diff / 60000);
                    return `${mins} min to Forced Close`;
                  })()}
                </span>
              </p>

              <button 
                onClick={() => setShowBidForm(true)}
                disabled={currentRfq.status !== 'ACTIVE' || user?.role !== 'SUPPLIER'}
                className="w-full py-4 bg-accent-blue hover:bg-opacity-90 disabled:bg-text-muted disabled:bg-opacity-20 text-white rounded-lg font-bold text-lg transition-all flex items-center justify-center group"
              >
                <Send className="w-5 h-5 mr-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> 
                {user?.role === 'SUPPLIER' ? 'Submit New Bid' : 'Bidding Restricted to Suppliers'}
              </button>
           </div>

           {/* Activity Log */}
           <div className="bg-bg-card border border-border-color rounded-xl flex flex-col flex-1 overflow-hidden">
              <div className="px-6 py-4 border-b border-border-color bg-bg-elevated">
                 <h3 className="font-bold flex items-center"><Activity className="w-4 h-4 mr-2 text-accent-amber" /> Live Activity Feed</h3>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[400px] p-6 space-y-4 font-sans text-sm">
                 {events.map((event) => (
                    <div key={event.id} className="flex gap-4 items-start animate-fade-in group">
                       <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                         event.eventType === 'BID_SUBMITTED' ? 'bg-accent-green' : 
                         event.eventType === 'TIME_EXTENDED' ? 'bg-accent-amber' : 'bg-accent-blue'
                       }`} />
                       <div>
                          <p className="text-text-primary group-hover:text-white transition-colors">{event.description}</p>
                          <span className="text-[10px] text-text-muted font-mono uppercase">{new Date(event.createdAt).toLocaleTimeString()}</span>
                       </div>
                    </div>
                 ))}
                 {events.length === 0 && (
                   <p className="text-center text-text-muted py-8 italic">No events recorded yet.</p>
                 )}
              </div>
           </div>
        </div>
      </div>

       {showBidForm && (
        <BidSubmitModal 
          rfqId={id} 
          onClose={() => setShowBidForm(false)} 
          onSuccess={() => {
            setShowBidForm(false);
          }}
        />
      )}
    </div>
  );
};

const BidSubmitModal = ({ rfqId, onClose, onSuccess }) => {
  const { user } = useAuctionStore();
  const [formData, setFormData] = useState({
     carrierName: user?.carrierName || user?.company || '',
     freightCharges: '',
     originCharges: '',
     destinationCharges: '',
     transitTime: '',
     quoteValidity: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
     notes: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/rfqs/${rfqId}/bids`, formData);
      onSuccess();
    } catch (err) {
      alert('Error submitting bid: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="fixed inset-0 bg-bg-primary/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
       <div className="bg-bg-card border border-white/5 rounded-2xl w-full max-w-lg p-8 shadow-2xl animate-fade-in">
          <h2 className="text-2xl font-bold mb-6 flex items-center font-syne">
            <Send className="w-6 h-6 mr-3 text-accent-blue" /> Submit Your Bid
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
             <div>
                <label className="block text-[10px] uppercase font-black text-text-muted tracking-widest mb-1">Carrier Name</label>
                <input required className="w-full bg-bg-elevated border border-border-color rounded-lg px-4 py-3 focus:border-accent-blue transition-all outline-none text-white font-bold" 
                  value={formData.carrierName} onChange={e => setFormData({...formData, carrierName: e.target.value})} placeholder="e.g. Evergreen Marine" />
             </div>
             <div className="grid grid-cols-3 gap-4">
                <div>
                   <label className="block text-[10px] uppercase font-black text-text-muted tracking-widest mb-1">Freight</label>
                   <input required type="number" className="w-full bg-bg-elevated border border-border-color rounded-lg px-4 py-2.5 focus:border-accent-blue transition-all outline-none text-white font-mono" 
                    value={formData.freightCharges} onChange={e => setFormData({...formData, freightCharges: e.target.value})} placeholder="₹" />
                </div>
                <div>
                   <label className="block text-[10px] uppercase font-black text-text-muted tracking-widest mb-1">Origin</label>
                   <input type="number" className="w-full bg-bg-elevated border border-border-color rounded-lg px-4 py-2.5 focus:border-accent-blue transition-all outline-none text-white font-mono" 
                    value={formData.originCharges} onChange={e => setFormData({...formData, originCharges: e.target.value})} placeholder="₹" />
                </div>
                <div>
                   <label className="block text-[10px] uppercase font-black text-text-muted tracking-widest mb-1">Dest.</label>
                   <input type="number" className="w-full bg-bg-elevated border border-border-color rounded-lg px-4 py-2.5 focus:border-accent-blue transition-all outline-none text-white font-mono" 
                    value={formData.destinationCharges} onChange={e => setFormData({...formData, destinationCharges: e.target.value})} placeholder="₹" />
                </div>
             </div>

             <div className="p-4 bg-bg-elevated/50 rounded-xl border border-accent-blue/20 flex justify-between items-center mb-6">
                <span className="text-sm font-bold opacity-60">Total Landed Cost</span>
                <span className="text-2xl font-mono font-black text-accent-blue">
                   ₹{((parseFloat(formData.freightCharges) || 0) + (parseFloat(formData.originCharges) || 0) + (parseFloat(formData.destinationCharges) || 0)).toLocaleString()}
                </span>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-[10px] uppercase font-black text-text-muted tracking-widest mb-1">Transit (Days)</label>
                   <input required type="number" className="w-full bg-bg-elevated border border-border-color rounded-lg px-4 py-2.5 focus:border-accent-blue transition-all outline-none text-white font-bold" 
                    value={formData.transitTime} onChange={e => setFormData({...formData, transitTime: e.target.value})} />
                </div>
                <div>
                   <label className="block text-[10px] uppercase font-black text-text-muted tracking-widest mb-1">Validity</label>
                   <input required type="date" className="w-full bg-bg-elevated border border-border-color rounded-lg px-4 py-2.5 focus:border-accent-blue transition-all outline-none text-white font-bold" 
                    value={formData.quoteValidity} onChange={e => setFormData({...formData, quoteValidity: e.target.value})} />
                </div>
             </div>

             <div className="flex gap-4 pt-6">
                <button type="button" onClick={onClose} className="flex-1 py-3 text-text-muted hover:text-white font-bold transition-all active:scale-95">Cancel</button>
                <button type="submit" className="flex-[2] py-4 bg-accent-blue hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-accent-blue/20 hover:shadow-accent-blue/40 transition-all hover:-translate-y-0.5 active:scale-95">
                   Confirm and Submit Bid
                </button>
             </div>
          </form>
       </div>
    </div>
  );
};

export default AuctionDetailPage;
