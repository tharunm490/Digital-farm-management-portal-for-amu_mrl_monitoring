import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navigation from '../components/Navigation';
import api from '../services/api';
import { getAllSpecies, getBreedsBySpecies } from '../data/speciesBreeds';
import './BatchManagement.css';

const BatchManagement = () => {
  const { farm_id } = useParams();
  const safeValue = (val) => {
    if (val == null) return '';
    if (typeof val === 'object') return '';
    return String(val);
  };

  const navigate = useNavigate();
  const [filteredEntities, setFilteredEntities] = useState([]);
  const [entities, setEntities] = useState([]);
  const [farms, setFarms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    <div className="batch-management-container">
      <Navigation />

      <div className="batch-content">
        <div className="page-header">
          {farm_id && (
            <button onClick={() => navigate('/farms')} className="btn-back">← Back to Farms</button>
          )}
          <div className="header-content">
            <h1>🐄 {farm_id ? `Batches for ${currentFarm?.farm_name || 'Farm'}` : 'Animal & Batch Management'}</h1>
            <p className="header-subtitle">{farm_id ? 'Manage batches for this farm' : 'Manage your livestock and poultry batches'}</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            <span className="btn-icon">+</span>
            {showForm ? 'Cancel' : 'Add New Entity'}
          </button>
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
              <h2>Add New {formData.entity_type === 'animal' ? 'Animal' : 'Batch'}</h2>
              <div className="form-badges">
                <span className={`badge ${formData.entity_type}`}>
                  {formData.entity_type === 'animal' ? 'Individual Animal' : 'Batch/Group'}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="entity-form">
              <div className="form-section">
                <h3>📍 Farm & Entity Type</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Farm Location *</label>
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
                        <option value="">Select Farm</option>
                        {farms.map((farm) => (
                          <option key={farm.farm_id} value={farm.farm_id}>
                            {farm.farm_name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Entity Type *</label>
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
                            <strong>Individual Animal</strong>
                            <small>Single cattle, goat, sheep</small>
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
                            <strong>Batch/Group</strong>
                            <small>Pigs or poultry groups</small>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {formData.entity_type === 'animal' && (
                <div className="form-section">
                  <h3>🏷️ Animal Identification</h3>
                  <div className="form-group">
                    <label>Tag ID *</label>
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
                    <small className="form-help">Unique identifier for this animal</small>
                  </div>
                </div>
              )}

              {formData.entity_type === 'batch' && (
                <div className="form-section">
                  <h3>📊 Batch Information</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Batch Name *</label>
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
                      <label>Number of Animals *</label>
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
                <h3>🔬 Species & Product Details</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Species *</label>
                    <select
                      name="species"
                      value={formData.species}
                      onChange={handleChange}
                      required
                      className="form-control"
                    >
                      <option value="">Select Species</option>
                      {getSpeciesOptions().map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Product Matrix *</label>
                    <select
                      name="matrix"
                      value={formData.matrix}
                      onChange={handleChange}
                      required
                      className="form-control"
                    >
                      <option value="milk">Milk</option>
                      <option value="meat">Meat</option>
                      <option value="egg">Egg</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  <span className="btn-icon">💾</span>
                  Add {formData.entity_type === 'animal' ? 'Animal' : 'Batch'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="entities-section">
          <div className="section-header">
            <h2>Your Entities ({filteredEntities.length})</h2>
            <div className="filter-tabs">
              <button className="tab active">All</button>
              <button className="tab">Animals</button>
              <button className="tab">Batches</button>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading your entities...</p>
            </div>
          ) : filteredEntities.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🐄</div>
              <h3>No entities found</h3>
              <p>Start by adding your first animal or batch to begin tracking.</p>
              <button onClick={() => setShowForm(true)} className="btn-primary">
                Add Your First Entity
              </button>
            </div>
          ) : (
            <div className="entities-grid">
              {filteredEntities.map((entity) => (
                <div key={entity.entity_id} className="entity-card modern">
                  <div className="card-header">
                    <div className="entity-info">
                      <div className="entity-type-icon">
                        {entity.entity_type === 'animal' ? '🐄' : '🐔'}
                      </div>
                      <div>
                        <h3 className="entity-title">
                          {entity.entity_type === 'animal'
                            ? safeValue(entity.tag_id)
                            : safeValue(entity.batch_name)}
                        </h3>
                        <div className="entity-meta">
                          <span className={`badge ${entity.entity_type}`}>
                            {entity.entity_type === 'animal' ? 'Individual' : 'Batch'}
                          </span>
                          <span className="species-badge">
                            {safeValue(entity.species)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="card-actions">
                      <button
                        onClick={() => generateQR(entity.entity_id)}
                        className="btn-icon primary"
                        title="Generate QR Code"
                      >
                        📱
                      </button>
                    </div>
                  </div>

                  <div className="card-content">
                    <div className="entity-details">
                      <div className="detail-item">
                        <span className="label">ID:</span>
                        <span className="value">#{safeValue(entity.entity_id)}</span>
                      </div>

                      <div className="detail-item">
                        <span className="label">Farm:</span>
                        <span className="value">{safeValue(entity.farm_name)}</span>
                      </div>

                      <div className="detail-item">
                        <span className="label">Product:</span>
                        <span className="value">{safeValue(entity.matrix)}</span>
                      </div>

                      {entity.entity_type === 'batch' && entity.batch_count && (
                        <div className="detail-item">
                          <span className="label">Count:</span>
                          <span className="value">{safeValue(entity.batch_count)} animals</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="card-footer">
                    <button
                      onClick={() =>
                        navigate(`/treatments/entity/${entity.entity_id}`)
                      }
                      className="btn-outline"
                    >
                      💊 Treatments
                    </button>
                    <button
                      onClick={() =>
                        navigate(`/vaccinations/entity/${entity.entity_id}`)
                      }
                      className="btn-outline"
                    >
                      💉 Vaccinations
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
