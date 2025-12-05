import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import api from '../services/api';
import Navigation from '../components/Navigation';

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
    const badges = {
      pending: (
        <span className="inline-flex items-center space-x-1 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full text-sm font-bold">
          <span>⏳</span>
          <span>{t('pending')}</span>
        </span>
      ),
      approved: (
        <span className="inline-flex items-center space-x-1 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-bold">
          <span>✅</span>
          <span>{t('approved')}</span>
        </span>
      ),
      rejected: (
        <span className="inline-flex items-center space-x-1 bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-bold">
          <span>❌</span>
          <span>{t('rejected')}</span>
        </span>
      )
    };
    return badges[status] || <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-bold">{status}</span>;
  };

  const getStatusMessage = (loan) => {
    if (loan.status === 'pending') {
      return (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg mt-4">
          <div className="flex items-start space-x-3">
            <span className="text-3xl">⏳</span>
            <p className="text-yellow-800 font-medium">{t('loan_under_review')}</p>
          </div>
        </div>
      );
    }
    
    if (loan.status === 'approved') {
      return (
        <div className="bg-green-50 border-l-4 border-green-500 p-5 rounded-lg mt-4">
          <div className="flex items-start space-x-3">
            <span className="text-4xl">🎉</span>
            <div className="flex-1">
              <p className="text-green-900 font-bold mb-2">{t('loan_approved_message')}</p>
              <p className="text-green-800 text-sm mb-3">{t('visit_office_message')}</p>
              {loan.action_by_name && (
                <div className="bg-white/50 rounded-lg p-3 space-y-1">
                  <p className="text-xs text-green-900">
                    <span className="font-bold">{t('approved_by')}:</span> {loan.action_by_name}
                    {loan.authority_designation && ` (${loan.authority_designation})`}
                  </p>
                  {loan.authority_department && (
                    <p className="text-xs text-green-900">
                      <span className="font-bold">{t('department')}:</span> {loan.authority_department}
                    </p>
                  )}
                  <p className="text-xs text-green-900">
                    <span className="font-bold">{t('date')}:</span> {formatDateTime(loan.action_date)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    
    if (loan.status === 'rejected') {
      return (
        <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-lg mt-4">
          <div className="flex items-start space-x-3">
            <span className="text-4xl">❌</span>
            <div className="flex-1">
              <p className="text-red-900 font-bold mb-2">{t('loan_rejected_message')}</p>
              <p className="text-red-800 text-sm mb-3">{t('contact_office_clarification')}</p>
              {loan.action_by_name && (
                <div className="bg-white/50 rounded-lg p-3 space-y-1">
                  <p className="text-xs text-red-900">
                    <span className="font-bold">{t('rejected_by')}:</span> {loan.action_by_name}
                    {loan.authority_designation && ` (${loan.authority_designation})`}
                  </p>
                  {loan.authority_department && (
                    <p className="text-xs text-red-900">
                      <span className="font-bold">{t('department')}:</span> {loan.authority_department}
                    </p>
                  )}
                  <p className="text-xs text-red-900">
                    <span className="font-bold">{t('date')}:</span> {formatDateTime(loan.action_date)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-4"></div>
            <p className="text-lg font-semibold text-gray-700">{t('loading')}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                  📋
                </div>
                <div>
                  <h1 className="text-3xl font-black text-gray-900">{t('loan_application_status')}</h1>
                  <p className="text-gray-600 mt-1">{t('track_loan_status')}</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/apply-loan')}
                className="hidden md:flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>{t('apply_new_loan')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Apply Button */}
        <div className="md:hidden max-w-6xl mx-auto mb-6">
          <button
            onClick={() => navigate('/apply-loan')}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>{t('apply_new_loan')}</span>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-6xl mx-auto mb-6">
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-center space-x-3">
              <span className="text-2xl">❌</span>
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="max-w-6xl mx-auto">
          {loans.length === 0 ? (
            /* Empty State */
            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-12 border border-white/20 text-center">
              <div className="text-7xl mb-4">📭</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('no_loan_applications')}</h3>
              <p className="text-gray-600 mb-6">{t('no_loans_submitted')}</p>
              <button
                onClick={() => navigate('/apply-loan')}
                className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>{t('apply_for_assistance')}</span>
              </button>
            </div>
          ) : (
            /* Loan Cards */
            <div className="space-y-6">
              {loans.map(loan => (
                <div
                  key={loan.loan_id}
                  className={`bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg hover:shadow-2xl transition-all border-2 overflow-hidden ${
                    loan.status === 'approved' ? 'border-green-300' :
                    loan.status === 'rejected' ? 'border-red-300' :
                    'border-yellow-300'
                  }`}
                >
                  {/* Card Header */}
                  <div className={`p-6 bg-gradient-to-r ${
                    loan.status === 'approved' ? 'from-green-500 to-emerald-600' :
                    loan.status === 'rejected' ? 'from-red-500 to-rose-600' :
                    'from-yellow-500 to-amber-600'
                  } text-white`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-3xl">
                          {loan.status === 'approved' ? '✅' : loan.status === 'rejected' ? '❌' : '⏳'}
                        </span>
                        <div>
                          <p className="text-sm opacity-90">{t('loan_number')}</p>
                          <p className="text-2xl font-black">#{loan.loan_id}</p>
                        </div>
                      </div>
                      {getStatusBadge(loan.status)}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6">
                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                        <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">🏡 {t('farm')}</p>
                        <p className="text-lg font-bold text-gray-900">{loan.farm_name}</p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">🎯 {t('loan_purpose')}</p>
                        <p className="text-sm font-bold text-gray-900">{t(purposeLabels[loan.purpose]) || loan.purpose}</p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                        <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">💵 {t('amount')}</p>
                        <p className="text-xl font-black text-purple-900">{formatCurrency(loan.amount_requested)}</p>
                      </div>
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">📅 {t('applied_on')}</p>
                        <p className="text-sm font-bold text-gray-900">{formatDate(loan.created_at)}</p>
                      </div>
                    </div>

                    {/* Description */}
                    {loan.description && (
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-4">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">📝 Description</p>
                        <p className="text-gray-800">{loan.description}</p>
                      </div>
                    )}

                    {/* Status Message */}
                    {getStatusMessage(loan)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LoanStatus;
