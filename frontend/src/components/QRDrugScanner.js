import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './QRDrugScanner.css';

const QRDrugScanner = ({ onScanSuccess, onClose }) => {
  const { user } = useAuth();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [scanning, setScanning] = useState(false);
  const [manualQR, setManualQR] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [useCamera, setUseCamera] = useState(true);
  const [cameraError, setCameraError] = useState(null);

  // Initialize camera
  useEffect(() => {
    if (!useCamera || !scanning) return;

    const initCamera = async () => {
      try {
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setCameraError('Camera access denied. Use manual QR entry instead.');
        setUseCamera(false);
      }
    };

    initCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [scanning, useCamera]);

  // Scan QR code from video
  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Decode QR code (simplified - in production use jsQR library)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const qrCode = await decodeQRCode(imageData);

    if (qrCode) {
      setManualQR(qrCode);
      await verifyQRCode(qrCode);
    }
  };

  // Simplified QR decode (would use jsQR library in production)
  const decodeQRCode = async (imageData) => {
    // This is a placeholder - in production use: npm install jsqr
    // const code = jsQR(imageData.data, imageData.width, imageData.height);
    // return code ? code.data : null;
    return null;
  };

  // Handle manual QR entry
  const handleManualScan = async () => {
    if (!manualQR.trim()) {
      setError('Please enter a QR code');
      return;
    }
    await verifyQRCode(manualQR);
  };

  // Verify QR code with backend
  const verifyQRCode = async (qrData) => {
    try {
      setLoading(true);
      setError(null);
      setScanResult(null);

      const response = await api.post('/api/drugs/verify-qr', {
        qr_data: qrData,
        farm_id: user?.farm_id
      });

      setScanResult({
        status: 'success',
        drug: response.data.drug,
        mrl: response.data.mrl,
        criticality: response.data.criticality,
        batch: response.data.batch,
        expiry: response.data.expiry
      });

      if (onScanSuccess) {
        onScanSuccess(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Drug not found or invalid QR code');
      setScanResult({
        status: 'error',
        message: error
      });
    } finally {
      setLoading(false);
    }
  };

  // Start camera scanning
  const startScanning = async () => {
    setScanning(true);
    setError(null);
    setManualQR('');
    setScanResult(null);

    // Attempt to scan every 500ms
    const scanInterval = setInterval(async () => {
      if (scanning && videoRef.current?.readyState === 4) {
        await captureFrame();
      }
    }, 500);

    return () => clearInterval(scanInterval);
  };

  return (
    <div className="qr-scanner-modal">
      <div className="scanner-overlay" onClick={onClose}></div>
      <div className="scanner-card">
        {/* Header */}
        <div className="scanner-header">
          <h2>Scan Drug Package QR Code</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        {/* Scanning Mode Toggle */}
        <div className="mode-toggle">
          <button
            className={`toggle-btn ${useCamera ? 'active' : ''}`}
            onClick={() => {
              setUseCamera(true);
              setScanning(false);
              setError(null);
            }}
          >
            📷 Camera
          </button>
          <button
            className={`toggle-btn ${!useCamera ? 'active' : ''}`}
            onClick={() => {
              setUseCamera(false);
              setScanning(false);
              setError(null);
            }}
          >
            ⌨️ Manual Entry
          </button>
        </div>

        {/* Camera Scanning */}
        {useCamera && (
          <div className="camera-section">
            {!scanning ? (
              <div className="camera-placeholder">
                <div className="camera-icon">📷</div>
                <p>Click to start scanning</p>
                <button className="btn-start" onClick={startScanning}>
                  Start Camera
                </button>
              </div>
            ) : (
              <div className="camera-container">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="scanner-video"
                />
                <div className="scan-overlay">
                  <div className="scan-frame"></div>
                  <p className="scan-hint">Align QR code within frame</p>
                </div>
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <button className="btn-stop" onClick={() => setScanning(false)}>
                  Stop Scanning
                </button>
              </div>
            )}
            {cameraError && (
              <div className="error-message">{cameraError}</div>
            )}
          </div>
        )}

        {/* Manual Entry */}
        {!useCamera && (
          <div className="manual-section">
            <div className="input-group">
              <label>Enter QR Code / Batch Code</label>
              <input
                type="text"
                value={manualQR}
                onChange={(e) => setManualQR(e.target.value)}
                placeholder="e.g., AMOXC-2024-001-BATCH-A"
                onKeyPress={(e) => e.key === 'Enter' && handleManualScan()}
              />
            </div>
            <button
              className="btn-verify"
              onClick={handleManualScan}
              disabled={loading || !manualQR.trim()}
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Success Result */}
        {scanResult && scanResult.status === 'success' && (
          <div className="scan-result success">
            <div className="result-header">
              <span className="result-icon">✅</span>
              <h3>Drug Verified</h3>
            </div>

            <div className="drug-details">
              <div className="detail-row">
                <label>Drug Name</label>
                <span>{scanResult.drug?.name}</span>
              </div>
              <div className="detail-row">
                <label>Active Ingredient</label>
                <span>{scanResult.drug?.active_ingredient}</span>
              </div>
              <div className="detail-row">
                <label>Strength</label>
                <span>{scanResult.drug?.strength}</span>
              </div>
              <div className="detail-row">
                <label>Batch Number</label>
                <span>{scanResult.batch}</span>
              </div>
              <div className="detail-row">
                <label>Expiry Date</label>
                <span>{new Date(scanResult.expiry).toLocaleDateString()}</span>
              </div>
            </div>

            {/* MRL Information */}
            {scanResult.mrl && (
              <div className="mrl-info">
                <h4>MRL Information</h4>
                <div className="mrl-row">
                  <span className="mrl-label">Species:</span>
                  <span className="mrl-value">{scanResult.mrl?.species}</span>
                </div>
                <div className="mrl-row">
                  <span className="mrl-label">Product Matrix:</span>
                  <span className="mrl-value">{scanResult.mrl?.matrix}</span>
                </div>
                <div className="mrl-row">
                  <span className="mrl-label">MRL Value (ppb):</span>
                  <span className="mrl-value">{scanResult.mrl?.mrl_value}</span>
                </div>
              </div>
            )}

            {/* Criticality Badge */}
            {scanResult.criticality && (
              <div className={`criticality-badge ${scanResult.criticality.toLowerCase()}`}>
                {scanResult.criticality === 'Critically Important'
                  ? '⚠️ WHO Critically Important'
                  : scanResult.criticality === 'Highly Important'
                  ? '⚡ Highly Important'
                  : '📋 Important'}
              </div>
            )}

            <div className="result-actions">
              <button className="btn-use" onClick={() => {
                if (onScanSuccess) onScanSuccess(scanResult);
                onClose();
              }}>
                Use This Drug
              </button>
              <button className="btn-scan-again" onClick={() => {
                setScanResult(null);
                setManualQR('');
                setScanning(false);
              }}>
                Scan Another
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Verifying QR code...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRDrugScanner;
