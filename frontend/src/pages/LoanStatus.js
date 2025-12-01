import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import api from '../services/api';
import Navigation from '../components/Navigation';
import './LoanStatus.css';

const LoanStatus = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const purposeLabels = {
    'animal_purchase': 'animal_purchase',
    'feed_nutrition': 'feed_nutrition_loan',
    'farm_infrastructure': 'farm_infrastructure'
  };

  useEffect(() => {
    fetchLoanStatus();
  }, []);

  const fetchLoanStatus = async () => {
    try {
      const response = await api.get('/loans/status');
      setLoans(response.data);
    } catch (err) {
      console.error('Error fetching loan status:', err);
      setError('Failed to load loan status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
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
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="status-badge pending">⏳ {t('pending')}</span>;
      case 'approved':
        return <span className="status-badge approved">✅ {t('approved')}</span>;
      case 'rejected':
        return <span className="status-badge rejected">❌ {t('rejected')}</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const getStatusMessage = (loan) => {
    switch (loan.status) {
      case 'pending':
        return (
          <div className="status-message pending">
            <span className="message-icon">⏳</span>
            <p>{t('loan_under_review')}</p>
          </div>
        );
      case 'approved':
        return (
          <div className="status-message approved">
            <span className="message-icon">🎉</span>
            <div>
              <p><strong>{t('loan_approved_message')}</strong></p>
              <p>{t('visit_office_message')}</p>
              {loan.action_by_name && (
                <div className="action-details">
                  <p className="action-info">
                    <strong>{t('approved_by')}:</strong> {loan.action_by_name}
                    {loan.authority_designation && ` (${loan.authority_designation})`}
                  </p>
                  {loan.authority_department && (
                    <p className="action-info"><strong>{t('department')}:</strong> {loan.authority_department}</p>
                  )}
                  <p className="action-info"><strong>{t('date')}:</strong> {formatDateTime(loan.action_date)}</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'rejected':
        return (
          <div className="status-message rejected">
            <span className="message-icon">❌</span>
            <div>
              <p><strong>{t('loan_rejected_message')}</strong></p>
              <p>{t('contact_office_clarification')}</p>
              {loan.action_by_name && (
                <div className="action-details">
                  <p className="action-info">
                    <strong>{t('rejected_by')}:</strong> {loan.action_by_name}
                    {loan.authority_designation && ` (${loan.authority_designation})`}
                  </p>
                  {loan.authority_department && (
                    <p className="action-info"><strong>{t('department')}:</strong> {loan.authority_department}</p>
                  )}
                  <p className="action-info"><strong>{t('date')}:</strong> {formatDateTime(loan.action_date)}</p>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="loan-status-container">
          <div className="loading-spinner">{t('loading')}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="loan-status-container">
        <div className="loan-status-header">
          <h1>📋 {t('loan_application_status')}</h1>
          <p>{t('track_loan_status')}</p>
        </div>

        <div className="loan-actions">
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/apply-loan')}
          >
            ➕ {t('apply_new_loan')}
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">❌</span>
          {error}
        </div>
      )}

      {loans.length === 0 ? (
        <div className="no-loans-card">
          <div className="no-loans-icon">📭</div>
          <h3>{t('no_loan_applications')}</h3>
          <p>{t('no_loans_submitted')}</p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/apply-loan')}
          >
            {t('apply_for_assistance')}
          </button>
        </div>
      ) : (
        <div className="loans-list">
          {loans.map(loan => (
            <div key={loan.loan_id} className={`loan-card ${loan.status}`}>
              <div className="loan-card-header">
                <div className="loan-id">{t('loan_number')} #{loan.loan_id}</div>
                {getStatusBadge(loan.status)}
              </div>

              <div className="loan-card-body">
                <div className="loan-details-grid">
                  <div className="loan-detail">
                    <span className="detail-label">🏡 {t('farm')}</span>
                    <span className="detail-value">{loan.farm_name}</span>
                  </div>
                  <div className="loan-detail">
                    <span className="detail-label">🎯 {t('loan_purpose')}</span>
                    <span className="detail-value">{t(purposeLabels[loan.purpose]) || loan.purpose}</span>
                  </div>
                  <div className="loan-detail">
                    <span className="detail-label">💵 {t('amount')}</span>
                    <span className="detail-value amount">{formatCurrency(loan.amount_requested)}</span>
                  </div>
                  <div className="loan-detail">
                    <span className="detail-label">📅 {t('applied_on')}</span>
                    <span className="detail-value">{formatDate(loan.created_at)}</span>
                  </div>
                </div>

                {loan.description && (
                  <div className="loan-description">
                    <span className="detail-label">📝 Description</span>
                    <p>{loan.description}</p>
                  </div>
                )}

                {getStatusMessage(loan)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
};

export default LoanStatus;
