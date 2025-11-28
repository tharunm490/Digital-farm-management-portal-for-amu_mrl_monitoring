import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../pages/CreatePrescription.css';

const CreatePrescription = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    farm_id: '',
    entity_id: '',
    drug_id: '',
    diagnosis: '',
    dose_amount: '',
    dose_unit: 'ml',
    frequency_per_day: '',
    duration_days: '',
    route: 'IM',
    notes: ''
  });

  const [farms, setFarms] = useState([]);
  const [entities, setEntities] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [selectedDrug, setSelectedDrug] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [mrlData, setMrlData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchDrug, setSearchDrug] = useState('');
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user?.role !== 'veterinarian') {
      navigate('/');
      return;
    }
    fetchInitialData();
  }, [user]);

  useEffect(() => {
    if (formData.farm_id) {
      fetchEntities(formData.farm_id);
    }
  }, [formData.farm_id]);

  useEffect(() => {
    if (searchDrug.length > 2) {
      searchDrugs(searchDrug);
    }
  }, [searchDrug]);

  useEffect(() => {
    if (selectedDrug && formData.entity_id) {
      fetchMRLData();
      fetchAlternatives();
    }
  }, [selectedDrug, formData.entity_id]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const farmsRes = await api.get('/api/farms', {
        params: { vet_id: user?.user_id }
      });
      const farmsData = farmsRes.data?.data || farmsRes.data || [];
      setFarms(Array.isArray(farmsData) ? farmsData : []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      setFarms([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchEntities = async (farmId) => {
    try {
      const res = await api.get(`/api/farms/${farmId}/entities`);
      const entitiesData = res.data?.data || res.data || [];
      setEntities(Array.isArray(entitiesData) ? entitiesData : []);
    } catch (error) {
      console.error('Error fetching entities:', error);
      setEntities([]); // Set empty array on error
    }
  };

  const searchDrugs = async (query) => {
    try {
      const res = await api.get('/api/drugs/search', {
        params: { q: query }
      });
      setDrugs(res.data || []);
    } catch (error) {
      console.error('Error searching drugs:', error);
    }
  };

  const fetchMRLData = async () => {
    try {
      if (!selectedDrug || !formData.entity_id) return;

      const entity = Array.isArray(entities) ? entities.find(e => e.entity_id === parseInt(formData.entity_id)) : null;
      if (!entity) return;

      const res = await api.get(`/api/drugs/${selectedDrug.drug_id}/mrl`, {
        params: {
          species: entity.species,
          matrix: entity.matrix
        }
      });

      setMrlData(res.data);
    } catch (error) {
      console.error('Error fetching MRL data:', error);
    }
  };

  const fetchAlternatives = async () => {
    try {
      if (!selectedDrug || !formData.entity_id) return;

      const entity = Array.isArray(entities) ? entities.find(e => e.entity_id === parseInt(formData.entity_id)) : null;
      if (!entity) return;

      const res = await api.get(`/api/drugs/${selectedDrug.drug_id}/alternatives`, {
        params: {
          species: entity.species,
          matrix: entity.matrix
        }
      });

      setAlternatives(res.data || []);
    } catch (error) {
      console.error('Error fetching alternatives:', error);
    }
  };

  const handleSelectDrug = (drug) => {
    setSelectedDrug(drug);
    setFormData(prev => ({
      ...prev,
      drug_id: drug.drug_id
    }));
    setDrugs([]);
    setSearchDrug(drug.drug_name);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.farm_id) newErrors.farm_id = 'Farm is required';
    if (!formData.entity_id) newErrors.entity_id = 'Animal/Batch is required';
    if (!formData.drug_id) newErrors.drug_id = 'Drug is required';
    if (!formData.diagnosis) newErrors.diagnosis = 'Diagnosis is required';
    if (!formData.dose_amount) newErrors.dose_amount = 'Dose amount is required';
    if (!formData.frequency_per_day) newErrors.frequency_per_day = 'Frequency is required';
    if (!formData.duration_days) newErrors.duration_days = 'Duration is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);

      const prescriptionData = {
        ...formData,
        vet_id: user?.user_id,
        farm_id: parseInt(formData.farm_id),
        entity_id: parseInt(formData.entity_id),
        drug_id: parseInt(formData.drug_id),
        dose_amount: parseFloat(formData.dose_amount),
        frequency_per_day: parseInt(formData.frequency_per_day),
        duration_days: parseInt(formData.duration_days)
      };

      const res = await api.post('/api/prescriptions', prescriptionData);

      if (res.status === 201 || res.status === 200) {
        navigate('/vet/prescriptions', {
          state: { message: 'Prescription created successfully!' }
        });
      }
    } catch (error) {
      console.error('Error creating prescription:', error);
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const entity = Array.isArray(entities) ? entities.find(e => e.entity_id === parseInt(formData.entity_id)) : null;

  return (
    <div className="create-prescription">
      <div className="rx-container">
        <div className="rx-header-section">
          <h1>📝 Create E-Prescription</h1>
          <p>Issue a prescription for AMU treatment</p>
        </div>

        <form onSubmit={handleSubmit} className="prescription-form">
          {errors.submit && (
            <div className="error-message">{errors.submit}</div>
          )}

          {/* Farm & Entity Selection */}
          <div className="form-section">
            <h3>Select Farm & Animal</h3>

            <div className="form-group">
              <label htmlFor="farm_id">Farm *</label>
              <select
                id="farm_id"
                name="farm_id"
                value={formData.farm_id}
                onChange={handleInputChange}
                className={errors.farm_id ? 'error' : ''}
              >
                <option value="">-- Select Farm --</option>
                {farms.map(farm => (
                  <option key={farm.farm_id} value={farm.farm_id}>
                    {farm.farm_name}
                  </option>
                ))}
              </select>
              {errors.farm_id && <span className="error-text">{errors.farm_id}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="entity_id">Animal/Batch *</label>
              <select
                id="entity_id"
                name="entity_id"
                value={formData.entity_id}
                onChange={handleInputChange}
                className={errors.entity_id ? 'error' : ''}
              >
                <option value="">-- Select Animal/Batch --</option>
                {entities.map(entity => (
                  <option key={entity.entity_id} value={entity.entity_id}>
                    {entity.batch_name || entity.tag_id} ({entity.species})
                  </option>
                ))}
              </select>
              {errors.entity_id && <span className="error-text">{errors.entity_id}</span>}
            </div>
          </div>

          {/* Drug Selection */}
          <div className="form-section">
            <h3>Drug Selection</h3>

            <div className="form-group">
              <label htmlFor="drug_search">Search Drug *</label>
              <div className="drug-search">
                <input
                  type="text"
                  id="drug_search"
                  placeholder="Search by drug name or ingredient..."
                  value={searchDrug}
                  onChange={(e) => setSearchDrug(e.target.value)}
                  className={errors.drug_id ? 'error' : ''}
                />
                {drugs.length > 0 && (
                  <div className="drug-dropdown">
                    {drugs.map(drug => (
                      <div
                        key={drug.drug_id}
                        className="drug-option"
                        onClick={() => handleSelectDrug(drug)}
                      >
                        <div className="drug-name">{drug.drug_name}</div>
                        <div className="drug-info">
                          <span className="criticality" data-level={drug.who_criticality}>
                            {drug.who_criticality?.toUpperCase()}
                          </span>
                          {drug.banned_for_food_animals && (
                            <span className="banned">⚠️ BANNED</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {errors.drug_id && <span className="error-text">{errors.drug_id}</span>}
            </div>

            {/* Selected Drug Info */}
            {selectedDrug && (
              <div className="drug-info-card">
                <h4>{selectedDrug.drug_name}</h4>
                <div className="drug-details">
                  <p><strong>Class:</strong> {selectedDrug.drug_class}</p>
                  <p><strong>Criticality:</strong> {selectedDrug.who_criticality.toUpperCase()}</p>
                  <p><strong>Active Ingredient:</strong> {selectedDrug.active_ingredient}</p>
                  {selectedDrug.banned_for_food_animals && (
                    <p className="warning">⚠️ This drug is BANNED for food animals!</p>
                  )}
                </div>

                {/* MRL Information */}
                {mrlData && entity && (
                  <div className="mrl-info">
                    <h5>MRL Information for {entity.species.toUpperCase()} {entity.matrix}</h5>
                    {mrlData.length > 0 ? (
                      <div className="mrl-grid">
                        {mrlData.map((mrl, idx) => (
                          <div key={idx} className="mrl-item">
                            <p><strong>MRL:</strong> {mrl.mrl_value_ppb} ppb</p>
                            <p><strong>Withdrawal:</strong> {mrl.withdrawal_days} days</p>
                            <p><strong>Source:</strong> {mrl.source.toUpperCase()}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-data">No MRL data available for this species/matrix combination</p>
                    )}
                  </div>
                )}

                {/* Safer Alternatives */}
                {alternatives.length > 0 && (
                  <div className="alternatives-section">
                    <button
                      type="button"
                      className="show-alternatives-btn"
                      onClick={() => setShowAlternatives(!showAlternatives)}
                    >
                      💡 {showAlternatives ? 'Hide' : 'Show'} Safer Alternatives ({alternatives.length})
                    </button>
                    {showAlternatives && (
                      <div className="alternatives-list">
                        {alternatives.map(alt => (
                          <div
                            key={alt.drug_id}
                            className="alternative-item"
                            onClick={() => handleSelectDrug(alt)}
                          >
                            <div className="alt-name">{alt.drug_name}</div>
                            <div className="alt-badge">{alt.who_criticality}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Diagnosis & Dosage */}
          <div className="form-section">
            <h3>Diagnosis & Dosage</h3>

            <div className="form-group">
              <label htmlFor="diagnosis">Diagnosis *</label>
              <textarea
                id="diagnosis"
                name="diagnosis"
                value={formData.diagnosis}
                onChange={handleInputChange}
                placeholder="Describe the condition being treated..."
                className={errors.diagnosis ? 'error' : ''}
                rows="3"
              />
              {errors.diagnosis && <span className="error-text">{errors.diagnosis}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="dose_amount">Dose Amount *</label>
                <input
                  type="number"
                  id="dose_amount"
                  name="dose_amount"
                  value={formData.dose_amount}
                  onChange={handleInputChange}
                  placeholder="e.g., 500"
                  step="0.1"
                  className={errors.dose_amount ? 'error' : ''}
                />
                {errors.dose_amount && <span className="error-text">{errors.dose_amount}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="dose_unit">Unit *</label>
                <select
                  id="dose_unit"
                  name="dose_unit"
                  value={formData.dose_unit}
                  onChange={handleInputChange}
                >
                  <option value="ml">ml</option>
                  <option value="mg">mg</option>
                  <option value="g">g</option>
                  <option value="tablet">tablet</option>
                  <option value="sachet">sachet</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="frequency_per_day">Frequency (per day) *</label>
                <input
                  type="number"
                  id="frequency_per_day"
                  name="frequency_per_day"
                  value={formData.frequency_per_day}
                  onChange={handleInputChange}
                  min="1"
                  max="4"
                  className={errors.frequency_per_day ? 'error' : ''}
                />
                {errors.frequency_per_day && <span className="error-text">{errors.frequency_per_day}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="duration_days">Duration (days) *</label>
                <input
                  type="number"
                  id="duration_days"
                  name="duration_days"
                  value={formData.duration_days}
                  onChange={handleInputChange}
                  min="1"
                  max="30"
                  className={errors.duration_days ? 'error' : ''}
                />
                {errors.duration_days && <span className="error-text">{errors.duration_days}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="route">Route *</label>
                <select
                  id="route"
                  name="route"
                  value={formData.route}
                  onChange={handleInputChange}
                >
                  <option value="IM">IM (Intramuscular)</option>
                  <option value="IV">IV (Intravenous)</option>
                  <option value="SC">SC (Subcutaneous)</option>
                  <option value="oral">Oral</option>
                  <option value="water">In Water</option>
                  <option value="feed">In Feed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="form-section">
            <h3>Additional Information</h3>

            <div className="form-group">
              <label htmlFor="notes">Clinical Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Any additional clinical notes or special considerations..."
                rows="3"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/vet/prescriptions')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Prescription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePrescription;
