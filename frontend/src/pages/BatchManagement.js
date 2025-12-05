import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navigation from '../components/Navigation';
import api from '../services/api';
import { getAllSpecies, getBreedsBySpecies } from '../data/speciesBreeds';
import { useTranslation } from '../hooks/useTranslation';
import './BatchManagement.css';
import './EnhancedModules.css';

const BatchManagement = () => {
  const { farm_id } = useParams();
  const { t } = useTranslation();
  const safeValue = (val) => {
    if (val == null) return '';
    if (typeof val === 'object') return '';
    return String(val);
  };

  const getAnimalIcon = (species) => {
    const normalizedSpecies = species?.toLowerCase();
    switch (normalizedSpecies) {
      case 'cattle': return '🐄';
      case 'pig':
      case 'pigs': return '🐖';
      case 'sheep': return '🐑';
      case 'goat': return '🐐';
      default: return '🐄'; // Default to cattle icon
    }
  };

  const navigate = useNavigate();
  const [filteredEntities, setFilteredEntities] = useState([]);
  const [entities, setEntities] = useState([]);
  const [farms, setFarms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [treatmentRequests, setTreatmentRequests] = useState([]);
  const [expandedRequests, setExpandedRequests] = useState({});
  const [activeWithdrawals, setActiveWithdrawals] = useState([]);

  const [formData, setFormData] = useState({
    entity_type: 'animal',
    farm_id: '',
    tag_id: '',
    batch_name: '',
    species: '',
    matrix: 'milk',
    batch_count: ''
  });

  const getSpeciesOptions = () => {
    if (formData.entity_type === 'animal') {
      return ['cattle', 'goat', 'sheep'];
    } else if (formData.entity_type === 'batch') {
      return ['pig', 'poultry'];
    }
    return [];
  };

  const currentFarm = farms.find(f => f.farm_id == farm_id);

  useEffect(() => {
    fetchEntities();
    fetchFarms();
    fetchTreatmentRequests();
    fetchActiveWithdrawals();
  }, []);

  useEffect(() => {
    if (farm_id) {
      setFormData(prev => ({ ...prev, farm_id }));
    }
  }, [farm_id]);

  const fetchEntities = async () => {
    try {
      setLoading(true);
      const response = await api.get('/entities');
      setEntities(response.data);
      setFilteredEntities(farm_id ? response.data.filter(e => e.farm_id == farm_id) : response.data);
      setError('');
    } catch (err) {
      console.error('Fetch entities error:', err);
      setError('Failed to load entities');
    } finally {
      setLoading(false);
    }
  };

  const fetchFarms = async () => {
    try {
      const response = await api.get('/farms');
      setFarms(response.data);
    } catch (err) {
      console.error('Fetch farms error:', err);
    }
  };

  const fetchTreatmentRequests = async () => {
    try {
      const response = await api.get('/treatment-requests');
      setTreatmentRequests(response.data);
    } catch (err) {
      console.error('Fetch treatment requests error:', err);
    }
  };

  const fetchActiveWithdrawals = async () => {
    try {
      const response = await api.get('/treatments/withdrawals/active');
      setActiveWithdrawals(response.data);
    } catch (err) {
      console.error('Fetch active withdrawals error:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'entity_type') {
      setFormData({
        ...formData,
        entity_type: value,
        tag_id: '',
        batch_name: '',
        species: '',
        batch_count: value === 'batch' ? '' : '1'
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (!farm_id && !formData.farm_id) return setError('Please select a farm');
      if (formData.entity_type === 'animal' && !formData.tag_id)
        return setError('Tag ID is required for animals');
      if (formData.entity_type === 'batch' && !formData.batch_name)
        return setError('Batch name is required for batches');
      if (formData.entity_type === 'batch' && !formData.batch_count)
        return setError('Number of animals is required for batches');

      const dataToSubmit = {
        farm_id: farm_id || parseInt(formData.farm_id),
        entity_type: formData.entity_type,
        species: formData.species,
        tag_id: formData.entity_type === 'animal' ? formData.tag_id : null,
        batch_name: formData.entity_type === 'batch' ? formData.batch_name : null,
        matrix: formData.matrix,
        batch_count:
          formData.entity_type === 'batch'
            ? parseInt(formData.batch_count)
            : null
      };

      await api.post('/entities', dataToSubmit);

      setShowForm(false);
      resetForm();
      fetchEntities();
    } catch (err) {
      console.error('Create entity error:', err);
      setError(err.response?.data?.error || 'Failed to create entity');
    }
  };

  const resetForm = () => {
    setFormData({
      entity_type: 'animal',
      farm_id: '',
      tag_id: '',
      batch_name: '',
      species: '',
      matrix: 'milk',
      batch_count: ''
    });
  };

  const generateQR = (entityId) => {
    navigate(`/qr-generator?entity_id=${entityId}`);
  };

  return (
    <div className="module-page">
      <Navigation />

      <div className="batch-content">
        {/* Enhanced Header */}
        <div className="module-header">
          <div className="module-header-card">
            <div className="module-header-content">
              {farm_id && (
                <button onClick={() => navigate('/farms')} className="btn-modern-secondary" style={{marginRight: 'auto'}}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {t('back_to_farms')}
                </button>
              )}
              <div className="module-title-section">
                <div className="module-icon-circle">
                  🐄
                </div>
                <div className="module-title-text">
                  <h1>{farm_id ? `${t('batches_for')} ${currentFarm?.farm_name || 'Farm'}` : t('animal_batch_management')}</h1>
                  <p>{farm_id ? t('manage_batches_farm') : t('manage_livestock')}</p>
                </div>
              </div>
              <div className="module-action-buttons">
                <button onClick={() => setShowForm(!showForm)} className="btn-modern-primary">
                  {showForm ? '❌ ' + t('cancel') : '➕ ' + t('add_entity')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            {error}
          </div>
        )}

        {showForm && (
          <div className="form-card">
            <div className="form-header">
              <h2>{t(formData.entity_type === 'animal' ? 'add_new_animal' : 'add_new_batch')}</h2>
              <div className="form-badges">
                <span className={`badge ${formData.entity_type}`}>
                  {formData.entity_type === 'animal' ? t('animal') : t('batch')}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="entity-form">
              <div className="form-section">
                <h3>📍 {t('farm_location')} & {t('entity_type')}</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>{t('farm_location')} *</label>
                    {farm_id ? (
                      <div className="form-control disabled">
                        {currentFarm?.farm_name || 'Loading...'}
                      </div>
                    ) : (
                      <select
                        name="farm_id"
                        value={formData.farm_id}
                        onChange={handleChange}
                        required
                        className="form-control"
                      >
                        <option value="">{t('select_farm')}</option>
                        {farms.map((farm) => (
                          <option key={farm.farm_id} value={farm.farm_id}>
                            {farm.farm_name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="form-group">
                    <label>{t('entity_type')} *</label>
                    <div className="radio-group modern">
                      <label className={`radio-option ${formData.entity_type === 'animal' ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="entity_type"
                          value="animal"
                          checked={formData.entity_type === 'animal'}
                          onChange={handleChange}
                        />
                        <div className="radio-content">
                          <span className="radio-icon">🐄</span>
                          <div>
                            <strong>{t('animal')}</strong>
                            <small>{t('single_cattle_goat_sheep')}</small>
                          </div>
                        </div>
                      </label>

                      <label className={`radio-option ${formData.entity_type === 'batch' ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="entity_type"
                          value="batch"
                          checked={formData.entity_type === 'batch'}
                          onChange={handleChange}
                        />
                        <div className="radio-content">
                          <span className="radio-icon">🐔</span>
                          <div>
                            <strong>{t('batch')}</strong>
                            <small>{t('pigs_poultry_groups')}</small>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {formData.entity_type === 'animal' && (
                <div className="form-section">
                  <h3>🏷️ {t('animal_identification')}</h3>
                  <div className="form-group">
                    <label>{t('tag_id')} *</label>
                    <div className="input-with-icon">
                      <span className="input-icon">🏷️</span>
                      <input
                        type="text"
                        name="tag_id"
                        value={formData.tag_id}
                        onChange={handleChange}
                        required
                        className="form-control"
                        placeholder="e.g., TAG01-cow-01"
                      />
                    </div>
                    <small className="form-help">{t('unique_identifier')}</small>
                  </div>
                </div>
              )}

              {formData.entity_type === 'batch' && (
                <div className="form-section">
                  <h3>📊 {t('batch_information')}</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>{t('batch_name')} *</label>
                      <div className="input-with-icon">
                        <span className="input-icon">📦</span>
                        <input
                          type="text"
                          name="batch_name"
                          value={formData.batch_name}
                          onChange={handleChange}
                          required
                          className="form-control"
                          placeholder="e.g., Batch-JAN-2024"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>{t('number_of_animals')} *</label>
                      <div className="input-with-icon">
                        <span className="input-icon">🔢</span>
                        <input
                          type="number"
                          name="batch_count"
                          value={formData.batch_count}
                          onChange={handleChange}
                          required
                          min="1"
                          className="form-control"
                          placeholder="e.g., 50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-section">
                <h3>🔬 {t('species_product_details')}</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>{t('species')} *</label>
                    <select
                      name="species"
                      value={formData.species}
                      onChange={handleChange}
                      required
                      className="form-control"
                    >
                      <option value="">{t('select_species')}</option>
                      {getSpeciesOptions().map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>{t('product_matrix')} *</label>
                    <select
                      name="matrix"
                      value={formData.matrix}
                      onChange={handleChange}
                      required
                      className="form-control"
                    >
                      <option value="milk">{t('milk')}</option>
                      <option value="meat">{t('meat')}</option>
                      <option value="egg">{t('egg')}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  <span className="btn-icon">💾</span>
                  {t(formData.entity_type === 'animal' ? 'add_animal' : 'add_batch')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="entities-section">
          <div className="section-header">
            <h2>{t('your_entities')} ({filteredEntities.length})</h2>
            <div className="filter-tabs">
              <button className="tab active">{t('all')}</button>
              <button className="tab">{t('animals')}</button>
              <button className="tab">{t('batches')}</button>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>{t('loading_entities')}</p>
            </div>
          ) : filteredEntities.length === 0 ? (
            <div className="module-empty-state">
              <div className="module-empty-icon">🐄</div>
              <h3>{t('no_entities')}</h3>
              <p>{t('start_adding')}</p>
              <button onClick={() => setShowForm(true)} className="btn-modern-primary">
                ➕ {t('add_first_entity')}
              </button>
            </div>
          ) : (
            <div className="cards-grid">
              {filteredEntities.map((entity) => (
                <div key={entity.entity_id} className="module-card">
                  <div className="module-card-header">
                    <div className="module-card-header-content">
                      <div className="module-card-title-section">
                        <h3 className="module-card-title">
                          {entity.entity_type === 'animal' ? getAnimalIcon(entity.species) : '🐔'}
                          {' '}
                          {entity.entity_type === 'animal'
                            ? safeValue(entity.tag_id)
                            : safeValue(entity.batch_name)}
                        </h3>
                        <p className="module-card-subtitle">
                          {safeValue(entity.species).charAt(0).toUpperCase() + safeValue(entity.species).slice(1)}
                        </p>
                      </div>
                      <div className="module-card-badge">
                        ID: #{safeValue(entity.entity_id)}
                      </div>
                    </div>
                  </div>

                  <div className="module-card-body">
                    <div className="module-info-grid">
                      <div className="module-info-item">
                        <div className="module-info-icon">🏡</div>
                        <div className="module-info-content">
                          <div className="module-info-label">{t('farm')}</div>
                          <div className="module-info-value">{safeValue(entity.farm_name)}</div>
                        </div>
                      </div>

                      <div className="module-info-item">
                        <div className="module-info-icon">🥛</div>
                        <div className="module-info-content">
                          <div className="module-info-label">{t('product')}</div>
                          <div className="module-info-value">{safeValue(entity.matrix)}</div>
                        </div>
                      </div>

                      {entity.entity_type === 'batch' && entity.batch_count && (
                        <div className="module-info-item">
                          <div className="module-info-icon">🔢</div>
                          <div className="module-info-content">
                            <div className="module-info-label">{t('count')}</div>
                            <div className="module-info-value">{safeValue(entity.batch_count)} {t('animals')}</div>
                          </div>
                        </div>
                      )}

                      <div className="module-info-item">
                        <div className="module-info-icon">📱</div>
                        <div className="module-info-content">
                          <div className="module-info-label">{t('qr_code')}</div>
                          <button
                            onClick={() => generateQR(entity.entity_id)}
                            className="btn-modern-secondary"
                            style={{marginTop: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem'}}
                          >
                            Generate QR
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Treatment Requests Section */}
                    {(() => {
                      const entityRequests = treatmentRequests.filter(req => req.entity_id === entity.entity_id);
                      const isExpanded = expandedRequests[entity.entity_id];
                      const entityWithdrawal = activeWithdrawals.find(w => w.entity_id === entity.entity_id);
                      
                      return (
                        <>
                          {entityWithdrawal && (
                            <div className="withdrawal-warning" style={{marginTop: '1rem', padding: '1rem', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', borderRadius: '12px', border: '2px solid #fcd34d'}}>
                              <span className="warning-icon">⚠️</span>
                              <span className="warning-text" style={{color: '#92400e', fontWeight: '600'}}>
                                {t('withdrawal_period_active')} {new Date(entityWithdrawal.safe_date).toLocaleDateString()}. 
                                {t('new_requests_blocked')}.
                              </span>
                            </div>
                          )}
                          
                          {entityRequests.length > 0 && (
                            <div className="treatment-requests-section" style={{marginTop: '1rem'}}>
                              <div className="requests-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem'}}>
                                <h4 style={{margin: 0, fontSize: '1rem', fontWeight: '700'}}>🩺 {t('treatment_requests')}</h4>
                                <button
                                  onClick={() => setExpandedRequests(prev => ({ ...prev, [entity.entity_id]: !prev[entity.entity_id] }))}
                                  className="btn-modern-secondary"
                                  style={{padding: '0.5rem 1rem', fontSize: '0.875rem'}}
                                >
                                  {isExpanded ? t('hide_history') : t('view_history')}
                                </button>
                              </div>
                              <div className="request-summary" style={{padding: '0.75rem', background: '#f3f4f6', borderRadius: '8px', marginBottom: '0.75rem'}}>
                                <span className="request-count" style={{fontWeight: '700', color: '#374151'}}>{entityRequests.length} {t('requests_sent')}</span>
                                <br />
                                <span className="assigned-vets" style={{fontSize: '0.875rem', color: '#6b7280'}}>
                                  {t('assigned_to')} {[...new Set(entityRequests.map(req => req.vet_name || req.vet_user_name))].join(', ')}
                                </span>
                              </div>
                              {isExpanded && (
                                <div className="requests-details" style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                                  {entityRequests.map((request) => (
                                    <div key={request.request_id} className="treatment-request-item" style={{padding: '1rem', background: 'white', borderRadius: '8px', border: '2px solid #e5e7eb'}}>
                                      <div className="request-status" style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                                        <span className={`status-chip ${request.status}`}>
                                          {t(request.status.toLowerCase())}
                                        </span>
                                        <span className="request-date" style={{fontSize: '0.875rem', color: '#6b7280'}}>
                                          {new Date(request.created_at).toLocaleDateString()}
                                        </span>
                                      </div>
                                      <div className="request-symptoms" style={{fontSize: '0.875rem', marginBottom: '0.5rem'}}>
                                        <strong>{t('symptoms')}:</strong> {request.symptoms}
                                      </div>
                                      <div className="assigned-vet" style={{fontSize: '0.875rem'}}>
                                        <strong>{t('assigned_vet')}:</strong> Dr. {request.vet_name || request.vet_user_name}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <div className="module-card-footer">
                    <button
                      onClick={() => navigate(`/treatments/entity/${entity.entity_id}`)}
                      className="btn-card-action primary"
                    >
                      💊 {t('treatments')}
                    </button>
                    <button
                      onClick={() => navigate(`/vaccinations/entity/${entity.entity_id}`)}
                      className="btn-card-action secondary"
                    >
                      💉 {t('vaccinations')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchManagement;
