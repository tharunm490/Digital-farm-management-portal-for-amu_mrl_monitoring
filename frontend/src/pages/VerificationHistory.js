import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DistributorNavigation from '../components/DistributorNavigation';
import api from '../services/api';
import './VerificationHistory.css';

const VerificationHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, accepted, rejected
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchVerifications();
  }, []);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/distributor/verifications?limit=100');
      setVerifications(response.data);
    } catch (err) {
      console.error('Failed to fetch verifications:', err);
      setError('Failed to load verification history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredVerifications = verifications.filter(v => {
    // Filter by status
    if (filter !== 'all' && v.verification_status !== filter) {
      return false;
    }
    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        v.tag_id?.toLowerCase().includes(search) ||
        v.batch_name?.toLowerCase().includes(search) ||
        v.species?.toLowerCase().includes(search) ||
        v.farm_name?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const stats = {
    total: verifications.length,
    accepted: verifications.filter(v => v.verification_status === 'accepted').length,
    rejected: verifications.filter(v => v.verification_status === 'rejected').length,
    safe: verifications.filter(v => v.is_withdrawal_safe).length,
    unsafe: verifications.filter(v => !v.is_withdrawal_safe).length
  };

  if (loading) {
    return (
      <div className="verification-history-page">
        <DistributorNavigation />
        <div className="history-container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading verification history...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="verification-history-page">
      <DistributorNavigation />
      
      <div className="history-container">
        {/* Header */}
        <div className="history-header">
          <h1>📋 Verification History</h1>
          <p>Track all your product verifications</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Stats Summary */}
        <div className="stats-row">
          <div className="mini-stat">
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">Total Scans</span>
          </div>
          <div className="mini-stat accepted">
            <span className="stat-number">{stats.accepted}</span>
            <span className="stat-label">Accepted</span>
          </div>
          <div className="mini-stat rejected">
            <span className="stat-number">{stats.rejected}</span>
            <span className="stat-label">Rejected</span>
          </div>
          <div className="mini-stat safe">
            <span className="stat-number">{stats.safe}</span>
            <span className="stat-label">Safe Products</span>
          </div>
          <div className="mini-stat unsafe">
            <span className="stat-number">{stats.unsafe}</span>
            <span className="stat-label">Within Withdrawal</span>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by tag, species, or farm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="search-icon">🔍</span>
          </div>
          
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button 
              className={`filter-btn accepted ${filter === 'accepted' ? 'active' : ''}`}
              onClick={() => setFilter('accepted')}
            >
              ✅ Accepted
            </button>
            <button 
              className={`filter-btn rejected ${filter === 'rejected' ? 'active' : ''}`}
              onClick={() => setFilter('rejected')}
            >
              ❌ Rejected
            </button>
          </div>
        </div>

        {/* Verifications List */}
        {filteredVerifications.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <h3>No verifications found</h3>
            <p>
              {verifications.length === 0 
                ? 'Start by scanning a QR code to verify products'
                : 'No verifications match your current filters'}
            </p>
            {verifications.length === 0 && (
              <button 
                onClick={() => navigate('/distributor/verify-product')}
                className="btn-scan"
              >
                Scan QR Code →
              </button>
            )}
          </div>
        ) : (
          <div className="verifications-list">
            {filteredVerifications.map((v) => (
              <div key={v.log_id} className={`verification-card ${v.verification_status}`}>
                <div className="card-header">
                  <div className="entity-info">
                    <span className="tag-number">{v.tag_id || v.batch_name || `Entity #${v.entity_id}`}</span>
                    <span className="species-badge">{v.species || 'Unknown'}</span>
                  </div>
                  <div className="status-badges">
                    <span className={`status-badge ${v.verification_status}`}>
                      {v.verification_status === 'accepted' ? '✅ Accepted' : '❌ Rejected'}
                    </span>
                    <span className={`safe-badge ${v.is_withdrawal_safe ? 'safe' : 'unsafe'}`}>
                      {v.is_withdrawal_safe ? '🛡️ Safe' : '⚠️ Withdrawal Active'}
                    </span>
                  </div>
                </div>
                
                <div className="card-body">
                  <div className="info-row">
                    <span className="info-label">🏠 Farm:</span>
                    <span className="info-value">{v.farm_name || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">📅 Scanned:</span>
                    <span className="info-value">{formatDate(v.scanned_at)}</span>
                  </div>
                  {v.safe_date && (
                    <div className="info-row">
                      <span className="info-label">📆 Safe Date:</span>
                      <span className="info-value">{new Date(v.safe_date).toLocaleDateString('en-IN')}</span>
                    </div>
                  )}
                  {v.reason && (
                    <div className="info-row reason">
                      <span className="info-label">📝 Reason:</span>
                      <span className="info-value">{v.reason}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VerificationHistory;
