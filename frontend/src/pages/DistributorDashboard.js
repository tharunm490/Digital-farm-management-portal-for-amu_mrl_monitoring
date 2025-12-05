import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DistributorNavigation from '../components/DistributorNavigation';
import api from '../services/api';
import './DistributorDashboard.css';

const DistributorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentVerifications, setRecentVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkProfileAndFetchData();
  }, []);

  const checkProfileAndFetchData = async () => {
    try {
      setLoading(true);
      // First check if profile is complete
      const profileRes = await api.get('/distributor/profile/status');
      setProfileComplete(profileRes.data.profile_complete);
      
      if (!profileRes.data.profile_complete) {
        // Don't redirect automatically, show warning instead
        setLoading(false);
        return;
      }
      
      // If profile complete, fetch dashboard data
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to check profile status:', err);
      // If error, try to fetch dashboard data anyway
      await fetchDashboardData();
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, verificationsRes] = await Promise.all([
        api.get('/distributor/stats'),
        api.get('/distributor/verifications?limit=10')
      ]);
      setStats(statsRes.data);
      setRecentVerifications(verificationsRes.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="distributor-dashboard">
        <DistributorNavigation />
        <div className="dashboard-container">
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="distributor-dashboard">
      <DistributorNavigation />
      
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>🚚 Distributor Dashboard</h1>
          <p>Welcome, {user?.display_name || user?.distributor_name || 'Distributor'}</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Profile Completion Warning */}
        {!profileComplete && (
          <div className="profile-warning-banner">
            <div className="warning-content">
              <span className="warning-icon">⚠️</span>
              <div className="warning-text">
                <h3>Complete Your Profile</h3>
                <p>Please complete your distributor profile to start verifying products.</p>
              </div>
              <button 
                className="btn-complete-profile"
                onClick={() => navigate('/distributor/profile')}
              >
                Complete Profile →
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card total">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>{stats?.total_scans || 0}</h3>
              <p>Total Scans</p>
            </div>
          </div>
          
          <div className="stat-card accepted">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>{stats?.accepted_count || 0}</h3>
              <p>Accepted</p>
            </div>
          </div>
          
          <div className="stat-card rejected">
            <div className="stat-icon">❌</div>
            <div className="stat-content">
              <h3>{stats?.rejected_count || 0}</h3>
              <p>Rejected</p>
            </div>
          </div>
          
          <div className="stat-card safe">
            <div className="stat-icon">🛡️</div>
            <div className="stat-content">
              <h3>{stats?.safe_count || 0}</h3>
              <p>Withdrawal Safe</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <a href="/distributor/verify-product" className="action-card">
              <span className="action-icon">📱</span>
              <span className="action-text">Scan QR Code</span>
              <span className="action-desc">Verify AMU compliance</span>
            </a>
            <a href="/distributor/verifications" className="action-card">
              <span className="action-icon">📋</span>
              <span className="action-text">View History</span>
              <span className="action-desc">All verification logs</span>
            </a>
            <a href="/distributor/profile" className="action-card">
              <span className="action-icon">👤</span>
              <span className="action-text">My Profile</span>
              <span className="action-desc">Update details</span>
            </a>
          </div>
        </div>

        {/* Recent Verifications */}
        <div className="recent-section">
          <div className="section-header">
            <h2>Recent Verifications</h2>
            <a href="/distributor/verifications" className="view-all">View All →</a>
          </div>
          
          {recentVerifications.length === 0 ? (
            <div className="empty-state">
              <span>📭</span>
              <p>No verifications yet. Start by scanning a QR code!</p>
            </div>
          ) : (
            <div className="verifications-table">
              <table>
                <thead>
                  <tr>
                    <th>Date/Time</th>
                    <th>Entity</th>
                    <th>Species</th>
                    <th>Status</th>
                    <th>Withdrawal Safe</th>
                    <th>Safe Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentVerifications.map((log) => (
                    <tr key={log.log_id}>
                      <td>{formatDate(log.scanned_at)}</td>
                      <td>{log.tag_number || `Entity #${log.entity_id}`}</td>
                      <td>{log.species || 'N/A'}</td>
                      <td>
                        <span className={`status-badge ${log.verification_status}`}>
                          {log.verification_status === 'accepted' ? '✅ Accepted' : '❌ Rejected'}
                        </span>
                      </td>
                      <td>
                        <span className={`safe-badge ${log.is_withdrawal_safe ? 'safe' : 'unsafe'}`}>
                          {log.is_withdrawal_safe ? '🛡️ Safe' : '⚠️ Unsafe'}
                        </span>
                      </td>
                      <td>{log.safe_date ? new Date(log.safe_date).toLocaleDateString('en-IN') : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Information Panel */}
        <div className="info-panel">
          <h2>ℹ️ How to Verify Products</h2>
          <div className="steps-grid">
            <div className="step">
              <span className="step-number">1</span>
              <h4>Scan QR Code</h4>
              <p>Use the scanner to scan the QR code on the livestock product</p>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <h4>Check Withdrawal Status</h4>
              <p>Review AMU treatment history and withdrawal period compliance</p>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <h4>Accept or Reject</h4>
              <p>Make an informed decision based on the safety information</p>
            </div>
            <div className="step">
              <span className="step-number">4</span>
              <h4>Log Decision</h4>
              <p>Your decision is logged for traceability and compliance</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DistributorDashboard;
