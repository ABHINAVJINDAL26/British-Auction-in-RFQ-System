import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import useAuctionStore from '../store/auctionStore';
import { Lock, Mail } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const setAuth = useAuctionStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { email, password });
      setAuth(res.data.user, res.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
      <div className="bg-bg-card border border-border-color p-8 rounded-xl w-full max-w-md shadow-2xl">
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
                type="password" 
                required 
                className="w-full bg-bg-elevated border border-border-color rounded-lg px-11 py-3 focus:border-accent-blue outline-none text-white transition-all"
                placeholder="Enter your security password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          
          <button type="submit" className="w-full py-4 bg-accent-blue text-white rounded-lg font-bold shadow-lg shadow-accent-blue/20 hover:shadow-accent-blue/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300">
            Login to Workspace
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
