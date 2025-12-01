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

      {/* Stats Cards */}
      <div className="loans-stats-grid">
        <div className="stat-card total" onClick={() => setFilter('all')}>
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Applications</div>
          </div>
        </div>
        <div className="stat-card pending" onClick={() => setFilter('pending')}>
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending Review</div>
          </div>
        </div>
        <div className="stat-card approved" onClick={() => setFilter('approved')}>
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.approved}</div>
            <div className="stat-label">Approved</div>
          </div>
        </div>
        <div className="stat-card rejected" onClick={() => setFilter('rejected')}>
          <div className="stat-icon">❌</div>
          <div className="stat-info">
            <div className="stat-value">{stats.rejected}</div>
            <div className="stat-label">Rejected</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button 
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({stats.total})
        </button>
        <button 
          className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Pending ({stats.pending})
        </button>
        <button 
          className={`filter-tab ${filter === 'approved' ? 'active' : ''}`}
          onClick={() => setFilter('approved')}
        >
          Approved ({stats.approved})
        </button>
        <button 
          className={`filter-tab ${filter === 'rejected' ? 'active' : ''}`}
          onClick={() => setFilter('rejected')}
        >
          Rejected ({stats.rejected})
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">❌</span>
          {error}
        </div>
      )}

      {filteredLoans.length === 0 ? (
        <div className="no-loans-card">
          <div className="no-loans-icon">📭</div>
          <h3>No Loan Applications</h3>
          <p>
            {filter === 'all' 
              ? 'No loan applications have been submitted yet.' 
              : `No ${filter} loan applications.`}
          </p>
        </div>
      ) : (
        <div className="loans-grid">
          {filteredLoans.map(loan => (
            <div key={loan.loan_id} className={`loan-application-card ${loan.status}`}>
              <div className="loan-card-header">
                <div className="loan-id">Loan #{loan.loan_id}</div>
                {getStatusBadge(loan.status)}
              </div>

              <div className="loan-card-body">
                <div className="farmer-info">
                  <div className="farmer-avatar">👤</div>
                  <div className="farmer-details">
                    <h3>{loan.farmer_name || 'Unknown Farmer'}</h3>
                    <p className="location">
                      📍 {[loan.state, loan.district, loan.taluk].filter(Boolean).join(' → ') || 'Location not specified'}
                    </p>
                  </div>
                </div>

                <div className="loan-info-grid">
                  <div className="info-item">
                    <span className="info-label">🏡 Farm</span>
                    <span className="info-value">{loan.farm_name}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">🎯 Purpose</span>
                    <span className="info-value">{purposeLabels[loan.purpose] || loan.purpose}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">💵 Amount</span>
                    <span className="info-value amount">{formatCurrency(loan.amount_requested)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">📅 Applied</span>
                    <span className="info-value">{formatDate(loan.created_at)}</span>
                  </div>
                </div>

                {/* Action Audit Info - Show for approved/rejected loans */}
                {loan.status !== 'pending' && loan.action_by_name && (
                  <div className="action-audit-info">
                    <div className="audit-header">
                      <span className="audit-icon">📋</span>
                      <span className="audit-title">Action Details</span>
                    </div>
                    <div className="audit-details">
                      <div className="audit-item">
                        <span className="audit-label">Updated By:</span>
                        <span className="audit-value">{loan.action_by_name}</span>
                      </div>
                      {loan.authority_department && (
                        <div className="audit-item">
                          <span className="audit-label">Department:</span>
                          <span className="audit-value">{loan.authority_department}</span>
                        </div>
                      )}
                      {loan.authority_designation && (
                        <div className="audit-item">
                          <span className="audit-label">Designation:</span>
                          <span className="audit-value">{loan.authority_designation}</span>
                        </div>
                      )}
                      <div className="audit-item">
                        <span className="audit-label">Action Date:</span>
                        <span className="audit-value">{formatDateTime(loan.action_date)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <button 
                  className="btn-view-details"
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
