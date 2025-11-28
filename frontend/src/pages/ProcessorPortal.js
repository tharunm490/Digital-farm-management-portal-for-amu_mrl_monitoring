import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../pages/ProcessorPortal.css';

const ProcessorPortal = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [qrData, setQrData] = useState('');
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    if (user?.role === 'processor') {
      fetchBatches();
    }
  }, [user]);

  const fetchBatches = async () => {
    try {
      const response = await api.get('/api/batches/pending-verification', {
        params: { processor_id: user?.processor_id }
      });
      setBatches(response.data || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const startQRScan = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowScanner(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const stopQRScan = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setShowScanner(false);
  };

  const handleQRInput = (e) => {
    const value = e.target.value;
    setQrData(value);

    // Auto-verify if looks like a complete QR code
    if (value.length > 20) {
      verifyBatch(value);
      setQrData('');
    }
  };

  const verifyBatch = async (qr) => {
    try {
      setLoading(true);
      const response = await api.post('/api/batches/verify-qr', {
        qr_data: qr
      });

      setVerificationResult(response.data);
    } catch (error) {
      console.error('Error verifying batch:', error);
      setVerificationResult({
        status: 'error',
        message: 'Batch not found or invalid QR code'
      });
    } finally {
      setLoading(false);
    }
  };

  const acceptBatch = async (batchId) => {
    try {
      setLoading(true);
      await api.post(`/api/batches/${batchId}/accept`, {
        processor_id: user?.processor_id,
        test_performed: false
      });
      setVerificationResult(null);
      fetchBatches();
      alert('✅ Batch accepted successfully!');
    } catch (error) {
      console.error('Error accepting batch:', error);
      alert('❌ Error accepting batch');
    } finally {
      setLoading(false);
    }
  };

  const rejectBatch = async (batchId, reason) => {
    try {
      setLoading(true);
      await api.post(`/api/batches/${batchId}/reject`, {
        processor_id: user?.processor_id,
        rejection_reason: reason
      });
      setVerificationResult(null);
      fetchBatches();
      alert('🚫 Batch rejected');
    } catch (error) {
      console.error('Error rejecting batch:', error);
      alert('❌ Error rejecting batch');
    } finally {
      setLoading(false);
    }
  };

  const holdBatch = async (batchId) => {
    try {
      setLoading(true);
      await api.post(`/api/batches/${batchId}/hold`, {
        processor_id: user?.processor_id,
        reason: 'Pending testing'
      });
      setVerificationResult(null);
      fetchBatches();
      alert('⏸️ Batch placed on hold');
    } catch (error) {
      console.error('Error holding batch:', error);
      alert('❌ Error holding batch');
    } finally {
      setLoading(false);
    }
  };

  const getComplianceColor = (status) => {
    switch (status) {
      case 'safe':
        return '#28a745';
      case 'borderline':
        return '#ffc107';
      case 'unsafe':
        return '#dc3545';
      default:
        return '#999';
    }
  };

  const getComplianceIcon = (status) => {
    switch (status) {
      case 'safe':
        return '🟢';
      case 'borderline':
        return '🟡';
      case 'unsafe':
        return '🔴';
      default:
        return '⚪';
    }
  };

  return (
    <div className="processor-portal">
      {/* Header */}
      <div className="portal-header">
        <h1>🏭 Processor Batch Verification Portal</h1>
        <p>Verify compliance status of incoming batches</p>
      </div>

      {/* QR Scanner Section */}
      <div className="scanner-section">
        <h2>🔍 Scan Batch QR Code</h2>

        {!showScanner ? (
          <div className="scanner-start">
            <button className="btn-start-scan" onClick={startQRScan}>
              📷 Start Camera Scanner
            </button>
            <p className="or-divider">OR</p>
            <div className="manual-input">
              <label>Manually Enter QR Code</label>
              <input
                type="text"
                placeholder="Scan or paste QR code here..."
                value={qrData}
                onChange={handleQRInput}
                autoFocus
              />
            </div>
          </div>
        ) : (
          <div className="scanner-active">
            <video ref={videoRef} autoPlay playsInline />
            <button className="btn-stop-scan" onClick={stopQRScan}>
              ⏹️ Stop Camera
            </button>
          </div>
        )}
      </div>

      {/* Verification Result */}
      {verificationResult && (
        <div className={`verification-card ${verificationResult.status}`}>
          <div className="result-header">
            <span className="result-icon">
              {verificationResult.status === 'success' ? '✅' : '❌'}
            </span>
            <h3>{verificationResult.farm_name || 'Batch Verification'}</h3>
            <span className="result-badge" style={{ backgroundColor: getComplianceColor(verificationResult.withdrawal_status) }}>
              {getComplianceIcon(verificationResult.withdrawal_status)} {verificationResult.withdrawal_status?.toUpperCase()}
            </span>
          </div>

          {verificationResult.status === 'success' && (
            <div className="result-details">
              <div className="detail-group">
                <h4>Batch Information</h4>
                <p><strong>Entity ID:</strong> {verificationResult.entity_id}</p>
                <p><strong>Species:</strong> {verificationResult.species}</p>
                <p><strong>Matrix:</strong> {verificationResult.matrix}</p>
              </div>

              <div className="detail-group">
                <h4>Compliance Status</h4>
                <p><strong>Withdrawal Status:</strong> {verificationResult.withdrawal_status?.toUpperCase()}</p>
                <p><strong>Last Medicine:</strong> {verificationResult.last_medicine}</p>
                <p><strong>Safe Until:</strong> {new Date(verificationResult.safe_date).toLocaleDateString()}</p>
              </div>

              {verificationResult.withdrawal_status === 'unsafe' && (
                <div className="warning-box">
                  <p>⚠️ <strong>DO NOT ACCEPT:</strong> This batch is still under withdrawal period. Residues may be present.</p>
                </div>
              )}

              {verificationResult.withdrawal_status === 'borderline' && (
                <div className="caution-box">
                  <p>🟡 <strong>CAUTION:</strong> Borderline withdrawal status. Testing recommended before acceptance.</p>
                </div>
              )}

              {verificationResult.withdrawal_status === 'safe' && (
                <div className="success-box">
                  <p>✅ <strong>SAFE:</strong> Batch has completed withdrawal period and is safe for processing.</p>
                </div>
              )}

              <div className="actions">
                <button
                  className="btn-accept"
                  onClick={() => acceptBatch(verificationResult.batch_id)}
                  disabled={loading}
                >
                  ✅ Accept Batch
                </button>

                {verificationResult.withdrawal_status === 'borderline' && (
                  <button
                    className="btn-hold"
                    onClick={() => holdBatch(verificationResult.batch_id)}
                    disabled={loading}
                  >
                    ⏸️ Hold for Testing
                  </button>
                )}

                <button
                  className="btn-reject"
                  onClick={() => rejectBatch(verificationResult.batch_id, 'Non-compliant')}
                  disabled={loading}
                >
                  🚫 Reject Batch
                </button>

                <button
                  className="btn-close"
                  onClick={() => setVerificationResult(null)}
                  disabled={loading}
                >
                  ✕ Close
                </button>
              </div>
            </div>
          )}

          {verificationResult.status === 'error' && (
            <div className="error-details">
              <p>{verificationResult.message}</p>
              <button className="btn-retry" onClick={() => setVerificationResult(null)}>
                🔄 Try Again
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pending Batches */}
      {batches.length > 0 && (
        <div className="pending-batches">
          <h2>📋 Pending Batches</h2>
          <div className="batches-grid">
            {batches.map(batch => (
              <div key={batch.batch_id} className="batch-card">
                <div className="batch-header">
                  <h3>{batch.farm_name}</h3>
                  <span className={`status-badge ${batch.verification_status}`}>
                    {batch.verification_status?.toUpperCase()}
                  </span>
                </div>

                <div className="batch-info">
                  <p><strong>Farmer:</strong> {batch.farmer_name}</p>
                  <p><strong>Species:</strong> {batch.species}</p>
                  <p><strong>Matrix:</strong> {batch.matrix}</p>
                  <p><strong>Received:</strong> {new Date(batch.created_at).toLocaleDateString()}</p>
                </div>

                <div className="batch-compliance">
                  <span
                    className="compliance-indicator"
                    style={{ backgroundColor: getComplianceColor(batch.withdrawal_status) }}
                  >
                    {getComplianceIcon(batch.withdrawal_status)}
                  </span>
                  <span className="compliance-text">{batch.withdrawal_status?.toUpperCase()}</span>
                </div>

                <button
                  className="btn-verify"
                  onClick={() => verifyBatch(batch.qr_data)}
                >
                  🔍 Verify Batch
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="statistics-section">
        <h2>📊 Today's Statistics</h2>
        <div className="stats-cards">
          <div className="stat">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <div className="stat-value">{batches.length}</div>
              <div className="stat-label">Pending Verification</div>
            </div>
          </div>

          <div className="stat">
            <div className="stat-icon">🟢</div>
            <div className="stat-content">
              <div className="stat-value">{batches.filter(b => b.withdrawal_status === 'safe').length}</div>
              <div className="stat-label">Safe for Processing</div>
            </div>
          </div>

          <div className="stat">
            <div className="stat-icon">🟡</div>
            <div className="stat-content">
              <div className="stat-value">{batches.filter(b => b.withdrawal_status === 'borderline').length}</div>
              <div className="stat-label">Borderline</div>
            </div>
          </div>

          <div className="stat">
            <div className="stat-icon">🔴</div>
            <div className="stat-content">
              <div className="stat-value">{batches.filter(b => b.withdrawal_status === 'unsafe').length}</div>
              <div className="stat-label">Not Compliant</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessorPortal;
