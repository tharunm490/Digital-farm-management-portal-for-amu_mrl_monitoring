import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navigation from '../components/Navigation';
import api from '../services/api';
import './VaccinationManagement.css';

const VaccinationManagement = () => {
  const [vaccinations, setVaccinations] = useState([]);
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    entity_id: '',
    vaccine_name: '',
    vaccination_date: '',
    next_due_date: '',
    batch_number: '',
    manufacturer: '',
    vet_id: '',
    vet_name: '',
    dosage: '',
    route: 'IM',
    notes: ''
  });

  const navigate = useNavigate();
  const { entity_id } = useParams();

  // Format date as DD/MM/YYYY
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  // Convert date to integer format YYYYMMDD
  const dateToInt = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return parseInt(`${year}${month}${day}`);
  };

  useEffect(() => {
    fetchEntities();
    if (entity_id) {
      fetchVaccinationsByEntity(entity_id);
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

  const fetchVaccinationsByEntity = async (id) => {
    try {
      setLoading(true);
      const response = await api.get(`/vaccinations/entity/${id}`);
      setVaccinations(response.data);

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
      console.error('Failed to fetch vaccinations:', err);
      setError('Failed to load vaccinations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const submitData = {
        entity_id: formData.entity_id,
        vaccine_name: formData.vaccine_name,
        vaccination_date: dateToInt(formData.vaccination_date),
        next_due_date: dateToInt(formData.next_due_date),
        batch_number: formData.batch_number,
        manufacturer: formData.manufacturer,
        vet_id: formData.vet_id,
        vet_name: formData.vet_name,
        dosage: formData.dosage,
        route: formData.route,
        notes: formData.notes
      };

      await api.post('/vaccinations', submitData);
      alert('Vaccination record added successfully!');
      setShowAddForm(false);
      resetForm();
      if (entity_id) {
        fetchVaccinationsByEntity(entity_id);
      }
    } catch (err) {
      console.error('Error adding vaccination:', err);
      setError(err.response?.data?.error || 'Failed to add vaccination record');
    }
  };

  const resetForm = () => {
    setFormData({
      entity_id: entity_id || '',
      vaccine_name: '',
      vaccination_date: '',
      next_due_date: '',
      batch_number: '',
      manufacturer: '',
      vet_id: '',
      vet_name: '',
      dosage: '',
      route: 'IM',
      notes: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEntitySelect = (entityId) => {
    const entity = entities.find(e => e.entity_id === parseInt(entityId));
    setSelectedEntity(entity);
    setFormData(prev => ({
      ...prev,
      entity_id: entityId
    }));
  };

  // Check if vet fields are required based on species
  const isVetRequired = () => {
    return selectedEntity?.species && ['cattle', 'goat', 'sheep'].includes(selectedEntity.species);
  };

  if (loading && !showAddForm) {
    return (
      <div className="vaccination-page">
        <Navigation />
        <div className="loading">Loading vaccinations...</div>
      </div>
    );
  }

  return (
    <div className="vaccination-page">
      <Navigation />
      <div className="vaccination-container">
        <div className="vaccination-header">
          <h1>💉 Vaccination Management</h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary"
          >
            {showAddForm ? 'Cancel' : '+ Add Vaccination'}
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {showAddForm && (
          <div className="vaccination-form-card">
            <h2>Add New Vaccination Record</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-section">
                <h3>Animal/Batch Information</h3>
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
                    <div className="entity-info-card">
                      <h4>Selected Entity Details</h4>
                      <div className="entity-details">
                        <span><strong>Species:</strong> {selectedEntity.species}</span>
                        <span><strong>Type:</strong> {selectedEntity.entity_type === 'animal' ? 'Individual Animal' : 'Batch'}</span>
                        <span><strong>Product:</strong> {selectedEntity.matrix}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-section">
                <h3>Vaccine Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Vaccine Name *</label>
                    <input
                      type="text"
                      name="vaccine_name"
                      value={formData.vaccine_name}
                      onChange={handleInputChange}
                      required
                      className="form-control"
                      placeholder="e.g., FMD Vaccine, HS Vaccine"
                    />
                  </div>

                  <div className="form-group">
                    <label>Manufacturer</label>
                    <input
                      type="text"
                      name="manufacturer"
                      value={formData.manufacturer}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="e.g., Indian Immunologicals Ltd."
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Batch Number</label>
                    <input
                      type="text"
                      name="batch_number"
                      value={formData.batch_number}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="Vaccine batch number"
                    />
                  </div>

                  <div className="form-group">
                    <label>Dosage</label>
                    <input
                      type="text"
                      name="dosage"
                      value={formData.dosage}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="e.g., 2ml, 5ml"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Route of Administration *</label>
                    <select
                      name="route"
                      value={formData.route}
                      onChange={handleInputChange}
                      required
                      className="form-control"
                    >
                      <option value="IM">Intramuscular (IM)</option>
                      <option value="SC">Subcutaneous (SC)</option>
                      <option value="IV">Intravenous (IV)</option>
                      <option value="oral">Oral</option>
                      <option value="wing-web">Wing Web</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Vaccination Schedule</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Vaccination Date *</label>
                    <input
                      type="date"
                      name="vaccination_date"
                      value={formData.vaccination_date}
                      onChange={handleInputChange}
                      required
                      className="form-control"
                    />
                  </div>

                  <div className="form-group">
                    <label>Next Due Date</label>
                    <input
                      type="date"
                      name="next_due_date"
                      value={formData.next_due_date}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>
                </div>
              </div>

              {isVetRequired() && (
                <div className="form-section">
                  <h3>Veterinarian Information</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Vet ID *</label>
                      <input
                        type="text"
                        name="vet_id"
                        value={formData.vet_id}
                        onChange={handleInputChange}
                        required
                        className="form-control"
                        placeholder="Veterinarian ID"
                      />
                    </div>

                    <div className="form-group">
                      <label>Vet Name *</label>
                      <input
                        type="text"
                        name="vet_name"
                        value={formData.vet_name}
                        onChange={handleInputChange}
                        required
                        className="form-control"
                        placeholder="Veterinarian Name"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="form-section">
                <h3>Additional Notes</h3>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="form-control"
                    placeholder="Any additional notes about the vaccination..."
                    rows="3"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  Add Vaccination Record
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
          <div className="vaccinations-list">
            <h2>
              Vaccination History for {selectedEntity?.entity_type === 'animal'
                ? selectedEntity?.tag_id
                : selectedEntity?.batch_name}
            </h2>

            {vaccinations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💉</div>
                <h3>No vaccination records found</h3>
                <p>This animal/batch hasn't been vaccinated yet. Add the first vaccination record.</p>
              </div>
            ) : (
              <div className="vaccination-cards">
                {vaccinations.map(vaccination => (
                  <div key={vaccination.vaccination_id} className="vaccination-card">
                    <div className="vaccination-header">
                      <h3>{vaccination.vaccine_name}</h3>
                      <span className="vaccination-date">
                        {formatDate(vaccination.vaccination_date)}
                      </span>
                    </div>

                    <div className="vaccination-details">
                      <div className="detail-row">
                        <span className="label">Route:</span>
                        <span className="value">{vaccination.route}</span>
                      </div>

                      {vaccination.dosage && (
                        <div className="detail-row">
                          <span className="label">Dosage:</span>
                          <span className="value">{vaccination.dosage}</span>
                        </div>
                      )}

                      {vaccination.batch_number && (
                        <div className="detail-row">
                          <span className="label">Batch:</span>
                          <span className="value">{vaccination.batch_number}</span>
                        </div>
                      )}

                      {vaccination.manufacturer && (
                        <div className="detail-row">
                          <span className="label">Manufacturer:</span>
                          <span className="value">{vaccination.manufacturer}</span>
                        </div>
                      )}

                      {vaccination.next_due_date && (
                        <div className="detail-row">
                          <span className="label">Next Due:</span>
                          <span className="value">
                            {formatDate(vaccination.next_due_date)}
                          </span>
                        </div>
                      )}

                      {vaccination.vet_name && (
                        <div className="detail-row">
                          <span className="label">Veterinarian:</span>
                          <span className="value">{vaccination.vet_name}</span>
                        </div>
                      )}

                      {vaccination.notes && (
                        <div className="detail-row full-width">
                          <span className="label">Notes:</span>
                          <span className="value">{vaccination.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!showAddForm && !entity_id && (
          <div className="select-entity-prompt">
            <div className="prompt-content">
              <div className="prompt-icon">💉</div>
              <h2>Select an Animal or Batch</h2>
              <p>Please select an animal or batch to view and manage vaccination records.</p>
              <div className="entity-selector">
                <label>Select Animal/Batch:</label>
                <select
                  onChange={(e) => navigate(`/vaccinations/entity/${e.target.value}`)}
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
          </div>
        )}
      </div>
    </div>
  );
};

export default VaccinationManagement;