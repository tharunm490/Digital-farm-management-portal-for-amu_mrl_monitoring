import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { commonMedicines } from '../data/medicines';
import api from '../services/api';
import './TreatmentManagement.css';

const TreatmentManagement = () => {
  const [treatments, setTreatments] = useState([]);
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [mrlData, setMrlData] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    entity_id: '',
    active_ingredient: '',
    dose_mg_per_kg: '',
    route: 'Oral',
    frequency_per_day: '1',
    duration_days: '',
    start_date: '',
    end_date: '',
    withdrawal_period_days: ''
  });
  
  const navigate = useNavigate();
  const { entity_id } = useParams();

  useEffect(() => {
    fetchEntities();
    if (entity_id) {
      fetchTreatmentsByEntity(entity_id);
    }
  }, [entity_id]);

  const fetchEntities = async () => {
    try {
      const response = await api.get('/entities');
      setEntities(response.data);
    } catch (err) {
      console.error('Failed to fetch entities:', err);
      setError('Failed to load entities');
    }
  };

  const fetchTreatmentsByEntity = async (id) => {
    try {
      setLoading(true);
      const response = await api.get(`/treatments/entity/${id}`);
      setTreatments(response.data);
      
      // Get entity details
      const entity = entities.find(e => e.entity_id === parseInt(id));
      if (entity) {
        setSelectedEntity(entity);
        setFormData(prev => ({
          ...prev,
          entity_id: id
        }));
      }
    } catch (err) {
      console.error('Failed to fetch treatments:', err);
      setError('Failed to load treatments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      await api.post('/treatments', formData);
      alert('Treatment added successfully!');
      setShowAddForm(false);
      resetForm();
      if (entity_id) {
        fetchTreatmentsByEntity(entity_id);
      }
    } catch (err) {
      console.error('Error adding treatment:', err);
      setError(err.response?.data?.error || 'Failed to add treatment');
    }
  };

  const resetForm = () => {
    setFormData({
      entity_id: entity_id || '',
      active_ingredient: '',
      dose_mg_per_kg: '',
      route: 'Oral',
      frequency_per_day: '1',
      duration_days: '',
      start_date: '',
      end_date: '',
      withdrawal_period_days: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-calculate end date when start date and duration change
    if (name === 'start_date' || name === 'duration_days') {
      const startDate = name === 'start_date' ? value : formData.start_date;
      const duration = name === 'duration_days' ? value : formData.duration_days;
      
      if (startDate && duration) {
        const start = new Date(startDate);
        const end = new Date(start);
        end.setDate(end.getDate() + parseInt(duration));
        
        setFormData(prev => ({
          ...prev,
          end_date: end.toISOString().split('T')[0]
        }));
      }
    }
  };

  const handleEntitySelect = (entityId) => {
    setFormData(prev => ({
      ...prev,
      entity_id: entityId
    }));
    
    const entity = entities.find(e => e.entity_id === parseInt(entityId));
    setSelectedEntity(entity);
  };

  const checkMRL = async (activeIngredient, species) => {
    try {
      const response = await api.get('/treatments/mrl/check', {
        params: {
          active_ingredient: activeIngredient,
          species: species,
          matrix: selectedEntity?.matrix || 'Milk'
        }
      });
      setMrlData(response.data);
    } catch (err) {
      console.error('MRL check error:', err);
    }
  };

  useEffect(() => {
    if (formData.active_ingredient && selectedEntity?.species) {
      checkMRL(formData.active_ingredient, selectedEntity.species);
    }
  }, [formData.active_ingredient, selectedEntity]);

  if (loading && !showAddForm) {
    return (
      <div className="treatment-page">
        <Navigation />
        <div className="loading">Loading treatments...</div>
      </div>
    );
  }

  return (
    <div className="treatment-page">
      <Navigation />
      <div className="treatment-container">
        <div className="treatment-header">
          <h1>Treatment Management</h1>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary"
          >
            {showAddForm ? 'Cancel' : '+ Add Treatment'}
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {showAddForm && (
          <div className="treatment-form">
            <h2>Add New Treatment</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Animal/Batch *</label>
                  <select
                    name="entity_id"
                    value={formData.entity_id}
                    onChange={(e) => handleEntitySelect(e.target.value)}
                    required
                    className="form-control"
                  >
                    <option value="">Select Animal/Batch</option>
                    {entities.map(entity => (
                      <option key={entity.entity_id} value={entity.entity_id}>
                        {entity.entity_type === 'animal' ? entity.tag_id : entity.batch_name} 
                        ({entity.species}) - {entity.farm_name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedEntity && (
                  <div className="entity-info">
                    <p><strong>Species:</strong> {selectedEntity.species}</p>
                    {selectedEntity.breed && <p><strong>Breed:</strong> {selectedEntity.breed}</p>}
                    <p><strong>Product:</strong> {selectedEntity.matrix}</p>
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Active Ingredient *</label>
                  <select
                    name="active_ingredient"
                    value={formData.active_ingredient}
                    onChange={handleInputChange}
                    required
                    className="form-control"
                  >
                    <option value="">Select Medicine</option>
                    {commonMedicines.map(medicine => (
                      <option key={medicine} value={medicine}>
                        {medicine}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Dose (mg/kg) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="dose_mg_per_kg"
                    value={formData.dose_mg_per_kg}
                    onChange={handleInputChange}
                    required
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Route *</label>
                  <select
                    name="route"
                    value={formData.route}
                    onChange={handleInputChange}
                    required
                    className="form-control"
                  >
                    <option value="Oral">Oral</option>
                    <option value="Intramuscular">Intramuscular</option>
                    <option value="Intravenous">Intravenous</option>
                    <option value="Subcutaneous">Subcutaneous</option>
                    <option value="Topical">Topical</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Frequency (per day) *</label>
                  <input
                    type="number"
                    min="1"
                    name="frequency_per_day"
                    value={formData.frequency_per_day}
                    onChange={handleInputChange}
                    required
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>Duration (days) *</label>
                  <input
                    type="number"
                    min="1"
                    name="duration_days"
                    value={formData.duration_days}
                    onChange={handleInputChange}
                    required
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    required
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>End Date *</label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    required
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>Withdrawal Period (days) *</label>
                  <input
                    type="number"
                    min="0"
                    name="withdrawal_period_days"
                    value={formData.withdrawal_period_days}
                    onChange={handleInputChange}
                    required
                    className="form-control"
                  />
                </div>
              </div>

              {mrlData.length > 0 && (
                <div className="mrl-info">
                  <h3>MRL Information</h3>
                  {mrlData.map((mrl, idx) => (
                    <div key={idx} className="mrl-card">
                      <p><strong>Species:</strong> {mrl.species}</p>
                      <p><strong>Matrix:</strong> {mrl.matrix}</p>
                      <p><strong>MRL:</strong> {mrl.mrl_value_ppb} ppb</p>
                      <p><strong>Withdrawal Period:</strong> {mrl.withdrawal_period_days} days</p>
                      {mrl.notes && <p><strong>Notes:</strong> {mrl.notes}</p>}
                    </div>
                  ))}
                </div>
              )}

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  Add Treatment
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowAddForm(false);
                    resetForm();
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {!showAddForm && entity_id && (
          <div className="treatments-list">
            <h2>
              Treatments for {selectedEntity?.entity_type === 'animal' 
                ? selectedEntity?.tag_id 
                : selectedEntity?.batch_name}
            </h2>
            
            {treatments.length === 0 ? (
              <p className="no-data">No treatments found for this entity.</p>
            ) : (
              <div className="treatment-cards">
                {treatments.map(treatment => (
                  <div key={treatment.treatment_id} className="treatment-card">
                    <div className="treatment-header-card">
                      <h3>{treatment.active_ingredient}</h3>
                      <span className="badge">
                        {new Date() > new Date(treatment.end_date) ? 'Completed' : 'Active'}
                      </span>
                    </div>
                    
                    <div className="treatment-details">
                      <div className="detail-row">
                        <span className="label">Dose:</span>
                        <span className="value">{treatment.dose_mg_per_kg} mg/kg</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Route:</span>
                        <span className="value">{treatment.route}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Frequency:</span>
                        <span className="value">{treatment.frequency_per_day}x per day</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Duration:</span>
                        <span className="value">{treatment.duration_days} days</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Start Date:</span>
                        <span className="value">
                          {new Date(treatment.start_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="label">End Date:</span>
                        <span className="value">
                          {new Date(treatment.end_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Withdrawal Period:</span>
                        <span className="value">{treatment.withdrawal_period_days} days</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!showAddForm && !entity_id && (
          <div className="select-entity-prompt">
            <p>Please select an animal or batch to view and manage treatments.</p>
            <div className="entity-selector">
              <label>Select Animal/Batch:</label>
              <select
                onChange={(e) => navigate(`/treatments/entity/${e.target.value}`)}
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
          </div>
        )}
      </div>
    </div>
  );
};

export default TreatmentManagement;
