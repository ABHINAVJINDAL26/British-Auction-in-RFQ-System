import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import useAuctionStore from '../store/auctionStore';

const ProfilePage = () => {
  const { user, logout, setAuth, token } = useAuctionStore();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    company: '',
    carrierName: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get('/auth/me');
        setProfileData(res.data);
        setEditForm({
          name: res.data.name,
          company: res.data.company || '',
          carrierName: res.data.carrierName || ''
        });
        setError(null);
      } catch (err) {
        console.error('Failed to load profile:', err);
        if (err.response?.status === 401) {
          logout();
          navigate('/login');
        } else {
          setError('Failed to load profile information');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [token, navigate, logout]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveEdit = async () => {
    try {
      // For now, just update local state
      // In a full implementation, you'd have a PUT /auth/me endpoint
      setProfileData(prev => ({
        ...prev,
        ...editForm
      }));
      setIsEditing(false);
      // Optionally update store
      if (user) {
        setAuth({ ...user, ...editForm }, token);
      }
    } catch (err) {
      setError('Failed to update profile');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-text-muted">Loading profile...</div>
      </div>
    );
  }

  if (error && !profileData) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-accent-red">{error}</div>
      </div>
    );
  }

  const isBuyer = profileData?.role === 'BUYER';
  const isSupplier = profileData?.role === 'SUPPLIER';

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="bg-bg-card border-b border-border-color">
        <div className="container mx-auto px-6 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-text-primary font-syne">My Profile</h1>
            <p className="text-text-muted text-sm mt-1">Manage your account information</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/"
              className="px-4 py-2 bg-bg-elevated hover:bg-white/5 text-text-primary rounded-lg font-semibold transition-all duration-300"
            >
              ← Back to Auction
            </Link>
            <button
              onClick={logout}
              className="px-4 py-2 bg-accent-red/10 hover:bg-accent-red/20 text-accent-red rounded-lg font-semibold transition-all duration-300"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        {error && (
          <div className="mb-6 p-4 bg-accent-red/10 border border-accent-red/20 rounded-lg text-accent-red">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Profile Avatar & Status */}
          <div className="lg:col-span-1">
            <div className="bg-bg-card border border-border-color rounded-xl p-8 text-center sticky top-8">
              {/* Avatar */}
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-accent-blue to-accent-green rounded-full flex items-center justify-center mb-6 text-4xl font-bold text-white">
                {profileData?.name?.charAt(0).toUpperCase()}
              </div>

              {/* Role Badge */}
              <div className="inline-block mb-4">
                <span
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest border ${
                    profileData?.role === 'BUYER'
                      ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/20'
                      : 'bg-accent-green/10 text-accent-green border-accent-green/20'
                  }`}
                >
                  {profileData?.role}
                </span>
              </div>

              <h2 className="text-xl font-bold text-text-primary mb-2">{profileData?.name}</h2>
              <p className="text-text-muted text-sm mb-6">{profileData?.email}</p>

              {/* Edit Toggle */}
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="w-full px-4 py-2 bg-accent-blue hover:bg-blue-600 text-white rounded-lg font-semibold transition-all duration-300 mb-4"
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>

              {/* Account Created */}
              <div className="pt-6 border-t border-border-color">
                <p className="text-xs text-text-muted uppercase tracking-widest font-black mb-1">Member Since</p>
                <p className="text-sm text-text-primary font-mono">
                  {new Date(profileData?.createdAt || new Date()).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Profile Details */}
          <div className="lg:col-span-2">
            {/* Account Information */}
            <div className="bg-bg-card border border-border-color rounded-xl p-8 mb-8">
              <h3 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
                <span className="text-2xl">👤</span>
                Account Information
              </h3>

              {!isEditing ? (
                // View Mode
                <div className="space-y-6">
                  <div>
                    <label className="text-xs uppercase tracking-widest text-text-muted font-black">Full Name</label>
                    <p className="text-lg text-text-primary font-semibold mt-2">{profileData?.name}</p>
                  </div>

                  <div>
                    <label className="text-xs uppercase tracking-widest text-text-muted font-black">Email Address</label>
                    <p className="text-lg text-text-primary font-mono mt-2">{profileData?.email}</p>
                  </div>

                  <div>
                    <label className="text-xs uppercase tracking-widest text-text-muted font-black">Role</label>
                    <p className="text-lg text-text-primary mt-2">
                      {profileData?.role === 'BUYER' ? '🏢 Buyer' : '🚚 Supplier'}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs uppercase tracking-widest text-text-muted font-black">Organization</label>
                    <p className="text-lg text-text-primary font-semibold mt-2">
                      {profileData?.company || '—'}
                    </p>
                  </div>

                  {isSupplier && (
                    <div>
                      <label className="text-xs uppercase tracking-widest text-text-muted font-black">Carrier Name</label>
                      <p className="text-lg text-text-primary font-semibold mt-2">
                        {profileData?.carrierName || '—'}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Edit Mode
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-text-muted font-black mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={editForm.name}
                      onChange={handleEditChange}
                      className="w-full px-4 py-3 bg-bg-primary border border-border-color rounded-lg text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-widest text-text-muted font-black mb-2">
                      Organization
                    </label>
                    <input
                      type="text"
                      name="company"
                      value={editForm.company}
                      onChange={handleEditChange}
                      className="w-full px-4 py-3 bg-bg-primary border border-border-color rounded-lg text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
                      placeholder="Your organization"
                    />
                  </div>

                  {isSupplier && (
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-text-muted font-black mb-2">
                        Carrier Name
                      </label>
                      <input
                        type="text"
                        name="carrierName"
                        value={editForm.carrierName}
                        onChange={handleEditChange}
                        className="w-full px-4 py-3 bg-bg-primary border border-border-color rounded-lg text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
                        placeholder="Your carrier name"
                      />
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 px-4 py-3 bg-accent-green hover:bg-green-600 text-white rounded-lg font-bold transition-all duration-300"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 px-4 py-3 bg-border-color hover:bg-white/10 text-text-primary rounded-lg font-bold transition-all duration-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Role-Specific Information */}
            {isBuyer && (
              <div className="bg-accent-blue/5 border border-accent-blue/20 rounded-xl p-8">
                <h3 className="text-xl font-bold text-accent-blue mb-4 flex items-center gap-2">
                  <span className="text-2xl">🏢</span>
                  Buyer Information
                </h3>
                <p className="text-text-muted mb-4">
                  As a buyer, you can create RFQs (Requests for Quotation) and manage auction campaigns for your shipments.
                </p>
                <ul className="space-y-2 text-sm text-text-primary">
                  <li>✓ Create and publish RFQs</li>
                  <li>✓ Set bid deadlines and forced close times</li>
                  <li>✓ Configure extension triggers (L1 Rank Change, Any Bid, etc)</li>
                  <li>✓ View live rankings and bid activity</li>
                  <li>✓ Monitor auction timeline and events</li>
                </ul>
              </div>
            )}

            {isSupplier && (
              <div className="bg-accent-green/5 border border-accent-green/20 rounded-xl p-8">
                <h3 className="text-xl font-bold text-accent-green mb-4 flex items-center gap-2">
                  <span className="text-2xl">🚚</span>
                  Supplier Information
                </h3>
                <p className="text-text-muted mb-4">
                  As a supplier, you can browse available RFQs and submit competitive bids for shipments.
                </p>
                <ul className="space-y-2 text-sm text-text-primary">
                  <li>✓ Browse all published RFQs</li>
                  <li>✓ Submit competitive bids during active auctions</li>
                  <li>✓ Monitor bid rankings in real-time</li>
                  <li>✓ Receive notifications of price changes</li>
                  <li>✓ Track auction deadlines and extensions</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
