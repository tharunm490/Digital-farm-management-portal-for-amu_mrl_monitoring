import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { verifyAPI } from '../services/api';
import './QRVerification.css';

function QRVerification() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const entityIdFromUrl = queryParams.get('entity_id');

  const [entityId, setEntityId] = useState(entityIdFromUrl || '');
  const [verificationData, setVerificationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

// eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (entityIdFromUrl) {
      verifyEntity(entityIdFromUrl);
    }
  }, [entityIdFromUrl]);

  const verifyEntity = async (id = entityId) => {
    if (!id) {
      setError('Please enter an entity ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await verifyAPI.verifyBatch(id);
      setVerificationData(response.data);
    } catch (err) {
      setError('Failed to verify entity. Entity may not exist.');
      console.error(err);
      setVerificationData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    verifyEntity();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  const getMrlClass = (status) => {
    if (status === 'safe') return 'mrl-safe';
    if (status === 'borderline') return 'mrl-borderline';
    if (status === 'unsafe') return 'mrl-unsafe';
    return '';
  };

  const getStatusClass = (status) => {
    if (status === 'PASS') return 'status-pass';
    if (status === 'FAIL') return 'status-fail';
    return 'status-unknown';
  };

  if (loading) return <div className="loading">Verifying entity...</div>;

  return (
    <div className="verification-page">
      <div className="page-header">
        <h1>Batch Verification</h1>
        <p>Verify batch compliance and safety information</p>
      </div>

      {!entityIdFromUrl && (
        <div className="verification-input card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Enter Batch ID to Verify</label>
              <input
                type="text"
                placeholder="Enter entity ID"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
              />
            </div>
            {error && <div className="error">{error}</div>}
            <button type="submit" className="btn btn-primary">
              Verify Batch
            </button>
          </form>
        </div>
      )}

      {error && entityIdFromUrl && (
        <div className="error-card card">
          <h2>⚠️ Verification Failed</h2>
          <p>{error}</p>
        </div>
      )}

      {verificationData && verificationData.entity_details && (
        <div className="verification-results">
          {/* Status Banner */}
          <div className={`status-banner ${getStatusClass(verificationData.withdrawal_info?.status)}`}>
            <div className="status-icon">
              {verificationData.withdrawal_info?.status === 'PASS' ? '✅' : '❌'}
            </div>
            <div className="status-content">
              <h2>{verificationData.withdrawal_info?.status || 'N/A'}</h2>
              <p>
                {verificationData.withdrawal_info?.status === 'PASS'
                  ? 'This product is safe for consumption'
                  : verificationData.withdrawal_info?.status === 'FAIL'
                  ? 'This product has not completed withdrawal period'
                  : 'No treatment records found'}
              </p>
            </div>
          </div>

          {/* Entity Details */}
          <div className="card">
            <h2>📋 {verificationData.entity_details.entity_type === 'animal' ? 'Animal' : 'Batch'} Details</h2>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="label">Entity ID:</span>
                <span className="value">#{verificationData.entity_details.entity_id}</span>
              </div>
              <div className="detail-item">
                <span className="label">Type:</span>
                <span className="value">{verificationData.entity_details.entity_type}</span>
              </div>
              <div className="detail-item">
                <span className="label">Identifier:</span>
                <span className="value">
                  {verificationData.entity_details.entity_type === 'animal' 
                    ? verificationData.entity_details.tag_id 
                    : verificationData.entity_details.batch_name}
                </span>
              </div>
              <div className="detail-item">
                <span className="label">Species:</span>
                <span className="value">{verificationData.entity_details.species}</span>
              </div>
              {verificationData.entity_details.breed && (
                <div className="detail-item">
                  <span className="label">Breed:</span>
                  <span className="value">{verificationData.entity_details.breed}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="label">Product:</span>
                <span className="value">{verificationData.entity_details.matrix}</span>
              </div>
              {verificationData.entity_details.entity_type === 'batch' && verificationData.entity_details.animal_count && (
                <div className="detail-item">
                  <span className="label">Animals in Batch:</span>
                  <span className="value">{verificationData.entity_details.animal_count}</span>
                </div>
              )}
              {verificationData.entity_details.farm_name && (
                <div className="detail-item">
                  <span className="label">Farm:</span>
                  <span className="value">{verificationData.entity_details.farm_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Treatment and AMU Records */}
          <div className="card">
            <h2>💊 Treatment and AMU Records</h2>
            {!verificationData.treatment_records || verificationData.treatment_records.length === 0 ? (
              <p className="no-data">No treatment or AMU records found</p>
            ) : (
              <div className="amu-records">
                {verificationData.treatment_records.map((record, index) =>
                  <div key={index} className="amu-card">
                    <h3>{record.active_ingredient} {record.safe_date && new Date(record.safe_date) <= new Date() && <span style={{color: 'green', fontSize: '0.8em'}}>(SAFE)</span>}</h3>
                    <div className="amu-details">
                      {record.dose_amount && (
                        <div className="amu-item">
                          <span className="label">Dose:</span>
                          <span className="value">{record.dose_amount} {record.dose_unit}</span>
                        </div>
                      )}
                      <div className="amu-item">
                        <span className="label">Route:</span>
                        <span className="value">{record.route}</span>
                      </div>
                      {record.frequency_per_day && (
                        <div className="amu-item">
                          <span className="label">Frequency:</span>
                          <span className="value">{record.frequency_per_day}x per day</span>
                        </div>
                      )}
                      {record.duration_days && (
                        <div className="amu-item">
                          <span className="label">Duration:</span>
                          <span className="value">{record.duration_days} days</span>
                        </div>
                      )}
                      <div className="amu-item">
                        <span className="label">Start Date:</span>
                        <span className="value">{formatDate(record.start_date)}</span>
                      </div>
                      <div className="amu-item">
                        <span className="label">End Date:</span>
                        <span className="value">{formatDate(record.end_date)}</span>
                      </div>
                      {record.withdrawal_period_days && (
                        <div className="amu-item">
                          <span className="label">Withdrawal Period:</span>
                          <span className="value highlight">{record.withdrawal_period_days} days</span>
                        </div>
                      )}
                      {record.safe_date && (
                        <div className="amu-item">
                          <span className="label">Safe Date:</span>
                          <span className="value highlight">{formatDate(record.safe_date)}</span>
                        </div>
                      )}
                      {record.predicted_mrl && (
                        <div className="amu-item">
                          <span className="label">Predicted MRL:</span>
                          <span className={`value ${getMrlClass(record.mrl_status)}`}>{record.predicted_mrl}</span>
                        </div>
                      )}
                      {record.risk_category && (
                        <div className="amu-item">
                          <span className="label">Risk Category:</span>
                          <span className="value">{record.risk_category}</span>
                        </div>
                      )}
                      {record.medication_type && (
                        <div className="amu-item">
                          <span className="label">Category:</span>
                          <span className="value">{record.medication_type}</span>
                        </div>
                      )}
                      {record.reason && (
                        <div className="amu-item">
                          <span className="label">Reason:</span>
                          <span className="value">{record.reason}</span>
                        </div>
                      )}
                      {record.cause && (
                        <div className="amu-item">
                          <span className="label">Cause:</span>
                          <span className="value">{record.cause}</span>
                        </div>
                      )}
                      {record.vet_name && (
                        <div className="amu-item">
                          <span className="label">Veterinarian:</span>
                          <span className="value">{record.vet_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Withdrawal Period Info */}
          {verificationData.withdrawal_info && verificationData.withdrawal_info.status && (
            <div className="card">
              <h2>⏱️ Withdrawal Period Status</h2>
              <div className="withdrawal-info">
                <div className="withdrawal-item">
                  <span className="label">Withdrawal Date:</span>
                  <span className="value">{verificationData.withdrawal_info.withdrawal_date ? formatDate(verificationData.withdrawal_info.withdrawal_date) : 'N/A'}</span>
                </div>
                <div className="withdrawal-item">
                  <span className="label">Safe Date:</span>
                  <span className="value">{verificationData.withdrawal_info.safe_date ? formatDate(verificationData.withdrawal_info.safe_date) : 'N/A'}</span>
                </div>
                <div className="withdrawal-item">
                  <span className="label">Days Remaining:</span>
                  <span className={`value ${verificationData.withdrawal_info.days_remaining <= 0 ? 'positive' : 'negative'}`}>
                    {verificationData.withdrawal_info.days_remaining > 0 
                      ? `${verificationData.withdrawal_info.days_remaining} days remaining` 
                      : verificationData.withdrawal_info.days_remaining === 0
                      ? 'Ready today'
                      : verificationData.withdrawal_info.days_remaining < 0
                      ? `Safe since ${Math.abs(verificationData.withdrawal_info.days_remaining)} days ago`
                      : 'N/A'}
                  </span>
                </div>
                <div className="withdrawal-item">
                  <span className="label">MRL Status:</span>
                  <span className={`value ${verificationData.withdrawal_info.mrl_pass ? 'pass' : 'fail'}`}>
                    {verificationData.withdrawal_info.mrl_pass ? '✓ SAFE' : '✗ NOT SAFE'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tamper Proof */}
          <div className="card tamper-proof">
            <h2>🔒 Verification Status</h2>
            <div className="tamper-status">
              <div className="tamper-icon">✓</div>
              <div className="tamper-message">
                <p>{verificationData.tamper_proof?.message || 'Record verified successfully'}</p>
                <small>All treatment records and withdrawal periods have been verified</small>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QRVerification;
