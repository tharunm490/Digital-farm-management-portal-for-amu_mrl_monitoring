import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './AuthorityLoanDetail.css';

const AuthorityLoanDetail = () => {
  const { loanId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loanData, setLoanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [remarks, setRemarks] = useState('');

  const purposeLabels = {
    'animal_purchase': 'Animal Purchase',
    'feed_nutrition': 'Feed & Nutritional Loan',
    'farm_infrastructure': 'Farm Infrastructure'
  };

  useEffect(() => {
    console.log('AuthorityLoanDetail - loanId from useParams:', loanId);
    fetchLoanDetail();
  }, [loanId]);

  const fetchLoanDetail = async () => {
    try {
      console.log('Fetching loan detail for loanId:', loanId);
      console.log('API URL:', `/loans/applications/${loanId}`);
      const response = await api.get(`/loans/applications/${loanId}`);
      console.log('Response received:', response.data);
      setLoanData(response.data);
    } catch (err) {
      console.error('Error fetching loan detail:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      setError('Failed to load loan details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      await api.patch(`/loans/applications/${loanId}/status`, { 
        status: newStatus,
        remarks: remarks || null
      });
      setSuccess(`Loan application has been ${newStatus}`);
      setRemarks('');
      
      // Refresh loan data
      await fetchLoanDetail();
    } catch (err) {
      console.error('Error updating loan status:', err);
      setError(err.response?.data?.error || 'Failed to update loan status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
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
        return <span className="status-badge pending">⏳ Pending</span>;
      case 'approved':
        return <span className="status-badge approved">✅ Approved</span>;
      case 'rejected':
        return <span className="status-badge rejected">❌ Rejected</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="loan-detail-container">
        <div className="loading-spinner">Loading loan details...</div>
      </div>
    );
  }

  if (!loanData) {
    return (
      <div className="loan-detail-container">
        <div className="error-card">
          <h2>Loan Not Found</h2>
          <p>The requested loan application could not be found.</p>
          <button onClick={() => navigate('/authority/loan-applications')} className="btn-back">
            ← Back to Applications
          </button>
        </div>
      </div>
    );
  }

  const { loan, livestock, treatmentSummary, distributorVerification, history } = loanData;

  return (
    <div className="loan-detail-container">
      <div className="detail-header">
        <button onClick={() => navigate('/authority/loan-applications')} className="btn-back">
          ← Back to Applications
        </button>
        <h1>Loan Application #{loan.loan_id}</h1>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">❌</span>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span className="alert-icon">✅</span>
          {success}
        </div>
      )}

      <div className="detail-grid">
        {/* Loan Details Section */}
        <div className="detail-card loan-details">
          <div className="card-header">
            <h2>🧾 Loan Details</h2>
            {getStatusBadge(loan.status)}
          </div>
          <div className="card-body">
            <div className="detail-row">
              <span className="label">Loan ID</span>
              <span className="value">#{loan.loan_id}</span>
            </div>
            <div className="detail-row">
              <span className="label">Purpose</span>
              <span className="value purpose-badge">{purposeLabels[loan.purpose] || loan.purpose}</span>
            </div>
            <div className="detail-row">
              <span className="label">Amount Requested</span>
              <span className="value amount">{formatCurrency(loan.amount_requested)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Created Date</span>
              <span className="value">{formatDate(loan.created_at)}</span>
            </div>
            {loan.description && (
              <div className="detail-row description">
                <span className="label">Description</span>
                <p className="value">{loan.description}</p>
              </div>
            )}

            {/* Action Buttons with Remarks */}
            {loan.status === 'pending' && (
              <div className="action-section">
                <div className="remarks-input">
                  <label htmlFor="remarks">Remarks (Optional)</label>
                  <textarea
                    id="remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter any remarks or notes for this action..."
                    rows="3"
                    disabled={updating}
                  />
                </div>
                <div className="action-buttons">
                  <button
                    className="btn btn-approve"
                    onClick={() => handleStatusUpdate('approved')}
                    disabled={updating}
                  >
                    {updating ? 'Processing...' : '✅ Approve Loan'}
                  </button>
                  <button
                    className="btn btn-reject"
                    onClick={() => handleStatusUpdate('rejected')}
                    disabled={updating}
                  >
                    {updating ? 'Processing...' : '❌ Reject Loan'}
                  </button>
                </div>
              </div>
            )}

            {loan.status !== 'pending' && (
              <div className="status-finalized">
                <p>
                  {loan.status === 'approved' 
                    ? '✅ This loan has been approved.' 
                    : '❌ This loan has been rejected.'}
                </p>
              </div>
            )}

            {/* Action Audit Trail - Show for processed loans */}
            {loan.status !== 'pending' && loan.action_by_name && (
              <div className="action-audit-section">
                <h4>📋 Action Details</h4>
                <div className="audit-info-grid">
                  <div className="audit-row">
                    <span className="audit-label">Updated By:</span>
                    <span className="audit-value">{loan.action_by_name}</span>
                  </div>
                  {loan.authority_department && (
                    <div className="audit-row">
                      <span className="audit-label">Department:</span>
                      <span className="audit-value">{loan.authority_department}</span>
                    </div>
                  )}
                  {loan.authority_designation && (
                    <div className="audit-row">
                      <span className="audit-label">Designation:</span>
                      <span className="audit-value">{loan.authority_designation}</span>
                    </div>
                  )}
                  <div className="audit-row">
                    <span className="audit-label">Action Date:</span>
                    <span className="audit-value">{formatDate(loan.action_date)}</span>
                  </div>
                  <div className="audit-row">
                    <span className="audit-label">Status:</span>
                    <span className={`audit-value status-text ${loan.status}`}>
                      {loan.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Farmer & Farm Summary */}
        <div className="detail-card farmer-summary">
          <div className="card-header">
            <h2>👤 Farmer & Farm Summary</h2>
          </div>
          <div className="card-body">
            <div className="detail-row">
              <span className="label">Farmer Name</span>
              <span className="value">{loan.farmer_name || 'Not specified'}</span>
            </div>
            <div className="detail-row">
              <span className="label">Phone</span>
              <span className="value">{loan.phone || 'Not available'}</span>
            </div>
            <div className="detail-row">
              <span className="label">State</span>
              <span className="value">{loan.state || 'Not specified'}</span>
            </div>
            <div className="detail-row">
              <span className="label">District</span>
              <span className="value">{loan.district || 'Not specified'}</span>
            </div>
            <div className="detail-row">
              <span className="label">Taluk</span>
              <span className="value">{loan.taluk || 'Not specified'}</span>
            </div>
            <div className="detail-row">
              <span className="label">Farm Name</span>
              <span className="value farm-name">{loan.farm_name}</span>
            </div>
          </div>
        </div>

        {/* Livestock Summary */}
        <div className="detail-card livestock-summary">
          <div className="card-header">
            <h2>🐄 Livestock Summary</h2>
            <span className="subtitle">Farm: {loan.farm_name}</span>
          </div>
          <div className="card-body">
            {livestock && livestock.length > 0 ? (
              <div className="livestock-grid">
                {livestock.map((item, index) => (
                  <div key={index} className="livestock-item">
                    <span className="species-icon">
                      {item.species === 'cattle' && '🐄'}
                      {item.species === 'goat' && '🐐'}
                      {item.species === 'sheep' && '🐑'}
                      {item.species === 'pig' && '🐷'}
                      {item.species === 'poultry' && '🐔'}
                    </span>
                    <div className="species-info">
                      <span className="species-name">{item.species.charAt(0).toUpperCase() + item.species.slice(1)}</span>
                      <span className="species-count">{item.animal_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data">
                <p>No livestock data available for this farm.</p>
              </div>
            )}
          </div>
        </div>

        {/* Treatment & AMU Summary */}
        <div className="detail-card treatment-summary">
          <div className="card-header">
            <h2>💊 Treatment & AMU Summary</h2>
          </div>
          <div className="card-body">
            <div className="summary-stat">
              <span className="stat-label">Total Treatments Given</span>
              <span className="stat-value">{treatmentSummary.totalTreatments}</span>
            </div>

            <div className="medicines-section">
              <h4>Medicines Used</h4>
              {treatmentSummary.medicinesUsed && treatmentSummary.medicinesUsed.length > 0 ? (
                <div className="medicines-list">
                  {treatmentSummary.medicinesUsed.map((medicine, index) => (
                    <span key={index} className="medicine-tag">{medicine}</span>
                  ))}
                </div>
              ) : (
                <p className="no-data-text">No medicines recorded</p>
              )}
            </div>

            <div className="risk-summary">
              <h4>Risk Summary</h4>
              <p className="risk-overview">
                This farm has <strong>{treatmentSummary.totalAmuRecords}</strong> AMU records:
              </p>
              <div className="risk-grid">
                <div className="risk-item safe">
                  <span className="risk-icon">✅</span>
                  <div className="risk-info">
                    <span className="risk-count">{treatmentSummary.riskSummary.safe}</span>
                    <span className="risk-label">Safe</span>
                  </div>
                </div>
                <div className="risk-item borderline">
                  <span className="risk-icon">⚠️</span>
                  <div className="risk-info">
                    <span className="risk-count">{treatmentSummary.riskSummary.borderline}</span>
                    <span className="risk-label">Borderline</span>
                  </div>
                </div>
                <div className="risk-item unsafe">
                  <span className="risk-icon">❌</span>
                  <div className="risk-info">
                    <span className="risk-count">{treatmentSummary.riskSummary.unsafe}</span>
                    <span className="risk-label">Unsafe</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Violations Section */}
            <div className="violations-section">
              <div className="violations-header">
                <h4>🚨 MRL Violations</h4>
                <span className={`violation-badge ${treatmentSummary.violations > 0 ? 'has-violations' : 'no-violations'}`}>
                  {treatmentSummary.violations > 0 
                    ? `${treatmentSummary.violations} Violation${treatmentSummary.violations !== 1 ? 's' : ''}` 
                    : 'No Violations'}
                </span>
              </div>
              <p className="violations-description">
                {treatmentSummary.violations > 0 
                  ? `This farm has ${treatmentSummary.violations} MRL violation${treatmentSummary.violations !== 1 ? 's' : ''} where antimicrobial usage exceeded safe limits.`
                  : 'This farm has no recorded MRL violations. All antimicrobial usage is within safe limits.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Distributor Verification Section */}
      {distributorVerification && (
        <div className="distributor-verification-section">
          <div className="section-header">
            <h2>🏪 Distributor Verification Summary</h2>
            <p className="section-subtitle">Product acceptance and rejection details from distributors</p>
          </div>
          
          <div className="verification-stats-grid">
            <div className="stat-card total">
              <div className="stat-icon">📦</div>
              <div className="stat-content">
                <span className="stat-number">{distributorVerification.totalVerifications}</span>
                <span className="stat-label">Total Verifications</span>
              </div>
            </div>
            
            <div className="stat-card accepted">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <span className="stat-number">{distributorVerification.acceptedCount}</span>
                <span className="stat-label">Accepted Products</span>
              </div>
            </div>
            
            <div className="stat-card rejected">
              <div className="stat-icon">❌</div>
              <div className="stat-content">
                <span className="stat-number">{distributorVerification.rejectedCount}</span>
                <span className="stat-label">Rejected Products</span>
              </div>
            </div>
          </div>

          {/* Verification Logs */}
          {distributorVerification.verificationLogs && distributorVerification.verificationLogs.length > 0 && (
            <div className="verification-logs">
              <h3>Recent Verification Details</h3>
              <div className="logs-table-container">
                <table className="verification-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Distributor</th>
                      <th>Product Details</th>
                      <th>Status</th>
                      <th>Withdrawal Safe</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distributorVerification.verificationLogs.map((log) => (
                      <tr key={log.log_id} className={`log-row ${log.verification_status}`}>
                        <td className="log-date">{formatDate(log.scanned_at)}</td>
                        <td className="log-distributor">
                          <div className="distributor-info">
                            <strong>{log.distributor_name}</strong>
                            {log.company_name && <span className="company-name">{log.company_name}</span>}
                          </div>
                        </td>
                        <td className="log-product">
                          <div className="product-info">
                            <span className="species-badge">{log.species}</span>
                            <span className="product-id">{log.tag_id || log.batch_name}</span>
                          </div>
                        </td>
                        <td className="log-status">
                          <span className={`status-pill ${log.verification_status}`}>
                            {log.verification_status === 'accepted' ? '✅ Accepted' : '❌ Rejected'}
                          </span>
                        </td>
                        <td className="log-safe">
                          <span className={`safe-badge ${log.is_withdrawal_safe ? 'safe' : 'unsafe'}`}>
                            {log.is_withdrawal_safe ? '✓ Safe' : '✗ Unsafe'}
                          </span>
                        </td>
                        <td className="log-reason">
                          {log.reason || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loan History Timeline */}
      {history && history.length > 0 && (
        <div className="loan-history-section">
          <div className="section-header">
            <h2>📋 Loan Request History</h2>
            <p className="section-subtitle">Complete audit trail of all actions taken on this application</p>
          </div>
          <div className="history-timeline">
            {history.map((entry, index) => (
              <div key={entry.history_id || index} className={`history-entry ${entry.action}`}>
                <div className="timeline-marker">
                  <span className="marker-icon">
                    {entry.action === 'approved' && '✅'}
                    {entry.action === 'rejected' && '❌'}
                    {entry.action === 'pending' && '⏳'}
                    {!['approved', 'rejected', 'pending'].includes(entry.action) && '📝'}
                  </span>
                </div>
                <div className="history-content">
                  <div className="history-header">
                    <span className={`action-badge ${entry.action}`}>
                      {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}
                    </span>
                    <span className="history-date">{formatDate(entry.action_date)}</span>
                  </div>
                  <div className="history-details">
                    <div className="authority-info">
                      <span className="authority-name">{entry.action_by_name}</span>
                      {entry.department && (
                        <span className="authority-dept">{entry.department}</span>
                      )}
                      {entry.designation && (
                        <span className="authority-designation">{entry.designation}</span>
                      )}
                    </div>
                    {entry.remarks && (
                      <div className="history-remarks">
                        <span className="remarks-label">Remarks:</span>
                        <p className="remarks-text">{entry.remarks}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthorityLoanDetail;
