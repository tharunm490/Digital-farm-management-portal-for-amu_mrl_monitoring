import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './VetTreatmentRecording.css';

const VetTreatmentRecording = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { farmId } = useParams();

  const [farms, setFarms] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState(farmId || '');
  const [entities, setEntities] = useState([]);
  const [treatmentHistory, setTreatmentHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    entity_id: '',
    medicine: '',
    medication_type: 'Antibiotic',
    dosage: '',
    dose_unit: 'ml',
    frequency_per_day: '',
    duration_days: '',
    route: 'IM',
    reason: '',
    diagnosis: '',
    application_date: new Date().toISOString().split('T')[0],
    withdrawal_period_days: '',
    is_vaccine: false,
    vaccine_interval_days: '',
    vaccine_total_months: ''
  });

  const routes = ['IM', 'IV', 'Oral', 'SC', 'Inhalation', 'Intranasal'];
  const units = ['ml', 'mg', 'g', 'IU', 'mg/kg'];
  const reasons = ['Therapeutic', 'Prophylactic', 'Metaphylactic', 'Growth Promotion'];

  // Fetch assigned farms on mount
  useEffect(() => {
    if (user?.role !== 'veterinarian') {
      navigate('/');
      return;
    }
    fetchAssignedFarms();
  }, [user]);

  // Fetch entities when farm changes
  useEffect(() => {
    if (selectedFarm) {
      setFormData(prev => ({ ...prev, entity_id: '' }));
      setTreatmentHistory([]);
      fetchEntities(selectedFarm);
    }
  }, [selectedFarm]);

  // Fetch treatment history when entity changes
  useEffect(() => {
    if (formData.entity_id) {
      fetchTreatmentHistory(formData.entity_id);
    }
  }, [formData.entity_id]);

  const fetchAssignedFarms = async () => {
    try {
      setLoading(true);
      const response = await api.get('/vet-treatments/assigned-farms/withdrawals');
      const farmsData = response.data?.data || response.data || [];
      setFarms(Array.isArray(farmsData) ? farmsData : []);
      if (farmId && farmsData) {
        setSelectedFarm(farmId);
      }
    } catch (err) {
      console.error('Error fetching farms:', err);
      setError('Failed to load assigned farms');
      setFarms([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEntities = async (fId) => {
    try {
      const response = await api.get(`/vet-treatments/farm/${fId}/entities`);
      const entitiesData = response.data?.data || response.data || [];
      setEntities(Array.isArray(entitiesData) ? entitiesData : []);
    } catch (err) {
      console.error('Error fetching entities:', err);
      setError('Failed to load animals');
      setEntities([]);
    }
  };

  const fetchTreatmentHistory = async (entityId) => {
    try {
      const response = await api.get(`/vet-treatments/entity/${entityId}/history`);
      const historyData = response.data?.data || response.data || [];
      setTreatmentHistory(Array.isArray(historyData) ? historyData : []);
    } catch (err) {
      console.error('Error fetching history:', err);
      setTreatmentHistory([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedFarm || !formData.entity_id || !formData.medicine) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post(
        `/vet-treatments/farm/${selectedFarm}/record`,
        formData
      );

      setSuccess('Treatment recorded successfully!');
      setFormData({
        entity_id: formData.entity_id,
        medicine: '',
        dosage: '',
        dose_unit: 'ml',
        frequency_per_day: '',
        duration_days: '',
        route: 'IM',
        reason: '',
        diagnosis: '',
        application_date: new Date().toISOString().split('T')[0],
        withdrawal_period_days: '',
        is_vaccine: false,
        vaccine_interval_days: '',
        vaccine_total_months: ''
      });

      // Refresh treatment history
      if (formData.entity_id) {
        fetchTreatmentHistory(formData.entity_id);
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error recording treatment:', err);
      setError(err.response?.data?.error || 'Failed to record treatment');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateInt) => {
    if (!dateInt) return 'N/A';
    const dateStr = dateInt.toString();
    if (dateStr.length !== 8) return dateInt;
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    return `${day}/${month}/${year}`;
  };

  const getStatusColor = (days) => {
    if (!days) return 'gray';
    if (days <= 0) return 'green';
    if (days <= 3) return 'orange';
    return 'red';
  };

  if (loading && farms.length === 0) {
    return (
      <div className="vet-treatment-recording">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="vet-treatment-recording">
      <div className="vtr-header">
        <h1>📝 Record Treatment</h1>
        <p>Record treatments on assigned farms and track withdrawal periods</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="vtr-container">
        {/* Form Section */}
        <div className="vtr-form-section">
          <form onSubmit={handleSubmit} className="vtr-form">
            <div className="form-group">
              <label>📍 Assigned Farm *</label>
              <select
                name="farm"
                value={selectedFarm}
                onChange={(e) => setSelectedFarm(e.target.value)}
                required
              >
                <option value="">Select a farm</option>
                {farms.map(farm => (
                  <option key={farm.farm_id} value={farm.farm_id}>
                    {farm.farm_name} ({farm.animal_count} animals)
                  </option>
                ))}
              </select>
            </div>

            {selectedFarm && (
              <>
                <div className="form-group">
                  <label>🐄 Animal/Batch *</label>
                  <select
                    name="entity_id"
                    value={formData.entity_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select animal or batch</option>
                    {entities.map(entity => (
                      <option key={entity.entity_id} value={entity.entity_id}>
                        {entity.tag_id || entity.batch_name} ({entity.species})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>💊 Medicine *</label>
                    <input
                      type="text"
                      name="medicine"
                      value={formData.medicine}
                      onChange={handleInputChange}
                      placeholder="e.g., Amoxicillin"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Medication Type *</label>
                    <select
                      name="medication_type"
                      value={formData.medication_type}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="Antibiotic">Antibiotic</option>
                      <option value="Antiparasitic">Antiparasitic</option>
                      <option value="Anti Inflammatory">Anti Inflammatory</option>
                      <option value="NSAID">NSAID</option>
                      <option value="Hormonal">Hormonal</option>
                      <option value="Anticoccidial">Anticoccidial</option>
                      <option value="Vaccine">Vaccine</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Dosage *</label>
                    <div className="dosage-input">
                      <input
                        type="number"
                        name="dosage"
                        value={formData.dosage}
                        onChange={handleInputChange}
                        placeholder="Amount"
                        step="0.01"
                        required
                      />
                      <select
                        name="dose_unit"
                        value={formData.dose_unit}
                        onChange={handleInputChange}
                      >
                        {units.map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Frequency (per day)</label>
                    <input
                      type="number"
                      name="frequency_per_day"
                      value={formData.frequency_per_day}
                      onChange={handleInputChange}
                      placeholder="e.g., 2"
                      min="1"
                    />
                  </div>

                  <div className="form-group">
                    <label>Duration (days)</label>
                    <input
                      type="number"
                      name="duration_days"
                      value={formData.duration_days}
                      onChange={handleInputChange}
                      placeholder="e.g., 5"
                      min="1"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Route</label>
                    <select name="route" value={formData.route} onChange={handleInputChange}>
                      {routes.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Reason</label>
                    <select name="reason" value={formData.reason} onChange={handleInputChange}>
                      <option value="">Select reason</option>
                      {reasons.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Diagnosis</label>
                  <input
                    type="text"
                    name="diagnosis"
                    value={formData.diagnosis}
                    onChange={handleInputChange}
                    placeholder="e.g., Respiratory infection"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Application Date</label>
                    <input
                      type="date"
                      name="application_date"
                      value={formData.application_date}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Withdrawal Period (days)</label>
                    <input
                      type="number"
                      name="withdrawal_period_days"
                      value={formData.withdrawal_period_days}
                      onChange={handleInputChange}
                      placeholder="e.g., 14"
                      min="0"
                    />
                  </div>
                </div>

                <div className="form-group checkbox">
                  <label>
                    <input
                      type="checkbox"
                      name="is_vaccine"
                      checked={formData.is_vaccine}
                      onChange={handleInputChange}
                    />
                    Is this a vaccine?
                  </label>
                </div>

                {formData.is_vaccine && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Vaccine Interval (days)</label>
                      <input
                        type="number"
                        name="vaccine_interval_days"
                        value={formData.vaccine_interval_days}
                        onChange={handleInputChange}
                        placeholder="Days between doses"
                      />
                    </div>

                    <div className="form-group">
                      <label>Total Duration (months)</label>
                      <input
                        type="number"
                        name="vaccine_total_months"
                        value={formData.vaccine_total_months}
                        onChange={handleInputChange}
                        placeholder="Total vaccination period"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-submit"
                  disabled={submitting}
                >
                  {submitting ? 'Recording...' : '✅ Record Treatment'}
                </button>
              </>
            )}
          </form>
        </div>

        {/* Treatment History Section */}
        {formData.entity_id && (
          <div className="vtr-history-section">
            <h2>📋 Treatment History</h2>
            {treatmentHistory.length === 0 ? (
              <div className="no-history">No previous treatments recorded</div>
            ) : (
              <div className="history-list">
                {treatmentHistory.map((treatment, idx) => (
                  <div key={idx} className="history-card">
                    <div className="history-header">
                      <h3>{treatment.medicine}</h3>
                      <span className={`status status-${getStatusColor(treatment.days_until_safe)}`}>
                        {treatment.days_until_safe === null || treatment.days_until_safe === undefined
                          ? 'No withdrawal'
                          : treatment.days_until_safe <= 0
                            ? '✅ Safe'
                            : `${treatment.days_until_safe}d`}
                      </span>
                    </div>
                    <div className="history-details">
                      <p><strong>Dosage:</strong> {treatment.dosage} {treatment.dose_unit}</p>
                      <p><strong>Frequency:</strong> {treatment.frequency_per_day}x daily</p>
                      <p><strong>Route:</strong> {treatment.route}</p>
                      <p><strong>Diagnosis:</strong> {treatment.diagnosis || 'N/A'}</p>
                      <p><strong>Applied:</strong> {formatDate(treatment.application_date)}</p>
                      <p><strong>Safe Date:</strong> {new Date(treatment.safe_date).toLocaleDateString()}</p>
                      <p><strong>Recorded by:</strong> {treatment.vet_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VetTreatmentRecording;
