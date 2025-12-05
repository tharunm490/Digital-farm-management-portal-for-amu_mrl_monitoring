import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './VerifyProduct.css';

const VerifyProduct = () => {
  const { qr_hash } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [productData, setProductData] = useState(null);
  const [distributorProfile, setDistributorProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [previousVerification, setPreviousVerification] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [manualQrInput, setManualQrInput] = useState('');
  const [showScanner, setShowScanner] = useState(!qr_hash);

  useEffect(() => {
    if (qr_hash) {
      setShowScanner(false);
      fetchProductData(qr_hash);
    }
  }, [qr_hash]);

  useEffect(() => {
    // Fetch distributor profile when user is logged in as distributor
    if (user?.role === 'distributor') {
      fetchDistributorProfile();
    }
  }, [user]);

  useEffect(() => {
    // Check if already verified when user is logged in
    if (user?.role === 'distributor' && productData && distributorProfile) {
      checkAlreadyVerified();
    }
  }, [user, productData, distributorProfile]);

  const fetchDistributorProfile = async () => {
    try {
      const response = await api.get('/distributor/profile');
      setDistributorProfile(response.data);
    } catch (err) {
      console.error('Failed to fetch distributor profile:', err);
      // Profile might not exist yet - redirect to setup
      if (err.response?.status === 404) {
        navigate('/distributor/profile');
      }
    }
  };

  const fetchProductData = async (hash) => {
    try {
      setLoading(true);
      setError('');
      setProductData(null);
      setAlreadyVerified(false);
      setSubmitted(false);
      
      // Use verify endpoint with QR hash
      const response = await api.get(`/verify/${hash}`);
      setProductData(response.data);
      setShowScanner(false);
      
    } catch (err) {
      console.error('Failed to fetch product data:', err);
      setError(err.response?.data?.error || 'Failed to fetch product information');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (manualQrInput.trim()) {
      fetchProductData(manualQrInput.trim());
    }
  };

  const checkAlreadyVerified = async () => {
    if (!productData?.qr_id) return;
    
    try {
      const response = await api.get(`/distributor/check-verification/${productData.qr_id}`);
      if (response.data.verified) {
        setAlreadyVerified(true);
        setPreviousVerification(response.data.previous_verification);
      }
    } catch (err) {
      console.error('Failed to check verification status:', err);
    }
  };

  const handleVerification = async (status) => {
    if (!user) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/verify-product/${qr_hash}&role=distributor`);
      return;
    }

    if (user?.role !== 'distributor') {
      setError('Access restricted — this section is only for registered distributors.');
      return;
    }

    if (!distributorProfile) {
      setError('Please complete your profile setup first.');
      navigate('/distributor/profile');
      return;
    }

    if (status === 'rejected' && !rejectReason.trim()) {
      setShowRejectModal(true);
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await api.post('/verify/action', {
        qr_id: productData.qr_id,
        entity_id: productData.entity_details.entity_id,
        verification_status: status,
        reason: status === 'rejected' ? rejectReason : null,
        distributor_id: distributorProfile.distributor_id
      });
      
      setSubmitted(true);
      setShowRejectModal(false);
      
    } catch (err) {
      console.error('Verification failed:', err);
      if (err.response?.data?.previous_verification) {
        setAlreadyVerified(true);
        setPreviousVerification(err.response.data.previous_verification);
      } else {
        setError(err.response?.data?.error || 'Failed to submit verification');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="verify-product-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading product information...</p>
        </div>
      </div>
    );
  }

  // Show scanner/manual entry when no product data
  if (showScanner && !productData) {
    return (
      <div className="verify-product-page">
        <div className="verify-container">
          <div className="verify-header">
            <button onClick={() => navigate('/distributor')} className="btn-back">
              ← Back to Dashboard
            </button>
            <h1>🔍 Verify Product</h1>
            <p>Scan or enter QR code to verify AMU compliance</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="scanner-section">
            <div className="manual-entry">
              <h3>📝 Enter QR Code Manually</h3>
              <form onSubmit={handleManualSearch}>
                <input
                  type="text"
                  value={manualQrInput}
                  onChange={(e) => setManualQrInput(e.target.value)}
                  placeholder="Enter QR code hash..."
                  className="qr-input"
                />
                <button type="submit" className="btn-search" disabled={!manualQrInput.trim()}>
                  Search Product
                </button>
              </form>
            </div>

            <div className="scanner-divider">
              <span>OR</span>
            </div>

            <div className="scan-info">
              <h3>📱 Scan QR Code</h3>
              <p>Use your device camera to scan the QR code on the product</p>
              <div className="scan-placeholder">
                <span className="scan-icon">📷</span>
                <p>Camera scanner coming soon</p>
                <small>For now, please enter the QR code manually or use the URL from the QR</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !productData) {
    return (
      <div className="verify-product-page">
        <div className="error-container">
          <span className="error-icon">❌</span>
          <h2>Product Not Found</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/distributor')} className="btn-back">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="verify-product-page">
      <div className="verify-container">
        {/* Header */}
        <div className="verify-header">
          <h1>🔍 Product Verification</h1>
          <p>AMU Withdrawal Compliance Check</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Withdrawal Status Banner */}
        <div className={`withdrawal-banner ${productData?.withdrawal_info?.is_withdrawal_safe ? 'safe' : 'unsafe'}`}>
          <div className="banner-icon">
            {productData?.withdrawal_info?.is_withdrawal_safe ? '✅' : '⚠️'}
          </div>
          <div className="banner-content">
            <h2>
              {productData?.withdrawal_info?.is_withdrawal_safe 
                ? 'SAFE FOR CONSUMPTION' 
                : 'WITHDRAWAL PERIOD ACTIVE'}
            </h2>
            {!productData?.withdrawal_info?.is_withdrawal_safe && (
              <p>
                <strong>{productData?.withdrawal_info?.days_remaining} days remaining</strong> 
                until safe date ({formatDate(productData?.withdrawal_info?.safe_date)})
              </p>
            )}
            {productData?.withdrawal_info?.risk_category && (
              <p className="medicine-info">
                Risk Category: <span className={`risk-badge risk-${productData.withdrawal_info.risk_category}`}>
                  {productData.withdrawal_info.risk_category}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Product Information */}
        <div className="info-section">
          <h3>🐄 Product Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Tag/Batch</span>
              <span className="info-value">{productData?.entity_details?.tag_id || productData?.entity_details?.batch_name || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Species</span>
              <span className="info-value">{productData?.entity_details?.species || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Matrix</span>
              <span className="info-value">{productData?.entity_details?.matrix || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Type</span>
              <span className="info-value">{productData?.entity_details?.entity_type || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Farm Information */}
        <div className="info-section">
          <h3>🏠 Farm Information</h3>
          <div className="info-grid">
            <div className="info-item full-width">
              <span className="info-label">Farm Name</span>
              <span className="info-value">{productData?.entity_details?.farm_name || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Treatment Records */}
        {productData?.treatment_records?.length > 0 && (
          <div className="info-section treatments-section">
            <h3>💊 Treatment Records</h3>
            <div className="treatments-list">
              {productData.treatment_records.map((t, idx) => (
                <div key={idx} className="treatment-item">
                  <div className="treatment-header">
                    <strong>{t.active_ingredient || 'N/A'}</strong>
                    {t.safe_date && new Date(t.safe_date) <= new Date() && (
                      <span className="safe-badge">✓ SAFE</span>
                    )}
                  </div>
                  <div className="treatment-grid">
                    {t.start_date && <p><strong>Start:</strong> {formatDate(t.start_date)}</p>}
                    {t.safe_date && <p><strong>Safe Date:</strong> {formatDate(t.safe_date)}</p>}
                    {t.predicted_withdrawal_days && <p><strong>Withdrawal:</strong> {t.predicted_withdrawal_days} days</p>}
                    {t.risk_category && <p><strong>Risk:</strong> <span className={`risk-${t.risk_category}`}>{t.risk_category}</span></p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Already Verified Notice */}
        {alreadyVerified && (
          <div className="already-verified-notice">
            <span className="notice-icon">ℹ️</span>
            <div className="notice-content">
              <h4>Already Verified</h4>
              <p>
                You {previousVerification?.verification_status} this product on{' '}
                {formatDate(previousVerification?.scanned_at)}
              </p>
            </div>
          </div>
        )}

        {/* Verification Submitted Notice */}
        {submitted && (
          <div className="submitted-notice">
            <span className="notice-icon">✅</span>
            <div className="notice-content">
              <h4>Verification Submitted</h4>
              <p>Your decision has been recorded successfully.</p>
              <button onClick={() => navigate('/distributor')} className="btn-dashboard">
                Go to Dashboard →
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!alreadyVerified && !submitted && (
          <div className="action-section">
            {!user ? (
              <div className="login-prompt">
                <p>Please login as a distributor to verify this product</p>
                <button 
                  onClick={() => navigate(`/login?redirect=/verify-product/${qr_hash || productData?.qr_id}&role=distributor`)}
                  className="btn-login"
                >
                  Login as Distributor →
                </button>
              </div>
            ) : user?.role !== 'distributor' ? (
              <div className="role-mismatch">
                <p>⚠️ Access restricted — this section is only for registered distributors.</p>
                <p>You are logged in as <strong>{user?.role}</strong>.</p>
              </div>
            ) : (
              <>
                <div className="verification-buttons">
                  <button 
                    onClick={() => handleVerification('accepted')}
                    className="btn-accept"
                    disabled={submitting}
                  >
                    {submitting ? 'Processing...' : '✔ ACCEPT'}
                  </button>
                  <button 
                    onClick={() => setShowRejectModal(true)}
                    className="btn-reject"
                    disabled={submitting}
                  >
                    {submitting ? 'Processing...' : '❌ REJECT'}
                  </button>
                </div>
                
                {!productData?.withdrawal_info?.is_withdrawal_safe && (
                  <div className="warning-note">
                    <strong>⚠️ Warning:</strong> This product is within its withdrawal period. 
                    Safe date is {formatDate(productData?.withdrawal_info?.safe_date)}. 
                    Consider rejecting until withdrawal period completes.
                  </div>
                )}
                
                {productData?.withdrawal_info?.is_withdrawal_safe && (
                  <div className="success-note">
                    <strong>✓ Safe:</strong> This product has completed its withdrawal period and is safe for consumption.
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>❌ Reject Product</h3>
            <p>Please provide a reason for rejection:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
            />
            <div className="modal-actions">
              <button 
                onClick={() => handleVerification('rejected')}
                className="btn-confirm-reject"
                disabled={!rejectReason.trim() || submitting}
              >
                {submitting ? 'Submitting...' : 'Confirm Rejection'}
              </button>
              <button 
                onClick={() => setShowRejectModal(false)}
                className="btn-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifyProduct;
