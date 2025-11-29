import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { useTranslation } from '../hooks/useTranslation';
import api from '../services/api';
import './QRGenerator.css';

function QRGenerator() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const entityIdFromUrl = queryParams.get('entity_id');
  const { t } = useTranslation();

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
      setError(t('select_or_enter_entity_id'));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/qr/generate/${id}`);
      setQrData(response.data);
    } catch (err) {
      setError(t('failed_generate_qr'));
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
        <h1>{t('qr_code_generator')}</h1>
        
        <div className="qr-form">
          <div className="form-group">
            <label>{t('select_animal_batch')}:</label>
            <select
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className="form-control"
            >
              <option value="">{t('select_entity')}</option>
              {entities.map(entity => (
                <option key={entity.entity_id} value={entity.entity_id}>
                  {entity.entity_type === 'animal' ? entity.tag_id : entity.batch_name} 
                  ({entity.species}) - {entity.farm_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>{t('or_enter_entity_id')}:</label>
            <input
              type="text"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder={t('enter_entity_id')}
              className="form-control"
            />
          </div>

          <button 
            onClick={() => generateQR()} 
            disabled={loading || !entityId}
            className="btn-primary"
          >
            {loading ? t('generating') : t('generate_qr_code')}
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {qrData && (
          <div className="qr-result">
            <h2>{t('qr_generated_successfully')}</h2>
            
            <div className="qr-details">
              <div className="detail-row">
                <span className="label">{t('entity_id')}:</span>
                <span className="value">{qrData.entity_id}</span>
              </div>
              <div className="detail-row">
                <span className="label">{t('type')}:</span>
                <span className="value">{qrData.entity_type}</span>
              </div>
              <div className="detail-row">
                <span className="label">{t('name')}:</span>
                <span className="value">
                  {qrData.entity_type === 'animal' ? qrData.tag_id : qrData.batch_name}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">{t('species')}:</span>
                <span className="value">{qrData.species}</span>
              </div>
              {qrData.breed && (
                <div className="detail-row">
                  <span className="label">{t('breed')}:</span>
                  <span className="value">{qrData.breed}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="label">{t('farm')}:</span>
                <span className="value">{qrData.farm_name}</span>
              </div>
              <div className="detail-row">
                <span className="label">{t('product')}:</span>
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
                {t('download_qr_code')}
              </button>
              <button 
                onClick={() => {
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(qrData.verification_url)
                      .then(() => alert(t('verification_url_copied')))
                      .catch(() => {
                        const input = document.createElement('input');
                        input.value = qrData.verification_url;
                        document.body.appendChild(input);
                        input.select();
                        document.execCommand('copy');
                        document.body.removeChild(input);
                        alert(t('verification_url_copied'));
                      });
                  } else {
                    const input = document.createElement('input');
                    input.value = qrData.verification_url;
                    document.body.appendChild(input);
                    input.select();
                    document.execCommand('copy');
                    document.body.removeChild(input);
                    alert(t('verification_url_copied'));
                  }
                }}
                className="btn-secondary"
              >
                {t('copy_verification_url')}
              </button>
            </div>

            <div className="verification-url">
              <label>{t('verification_url')}:</label>
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
