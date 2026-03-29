import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAuctionStore from './store/auctionStore';
import AuctionListPage from './pages/AuctionListPage';
import AuctionDetailPage from './pages/AuctionDetailPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import api from './lib/api';

const ProtectedRoute = ({ children }) => {
  const token = useAuctionStore((state) => state.token);
  if (!token) return <Navigate to="/login" />;
  return children;
};

function App() {
  const { token, setAuth, logout } = useAuctionStore();

  // On every app load, re-verify role from server to prevent stale token issues
  useEffect(() => {
    if (!token) return;
    api.get('/auth/me')
      .then(res => {
        // Always sync user from server — this is the ground truth.
        setAuth(res.data, token);
      })
      .catch(() => {
        // Token invalid/expired — force logout
        logout();
      });
  }, [token, setAuth, logout]);

  return (
    <Router>
      <div className="min-h-screen bg-bg-primary text-text-primary font-sans">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/" element={<ProtectedRoute><AuctionListPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/auctions/:id" element={<ProtectedRoute><AuctionDetailPage /></ProtectedRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
