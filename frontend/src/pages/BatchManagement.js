import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import api from '../services/api';
import { getAllSpecies, getBreedsBySpecies } from '../data/speciesBreeds';
import './BatchManagement.css';

const BatchManagement = () => {
  const navigate = useNavigate();
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
    breed: '',
    matrix: 'milk',
    dob: '',
    age_months: '',
    weight_kg: '',
    animal_count: ''
  });

  const species = getAllSpecies();
  const breeds = formData.species ? getBreedsBySpecies(formData.species) : [];

  useEffect(() => {
    fetchEntities();
    fetchFarms();
  }, []);

  const fetchEntities = async () => {
    try {
      setLoading(true);
      const response = await api.get('/entities');
      setEntities(response.data);
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
      // Only get farms that belong to the logged-in user
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
        animal_count: value === 'batch' ? '' : '1'
      });
    } else if (name === 'species') {
      setFormData({
        ...formData,
        species: value,
        breed: ''
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (!formData.farm_id) {
        setError('Please select a farm');
        return;
      }
      if (formData.entity_type === 'animal' && !formData.tag_id) {
        setError('Tag ID is required for animals');
        return;
      }
      if (formData.entity_type === 'batch' && !formData.batch_name) {
        setError('Batch name is required for batches');
        return;
      }
      if (formData.entity_type === 'batch' && !formData.animal_count) {
        setError('Number of animals is required for batches');
        return;
      }

      const dataToSubmit = {
        farm_id: parseInt(formData.farm_id),
        entity_type: formData.entity_type,
        species: formData.species,
        breed: formData.breed || null,
        tag_id: formData.entity_type === 'animal' ? formData.tag_id : null,
        batch_name: formData.entity_type === 'batch' ? formData.batch_name : null,
        matrix: formData.matrix,
        dob: formData.dob || null,
        age_months: formData.age_months ? parseInt(formData.age_months) : null,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
        animal_count: formData.entity_type === 'batch' ? parseInt(formData.animal_count) : null
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
      breed: '',
      matrix: 'milk',
      dob: '',
      age_months: '',
      weight_kg: '',
      animal_count: ''
    });
  };

  const generateQR = (entityId) => {
    navigate(`/qr-generator?entity_id=${entityId}`);
  };

  return (
    <div className="batch-management-container">
      <Navigation />
      
      <div className="batch-content">
        <div className="batch-header">
          <h2>Animals & Batches Management</h2>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            {showForm ? 'Cancel' : '+ Add New'}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {showForm && (
          <div className="batch-form-card">
            <h3>Add New {formData.entity_type === 'animal' ? 'Animal' : 'Batch'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Farm *</label>
                <select
                  name="farm_id"
                  value={formData.farm_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Farm</option>
                  {farms.map(farm => (
                    <option key={farm.farm_id} value={farm.farm_id}>
                      {farm.farm_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Entity Type *</label>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      name="entity_type"
                      value="animal"
                      checked={formData.entity_type === 'animal'}
                      onChange={handleChange}
                    />
                    Individual Animal
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="entity_type"
                      value="batch"
                      checked={formData.entity_type === 'batch'}
                      onChange={handleChange}
                    />
                    Batch/Group
                  </label>
                </div>
              </div>

              {formData.entity_type === 'animal' ? (
                <div className="form-group">
                  <label>Tag ID *</label>
                  <input
                    type="text"
                    name="tag_id"
                    value={formData.tag_id}
                    onChange={handleChange}
                    required
                    placeholder="e.g., TAG01-cow-01"
                  />
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label>Batch Name *</label>
                    <input
                      type="text"
                      name="batch_name"
                      value={formData.batch_name}
                      onChange={handleChange}
                      required
                      placeholder="e.g., Batch-JAN-2024"
                    />
                  </div>
                  <div className="form-group">
                    <label>Number of Animals *</label>
                    <input
                      type="number"
                      name="animal_count"
                      value={formData.animal_count}
                      onChange={handleChange}
                      required
                      min="1"
                      placeholder="e.g., 50"
                    />
                  </div>
                </>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Species *</label>
                  <select
                    name="species"
                    value={formData.species}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Species</option>
                    {species.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Breed</label>
                  <select
                    name="breed"
                    value={formData.breed}
                    onChange={handleChange}
                    disabled={!formData.species}
                  >
                    <option value="">Select Breed</option>
                    {breeds.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Product Matrix *</label>
                  <select
                    name="matrix"
                    value={formData.matrix}
                    onChange={handleChange}
                    required
                  >
                    <option value="milk">Milk</option>
                    <option value="meat">Meat</option>
                    <option value="egg">Egg</option>
                  </select>
                </div>

                {formData.entity_type === 'animal' && (
                  <div className="form-group">
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      name="dob"
                      value={formData.dob}
                      onChange={handleChange}
                    />
                  </div>
                )}
              </div>

              {formData.entity_type === 'animal' && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Age (months)</label>
                    <input
                      type="number"
                      name="age_months"
                      value={formData.age_months}
                      onChange={handleChange}
                      min="0"
                      placeholder="e.g., 24"
                    />
                  </div>

                  <div className="form-group">
                    <label>Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      name="weight_kg"
                      value={formData.weight_kg}
                      onChange={handleChange}
                      min="0"
                      placeholder="e.g., 350.5"
                    />
                  </div>
                </div>
              )}

              <button type="submit" className="btn-submit">
                Add {formData.entity_type === 'animal' ? 'Animal' : 'Batch'}
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="loading">Loading...</div>
        ) : entities.length === 0 ? (
          <div className="empty-state">
            <p>No entities found. Add your first animal or batch!</p>
          </div>
        ) : (
          <div className="entities-grid">
            {entities.map((entity) => (
              <div key={entity.entity_id} className="entity-card">
                <div className="entity-header">
                  <div>
                    <span className="entity-type-badge">{entity.entity_type}</span>
                    <h3>
                      {entity.entity_type === 'animal' ? entity.tag_id : entity.batch_name}
                    </h3>
                  </div>
                  <div className="entity-actions">
                    <button 
                      onClick={() => generateQR(entity.entity_id)} 
                      className="btn-icon" 
                      title="Generate QR Code"
                    >
                      📱
                    </button>
                  </div>
                </div>

                <div className="entity-details">
                  <div className="detail-row">
                    <span className="label">ID:</span>
                    <span className="value">#{entity.entity_id}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Species:</span>
                    <span className="value">{entity.species}</span>
                  </div>
                  {entity.breed && (
                    <div className="detail-row">
                      <span className="label">Breed:</span>
                      <span className="value">{entity.breed}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="label">Farm:</span>
                    <span className="value">{entity.farm_name || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Product:</span>
                    <span className="value">{entity.matrix}</span>
                  </div>
                  {entity.entity_type === 'batch' && entity.animal_count && (
                    <div className="detail-row">
                      <span className="label">Animals:</span>
                      <span className="value">{entity.animal_count}</span>
                    </div>
                  )}
                  {entity.entity_type === 'animal' && entity.weight_kg && (
                    <div className="detail-row">
                      <span className="label">Weight:</span>
                      <span className="value">{entity.weight_kg} kg</span>
                    </div>
                  )}
                  {entity.entity_type === 'animal' && entity.age_months && (
                    <div className="detail-row">
                      <span className="label">Age:</span>
                      <span className="value">{entity.age_months} months</span>
                    </div>
                  )}
                </div>

                <div className="entity-footer">
                  <button 
                    onClick={() => navigate(`/treatments/entity/${entity.entity_id}`)} 
                    className="btn-secondary"
                  >
                    View Treatments
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchManagement;
