import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import useAuctionStore from '../store/auctionStore';
import { User, Mail, Lock, Building2 } from 'lucide-react';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'SUPPLIER',
    company: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuctionStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/signup', formData);
      setAuth(res.data.user, res.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false); // Set loading to false after request completes
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-bg-card border border-border-color rounded-2xl shadow-2xl p-6 md:p-10 animate-fade-in">
        <h1 className="text-3xl font-bold font-syne mb-2 text-center">Create Account</h1>
        <p className="text-text-muted text-center mb-8">Join the British Auction Network</p>
        
        {error && <div className="bg-accent-red/10 border border-accent-red/20 text-accent-red p-3 rounded mb-6 text-sm text-center">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-5">
           <div className="flex bg-bg-elevated p-1 rounded-lg border border-border-color mb-6">
              <button 
                type="button"
                onClick={() => setFormData({...formData, role: 'SUPPLIER'})}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded ${formData.role === 'SUPPLIER' ? 'bg-accent-blue text-white shadow-lg' : 'text-text-muted'}`}
              >
                Supplier
              </button>
              <button 
                type="button"
                onClick={() => setFormData({...formData, role: 'BUYER'})}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded ${formData.role === 'BUYER' ? 'bg-accent-blue text-white shadow-lg' : 'text-text-muted'}`}
              >
                Buyer
              </button>
           </div>

          <div>
            <label className="block text-[10px] uppercase font-black text-text-muted tracking-widest mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-bg-elevated border border-border-color rounded-lg px-11 py-2.5 focus:border-accent-blue outline-none text-white transition-all" 
                placeholder={formData.role === 'BUYER' ? "e.g. Aditi Gupta (Procurement Lead)" : "e.g. Vikram Singh (Sales Director)"} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-black text-text-muted tracking-widest mb-1">Work Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input required type="email" autoComplete="username" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-bg-elevated border border-border-color rounded-lg px-11 py-2.5 focus:border-accent-blue outline-none text-white transition-all" 
                placeholder={formData.role === 'BUYER' ? "aditi@tata-motors.com" : "vikram@maersk-logistics.com"} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-black text-text-muted tracking-widest mb-1">Company Name</label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input required value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full bg-bg-elevated border border-border-color rounded-lg px-11 py-2.5 focus:border-accent-blue outline-none text-white transition-all" 
                placeholder={formData.role === 'BUYER' ? "e.g. Tata Motors Ltd." : "e.g. Maersk India Pvt. Ltd."} />
            </div>
          </div>

          {formData.role === 'SUPPLIER' && (
            <div className="animate-fade-in">
              <label className="block text-[10px] uppercase font-black text-text-muted tracking-widest mb-1">Carrier Name (Optional)</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted opacity-50" />
                <input value={formData.carrierName || ''} onChange={e => setFormData({...formData, carrierName: e.target.value})} className="w-full bg-bg-elevated border border-border-color rounded-lg px-11 py-2.5 focus:border-accent-blue outline-none text-white transition-all" 
                  placeholder="e.g. Maersk / MSC / Hapag-Lloyd" />
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-[10px] uppercase font-black text-text-muted tracking-widest mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input required type="password" autoComplete="new-password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-bg-elevated border border-border-color rounded-lg px-11 py-2.5 focus:border-accent-blue outline-none text-white transition-all" placeholder="At least 8 characters" />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-accent-blue hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.2)] active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Sign Up'}
          </button>
        </form>
        
        <p className="mt-8 text-center text-text-muted text-sm">
          Already a member? <Link to="/login" className="text-accent-blue font-bold hover:underline">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
