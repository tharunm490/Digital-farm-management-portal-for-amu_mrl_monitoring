import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navigation from '../components/Navigation';
import api from '../services/api';
import './QRGenerator.css';

function QRGenerator() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const entityIdFromUrl = queryParams.get('entity_id');

  const [entityId, setEntityId] = useState(entityIdFromUrl || '');
  const [qrData, setQrData] = useState(null);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEntities();
    if (entityIdFromUrl) {
      generateQR(entityIdFromUrl);
    }
  }, [entityIdFromUrl]);

  const fetchEntities = async () => {
    try {
      const response = await api.get('/entities');
      setEntities(response.data);
    } catch (err) {
      console.error('Failed to fetch entities:', err);
    }
  };

  const generateQR = async (id = entityId) => {
    if (!id) {
      setError('Please select or enter an entity ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/qr/generate/${id}`);
      setQrData(response.data);
    } catch (err) {
      setError('Failed to generate QR code. Please check the entity ID.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    if (!qrData?.qr_code) return;

    const link = document.createElement('a');
    link.href = qrData.qr_code;
    link.download = `QR_${qrData.entity_id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="qr-generator-page">
      <Navigation />
      <div className="qr-container">
        <h1>QR Code Generator</h1>
        
        <div className="qr-form">
          <div className="form-group">
            <label>Select Animal/Batch:</label>
            <select
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className="form-control"
            >
              <option value="">-- Select Entity --</option>
              {entities.map(entity => (
                <option key={entity.entity_id} value={entity.entity_id}>
                  {entity.entity_type === 'animal' ? entity.tag_id : entity.batch_name} 
                  ({entity.species}) - {entity.farm_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Or Enter Entity ID:</label>
            <input
              type="text"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="Enter entity ID"
              className="form-control"
            />
          </div>

          <button 
            onClick={() => generateQR()} 
            disabled={loading || !entityId}
            className="btn-primary"
          >
            {loading ? 'Generating...' : 'Generate QR Code'}
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {qrData && (
          <div className="qr-result">
            <h2>QR Code Generated Successfully</h2>
            
            <div className="qr-details">
              <div className="detail-row">
                <span className="label">Entity ID:</span>
                <span className="value">{qrData.entity_id}</span>
              </div>
              <div className="detail-row">
                <span className="label">Type:</span>
                <span className="value">{qrData.entity_type}</span>
              </div>
              <div className="detail-row">
                <span className="label">Name:</span>
                <span className="value">
                  {qrData.entity_type === 'animal' ? qrData.tag_id : qrData.batch_name}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Species:</span>
                <span className="value">{qrData.species}</span>
              </div>
              {qrData.breed && (
                <div className="detail-row">
                  <span className="label">Breed:</span>
                  <span className="value">{qrData.breed}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="label">Farm:</span>
                <span className="value">{qrData.farm_name}</span>
              </div>
              <div className="detail-row">
                <span className="label">Product:</span>
                <span className="value">{qrData.matrix}</span>
              </div>
            </div>

            <div className="qr-image-container">
              <img 
                src={qrData.qr_code} 
                alt="QR Code" 
                className="qr-image"
              />
            </div>

            <div className="qr-actions">
              <button onClick={downloadQR} className="btn-primary">
                Download QR Code
              </button>
              <button 
                onClick={() => {
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(qrData.verification_url)
                      .then(() => alert('Verification URL copied to clipboard!'))
                      .catch(() => {
                        const input = document.createElement('input');
                        input.value = qrData.verification_url;
                        document.body.appendChild(input);
                        input.select();
                        document.execCommand('copy');
                        document.body.removeChild(input);
                        alert('Verification URL copied!');
                      });
                  } else {
                    const input = document.createElement('input');
                    input.value = qrData.verification_url;
                    document.body.appendChild(input);
                    input.select();
                    document.execCommand('copy');
                    document.body.removeChild(input);
                    alert('Verification URL copied!');
                  }
                }}
                className="btn-secondary"
              >
                Copy Verification URL
              </button>
            </div>

            <div className="verification-url">
              <label>Verification URL:</label>
              <input 
                type="text" 
                value={qrData.verification_url} 
                readOnly 
                className="form-control"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default QRGenerator;
