import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import useAuctionStore from '../store/auctionStore';
import CountdownTimer from '../components/auction/CountdownTimer';

const AuctionListPage = () => {
  const { rfqs, setRfqs } = useAuctionStore();

  const [showCreateModal, setShowCreateModal] = React.useState(false);

  const { user, logout } = useAuctionStore();

  useEffect(() => {
    const fetchRfqs = async () => {
      try {
        const res = await api.get('/rfqs');
        setRfqs(res.data);
      } catch (err) {
        if (err.response?.status === 401) logout();
        console.error(err);
      }
    };
    fetchRfqs();
  }, [setRfqs, logout]);

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    // Re-fetch list
    api.get('/rfqs').then(res => setRfqs(res.data));
  };

  return (
    <div className="container py-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
            {user?.role === 'BUYER' ? 'Buyer Control Center' : 'Supplier Marketplace'}
          </h1>
          <p className="text-text-muted font-sans text-xs flex items-center gap-2 mt-1">
            Logged in as <span className="text-accent-blue font-bold tracking-tight">{user?.name}</span>
            <span className="bg-bg-elevated px-2 py-0.5 rounded text-[10px] border border-white/5 font-black uppercase text-accent-green">
              {user?.role}
            </span> 
            at <span className="text-white italic">{user?.company}</span>
          </p>
        </div>
        <div className="flex gap-4 items-center w-full md:w-auto">
          <button 
            onClick={logout} 
            className="text-text-muted hover:text-white transition-all duration-300 text-xs font-bold uppercase tracking-wider hover:bg-white/5 px-4 py-2 rounded-lg active:scale-95"
          >
            Logout
          </button>
          {user?.role === 'BUYER' && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex-1 md:flex-none justify-center bg-accent-blue hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold transition-all duration-300 shadow-lg shadow-accent-blue/20 hover:shadow-accent-blue/40 hover:-translate-y-0.5 active:scale-95 flex items-center text-sm md:text-base"
            >
              <span className="mr-2 text-xl leading-none">+</span>
              Create RFQ
            </button>
          )}
        </div>
      </header>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-bg-card border border-border-color rounded-xl overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-bg-elevated text-text-muted text-[10px] uppercase tracking-widest font-black">
            <tr>
              <th className="px-6 py-4">RFQ Details</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Bid Close</th>
              <th className="px-6 py-4">L1 Price</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-color">
            {rfqs.map((rfq) => (
              <tr key={rfq.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-6 py-5">
                  <div className="font-bold text-text-primary group-hover:text-accent-blue transition-colors font-syne text-lg">
                    {rfq.name}
                  </div>
                  <div className="text-[10px] text-text-muted font-mono uppercase tracking-widest">{rfq.referenceId}</div>
                </td>
                <td className="px-6 py-5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border border-white/5 ${
                    rfq.status === 'ACTIVE' ? 'bg-accent-green/10 text-accent-green border-accent-green/20' :
                    rfq.status === 'CLOSED' || rfq.status === 'FORCE_CLOSED' ? 'bg-text-muted/10 text-text-muted' :
                    'bg-accent-red/10 text-accent-red'
                  }`}>
                    {rfq.status}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="text-sm font-mono flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${rfq.status === 'ACTIVE' ? 'bg-accent-amber animate-pulse' : 'bg-text-muted'}`} />
                    {rfq.status === 'ACTIVE' ? (
                      <span className="text-accent-amber font-bold">
                         {new Date(rfq.bidCloseTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="text-text-muted opacity-60">
                         {new Date(rfq.bidCloseTime).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-5 text-accent-green font-mono font-bold text-xl">
                  {rfq.bids && rfq.bids.length > 0 
                    ? `₹${new Intl.NumberFormat('en-IN').format(Math.min(...rfq.bids.map(b => b.totalCharges)))}`
                    : '—'}
                </td>
                <td className="px-6 py-5 text-right">
                  <Link 
                    to={`/auctions/${rfq.id}`}
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-bg-elevated hover:bg-accent-blue hover:text-white transition-all duration-300 font-bold text-xs uppercase tracking-widest border border-white/5"
                  >
                    Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {rfqs.map((rfq) => (
          <div key={rfq.id} className="bg-bg-card border border-border-color rounded-xl p-6 shadow-xl relative overflow-hidden group active:scale-[0.98] transition-all">
            <div className="flex justify-between items-start mb-4">
               <div>
                  <h3 className="font-bold text-xl font-syne text-text-primary group-hover:text-accent-blue transition-colors leading-tight mb-1">
                    {rfq.name}
                  </h3>
                  <p className="text-[10px] text-text-muted font-mono uppercase tracking-widest">{rfq.referenceId}</p>
               </div>
               <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border border-white/5 ${
                  rfq.status === 'ACTIVE' ? 'bg-accent-green/10 text-accent-green border-accent-green/20' :
                  rfq.status === 'CLOSED' || rfq.status === 'FORCE_CLOSED' ? 'bg-text-muted/10 text-text-muted' :
                  'bg-accent-red/10 text-accent-red'
               }`}>
                  {rfq.status}
               </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
               <div className="bg-bg-elevated/50 p-3 rounded-lg border border-white/5">
                  <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1">L1 Price</p>
                  <p className="text-xl font-mono font-bold text-accent-green">
                    {rfq.bids && rfq.bids.length > 0 
                      ? `₹${new Intl.NumberFormat('en-IN').format(Math.min(...rfq.bids.map(b => b.totalCharges)))}`
                      : '—'}
                  </p>
               </div>
               <div className="bg-bg-elevated/50 p-3 rounded-lg border border-white/5">
                  <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1">Closing</p>
                  <p className="text-sm font-mono font-bold text-accent-amber">
                    {new Date(rfq.bidCloseTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
               </div>
            </div>

            <Link 
              to={`/auctions/${rfq.id}`}
              className="flex items-center justify-center w-full py-4 rounded-xl bg-accent-blue text-white font-bold uppercase tracking-widest text-sm shadow-lg shadow-accent-blue/20"
            >
              View Auction Center
            </Link>
          </div>
        ))}
      </div>

      {rfqs.length === 0 && (
        <div className="py-20 text-center text-text-muted italic bg-bg-card border border-border-color rounded-xl border-dashed">
          No auctions found. Create one to get started!
        </div>
      )}

      {showCreateModal && <CreateRfqModal onClose={() => setShowCreateModal(false)} onSuccess={handleCreateSuccess} />}
    </div>
  );
};

const CreateRfqModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = React.useState({
    name: '',
    referenceId: `RFQ-${Date.now()}`,
    pickupDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    bidCloseTime: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    forcedCloseTime: new Date(Date.now() + 7200000).toISOString().slice(0, 16),
    triggerWindowX: 10,
    extensionDurationY: 5,
    triggerType: 'L1_RANK_CHANGE'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/rfqs', {
        ...formData,
        bidStartTime: new Date().toISOString(),
        auctionConfig: {
          triggerWindowX: parseInt(formData.triggerWindowX),
          extensionDurationY: parseInt(formData.extensionDurationY),
          triggerType: formData.triggerType
        }
      });
      onSuccess();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="fixed inset-0 bg-bg-primary/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
       <div className="bg-bg-card border border-border-color rounded-xl w-full max-w-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold mb-6 font-syne">Create New Auction RFQ</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
             <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                   <label className="block text-[10px] uppercase font-black text-text-muted tracking-widest mb-2">Auction Title</label>
                   <input required className="w-full bg-bg-elevated border border-border-color rounded px-4 py-3 focus:border-accent-blue outline-none text-white font-bold" 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Export Shipment from Nhava Sheva" />
                </div>
                <div>
                   <label className="block text-[10px] uppercase font-black text-text-muted tracking-widest mb-2">Pickup Date</label>
                   <input required type="date" className="w-full bg-bg-elevated border border-border-color rounded px-4 py-3 focus:border-accent-blue outline-none text-white" 
                    value={formData.pickupDate} onChange={e => setFormData({...formData, pickupDate: e.target.value})} />
                </div>
                <div>
                   <label className="block text-[10px] uppercase font-black text-text-muted tracking-widest mb-2">RFQ Ref. ID</label>
                   <input required className="w-full bg-bg-elevated border border-border-color rounded px-4 py-3 focus:border-accent-blue outline-none text-white font-mono" 
                    value={formData.referenceId} onChange={e => setFormData({...formData, referenceId: e.target.value})} />
                </div>
                <div>
                   <label className="block text-[10px] uppercase font-black text-text-muted tracking-widest mb-2">Bidding Close Time</label>
                   <input required type="datetime-local" className="w-full bg-bg-elevated border border-border-color rounded px-4 py-3 focus:border-accent-blue outline-none text-white" 
                    value={formData.bidCloseTime} onChange={e => setFormData({...formData, bidCloseTime: e.target.value})} />
                </div>
                <div>
                   <label className="block text-[10px] uppercase font-black text-text-muted tracking-widest mb-2">Hard Cap (Forced Close)</label>
                   <input required type="datetime-local" className="w-full bg-bg-elevated border border-border-color rounded px-4 py-3 focus:border-accent-blue outline-none text-white" 
                    value={formData.forcedCloseTime} onChange={e => setFormData({...formData, forcedCloseTime: e.target.value})} />
                </div>
             </div>

             <div className="bg-bg-elevated/50 p-6 rounded-lg border border-border-color">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-accent-blue">Auction Extension Configuration</h3>
                <div className="grid grid-cols-3 gap-4">
                   <div>
                      <label className="block text-[9px] uppercase font-bold text-text-muted mb-1">Trigger Window (Mins)</label>
                      <input type="number" className="w-full bg-bg-card border border-border-color rounded px-3 py-2 text-white" 
                        value={formData.triggerWindowX} onChange={e => setFormData({...formData, triggerWindowX: e.target.value})} />
                   </div>
                   <div>
                      <label className="block text-[9px] uppercase font-bold text-text-muted mb-1">Extension (Mins)</label>
                      <input type="number" className="w-full bg-bg-card border border-border-color rounded px-3 py-2 text-white" 
                        value={formData.extensionDurationY} onChange={e => setFormData({...formData, extensionDurationY: e.target.value})} />
                   </div>
                   <div>
                      <label className="block text-[9px] uppercase font-bold text-text-muted mb-1">Trigger Event</label>
                      <select className="w-full bg-bg-card border border-border-color rounded px-3 py-2 text-white text-xs"
                        value={formData.triggerType} onChange={e => setFormData({...formData, triggerType: e.target.value})}>
                         <option value="L1_RANK_CHANGE">L1 Rank Change</option>
                         <option value="BID_RECEIVED">Any Bid Received</option>
                      </select>
                   </div>
                </div>
             </div>

             <div className="flex gap-4 pt-4">
                <button type="button" onClick={onClose} className="flex-1 py-4 border border-border-color hover:bg-bg-elevated rounded-lg font-bold transition-all text-text-muted">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-accent-blue text-white rounded-lg font-bold hover:shadow-xl hover:shadow-accent-blue/30 transition-all">Launch Auction RFQ</button>
             </div>
          </form>
       </div>
    </div>
  );
};

export default AuctionListPage;
