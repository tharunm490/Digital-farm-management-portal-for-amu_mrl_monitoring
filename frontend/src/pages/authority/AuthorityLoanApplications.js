import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './AuthorityLoanApplications.css';

const AuthorityLoanApplications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const purposeLabels = {
    'animal_purchase': 'Animal Purchase',
    'feed_nutrition': 'Feed & Nutritional Loan',
    'farm_infrastructure': 'Farm Infrastructure'
  };

  useEffect(() => {
    fetchLoanApplications();
  }, []);

  const fetchLoanApplications = async () => {
    try {
      const response = await api.get('/loans/applications');
      setLoans(response.data);
    } catch (err) {
      console.error('Error fetching loan applications:', err);
      setError('Failed to load loan applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="status-badge pending">⏳ Pending</span>;
      case 'approved':
        return <span className="status-badge approved">✅ Approved</span>;
      case 'rejected':
        return <span className="status-badge rejected">❌ Rejected</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const filteredLoans = loans.filter(loan => {
    if (filter === 'all') return true;
    return loan.status === filter;
  });

  const stats = {
    total: loans.length,
    pending: loans.filter(l => l.status === 'pending').length,
    approved: loans.filter(l => l.status === 'approved').length,
    rejected: loans.filter(l => l.status === 'rejected').length
  };

  if (loading) {
    return (
      <div className="authority-loans-container">
        <div className="loading-spinner">Loading loan applications...</div>
      </div>
    );
  }

  return (
    <div className="authority-loans-container">
      <div className="loans-header">
        <h1>💼 Loan Applications</h1>
        <p>Review and manage farmer financial assistance requests</p>
      </div>

      {/* Stats Flashcards */}
      <div className="loans-stats-grid">
        <div className={`stat-flashcard ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Applications</div>
          </div>
        </div>
        <div className={`stat-flashcard ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending Review</div>
          </div>
        </div>
        <div className={`stat-flashcard ${filter === 'approved' ? 'active' : ''}`} onClick={() => setFilter('approved')}>
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.approved}</div>
            <div className="stat-label">Approved</div>
          </div>
        </div>
        <div className={`stat-flashcard ${filter === 'rejected' ? 'active' : ''}`} onClick={() => setFilter('rejected')}>
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <div className="stat-value">{stats.rejected}</div>
            <div className="stat-label">Rejected</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message-card">
          <div className="error-icon">⚠️</div>
          <div className="error-content">
            <h3>Unable to Load Applications</h3>
            <p>{error}</p>
            <button className="retry-btn" onClick={fetchLoanApplications}>
              🔄 Retry
            </button>
          </div>
        </div>
      )}

      {!error && filteredLoans.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-icon">📭</div>
          <h3>No Loan Applications</h3>
          <p>
            {filter === 'all' 
              ? 'No loan applications have been submitted yet. Applications will appear here once farmers submit requests.' 
              : `No ${filter} loan applications found. Try selecting a different filter.`}
          </p>
          {filter !== 'all' && (
            <button className="clear-filter-btn" onClick={() => setFilter('all')}>
              View All Applications
            </button>
          )}
        </div>
      ) : (
        <div className="loans-grid">
          {filteredLoans.map(loan => (
            <div key={loan.loan_id} className="loan-card">
              <div className="loan-card-header">
                <span className="loan-id">🏫 #{loan.loan_id}</span>
                {getStatusBadge(loan.status)}
              </div>

              <div className="loan-card-body">
                <div className="farmer-section">
                  <div className="farmer-name">👨‍🌾 {loan.farmer_name || 'Unknown Farmer'}</div>
                  <div className="farm-name">🏡 {loan.farm_name}</div>
                  <div className="location">
                    📍 {[loan.state, loan.district].filter(Boolean).join(', ') || 'Location not specified'}
                  </div>
                </div>

                <div className="loan-details">
                  <div className="detail-row">
                    <span className="detail-label">Purpose:</span>
                    <span className="detail-value">{purposeLabels[loan.purpose] || loan.purpose}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Amount:</span>
                    <span className="detail-value amount">{formatCurrency(loan.amount_requested)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Applied:</span>
                    <span className="detail-value">{formatDate(loan.created_at)}</span>
                  </div>
                </div>

                {loan.status !== 'pending' && loan.action_by_name && (
                  <div className="action-info">
                    <div className="action-detail">
                      <span>👤 {loan.action_by_name}</span>
                      <span>•</span>
                      <span>{formatDate(loan.action_date)}</span>
                    </div>
                  </div>
                )}

                <button 
                  className="view-details-btn"
                  onClick={() => navigate(`/authority/loan-detail/${loan.loan_id}`)}
                >
                  View Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuthorityLoanApplications;
