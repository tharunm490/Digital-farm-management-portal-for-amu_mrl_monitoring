import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { useTranslation } from '../hooks/useTranslation';
import api from '../services/api';
import './QRGenerator.css';
import './EnhancedModules.css';

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
    <div className="module-page">
      <Navigation />
      
      {/* Enhanced Header */}
      <div className="module-header">
        <div className="module-header-card">
          <div className="module-header-content">
            <div className="module-title-section">
              <div className="module-icon-circle">
                📱
              </div>
              <div className="module-title-text">
                <h1>{t('qr_code_generator')}</h1>
                <p>Generate QR codes for traceability and verification</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selection Form */}
      <div className="module-filters">
        <div className="module-filters-card">
          <div className="filter-field">
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

          <div className="filter-field">
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
            className="btn-modern-primary"
            style={{alignSelf: 'flex-end'}}
          >
            {loading ? '⏳ ' + t('generating') : '🔄 ' + t('generate_qr_code')}
          </button>
        </div>
      </div>

      {error && (
        <div className="max-w-4xl mx-auto px-6 mb-6">
          <div style={{background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', padding: '1rem', borderRadius: '16px', border: '2px solid #fca5a5', display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
            <span style={{fontSize: '1.5rem'}}>❌</span>
            <p style={{color: '#991b1b', fontWeight: '600', margin: 0}}>{error}</p>
          </div>
        </div>
      )}

      {qrData && (
        <div className="max-w-4xl mx-auto px-6">
          <div className="module-card">
            <div className="module-card-header">
              <div className="module-card-header-content">
                <div className="module-card-title-section">
                  <h3 className="module-card-title">
                    ✅ {t('qr_generated_successfully')}
                  </h3>
                  <p className="module-card-subtitle">
                    {qrData.entity_type === 'animal' ? qrData.tag_id : qrData.batch_name}
                  </p>
                </div>
                <div className="module-card-badge">
                  {qrData.entity_type.toUpperCase()}
                </div>
              </div>
            </div>

            <div className="module-card-body">
              {/* Entity Details */}
              <div className="module-info-grid" style={{marginBottom: '2rem'}}>
                <div className="module-info-item">
                  <div className="module-info-icon">🆔</div>
                  <div className="module-info-content">
                    <div className="module-info-label">{t('entity_id')}</div>
                    <div className="module-info-value">#{qrData.entity_id}</div>
                  </div>
                </div>

                <div className="module-info-item">
                  <div className="module-info-icon">🐄</div>
                  <div className="module-info-content">
                    <div className="module-info-label">{t('species')}</div>
                    <div className="module-info-value">{qrData.species}</div>
                  </div>
                </div>

                {qrData.breed && (
                  <div className="module-info-item">
                    <div className="module-info-icon">🧬</div>
                    <div className="module-info-content">
                      <div className="module-info-label">{t('breed')}</div>
                      <div className="module-info-value">{qrData.breed}</div>
                    </div>
                  </div>
                )}

                <div className="module-info-item">
                  <div className="module-info-icon">🏡</div>
                  <div className="module-info-content">
                    <div className="module-info-label">{t('farm')}</div>
                    <div className="module-info-value">{qrData.farm_name}</div>
                  </div>
                </div>

                <div className="module-info-item">
                  <div className="module-info-icon">🥛</div>
                  <div className="module-info-content">
                    <div className="module-info-label">{t('product')}</div>
                    <div className="module-info-value">{qrData.matrix}</div>
                  </div>
                </div>
              </div>

              {/* QR Code Display */}
              <div style={{background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)', padding: '2rem', borderRadius: '20px', textAlign: 'center'}}>
                <div style={{display: 'inline-block', background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)'}}>
                  <img 
                    src={qrData.qr_code} 
                    alt="QR Code" 
                    style={{maxWidth: '300px', width: '100%', height: 'auto', display: 'block'}}
                  />
                </div>
                <p style={{marginTop: '1.5rem', fontSize: '0.95rem', color: '#6b7280', fontWeight: '600'}}>
                  Scan this QR code for instant verification
                </p>
              </div>

              {/* Verification URL */}
              <div style={{marginTop: '2rem', padding: '1.5rem', background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', borderRadius: '16px', border: '2px solid #93c5fd'}}>
                <label style={{display: 'block', fontSize: '0.875rem', fontWeight: '700', color: '#1e40af', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
                  🔗 {t('verification_url')}
                </label>
                <input 
                  type="text" 
                  value={qrData.verification_url} 
                  readOnly 
                  style={{width: '100%', padding: '0.875rem 1.25rem', border: '2px solid #3b82f6', borderRadius: '12px', fontSize: '0.95rem', background: 'white', fontFamily: 'monospace'}}
                />
              </div>
            </div>

            <div className="module-card-footer">
              <button onClick={downloadQR} className="btn-card-action primary">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
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
                className="btn-card-action secondary"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                {t('copy_verification_url')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QRGenerator;
