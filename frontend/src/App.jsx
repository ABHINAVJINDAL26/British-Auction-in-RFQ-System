import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAuctionStore from './store/auctionStore';
import AuctionListPage from './pages/AuctionListPage';
import AuctionDetailPage from './pages/AuctionDetailPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

const ProtectedRoute = ({ children }) => {
  const token = useAuctionStore((state) => state.token);
  if (!token) return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-bg-primary text-text-primary font-sans">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/" element={<ProtectedRoute><AuctionListPage /></ProtectedRoute>} />
          <Route path="/auctions/:id" element={<ProtectedRoute><AuctionDetailPage /></ProtectedRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
