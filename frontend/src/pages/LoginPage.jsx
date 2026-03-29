import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import useAuctionStore from '../store/auctionStore';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuctionStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      setAuth(res.data.user, res.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };
   

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-bg-card border border-border-color rounded-2xl shadow-2xl p-6 md:p-10 animate-fade-in">
        <h1 className="text-3xl font-bold font-syne mb-2 text-center">Welcome Back</h1>
        <p className="text-text-muted text-center mb-8">Access the British Auction Control Center</p>
        
        {error && <div className="bg-accent-red/10 border border-accent-red/20 text-accent-red p-3 rounded mb-6 text-sm text-center">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase font-black text-text-muted tracking-widest mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input 
                type="email" 
                required 
                autoComplete="username"
                className="w-full bg-bg-elevated border border-border-color rounded-lg px-11 py-3 focus:border-accent-blue outline-none text-white transition-all"
                placeholder="e.g. john@logistics.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-[10px] uppercase font-black text-text-muted tracking-widest mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input 
                type={showPassword ? 'text' : 'password'} 
                required 
                autoComplete="current-password"
                className="w-full bg-bg-elevated border border-border-color rounded-lg pl-11 pr-12 py-3 focus:border-accent-blue outline-none text-white transition-all"
                placeholder="Enter your security password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-muted hover:text-white rounded-md hover:bg-white/10 transition-all"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-accent-blue text-white rounded-lg font-bold shadow-lg shadow-accent-blue/20 hover:shadow-accent-blue/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Login to Workspace'}
          </button>
        </form>
        
        <p className="mt-8 text-center text-text-muted text-sm">
          Don't have an account? <Link to="/signup" className="text-accent-blue font-bold hover:underline">Sign up for free</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
