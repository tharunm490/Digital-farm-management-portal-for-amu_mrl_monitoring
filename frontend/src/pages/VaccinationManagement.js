import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navigation from '../components/Navigation';
import api from '../services/api';
import './VaccinationManagement.css';

const VaccinationManagement = () => {
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vaccinationHistory, setVaccinationHistory] = useState([]);
  const [showHistorySection, setShowHistorySection] = useState(false);
  const [vaccineTreatments, setVaccineTreatments] = useState([]);

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
      fetchVaccinationHistory(entity_id);
      fetchVaccineTreatments(entity_id);
      // Get entity details
      const entity = entities.find(e => e.entity_id === parseInt(entity_id));
      if (entity) {
        setSelectedEntity(entity);
      }
    }
  }, [entity_id, entities]);

  const fetchEntities = async () => {
    try {
      const response = await api.get('/entities');
      setEntities(response.data);
    } catch (err) {
      console.error('Failed to fetch entities:', err);
      setError('Failed to load entities');
    }
  };

  const fetchVaccinationHistory = async (id) => {
    try {
      const response = await api.get(`/vaccinations/history/entity/${id}`);
      setVaccinationHistory(response.data);
    } catch (err) {
      console.error('Failed to fetch vaccination history:', err);
      setVaccinationHistory([]);
    }
  };

  const fetchVaccineTreatments = async (id) => {
    try {
      const response = await api.get(`/treatments/entity/${id}`);
      const vaccines = response.data.filter(treatment => treatment.medication_type === 'vaccine');
      setVaccineTreatments(vaccines);
    } catch (err) {
      console.error('Failed to fetch vaccine treatments:', err);
      setVaccineTreatments([]);
    }
  };

  const markVaccinationDone = async (vaccId) => {
    try {
      await api.post(`/vaccinations/history/${vaccId}/mark-done`);
      alert('Vaccination marked as done successfully!');
      // Refresh history
      if (entity_id) {
        fetchVaccinationHistory(entity_id);
      }
    } catch (err) {
      console.error('Failed to mark vaccination as done:', err);
      setError(err.response?.data?.error || 'Failed to mark vaccination as done');
    }
  };

  return (
    <div className="vaccination-page">
      <Navigation />
      <div className="vaccination-container">
        <div className="vaccination-header">
          <h1>💉 Vaccination Management</h1>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {!entity_id && (
          <div className="select-entity-prompt">
            <div className="prompt-content">
              <div className="prompt-icon">💉</div>
              <h2>Select an Animal or Batch</h2>
              <p>Please select an animal or batch to view vaccination schedules and history.</p>
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

        {entity_id && (
          <div className="vaccination-content">
            <h2>
              Vaccination Information for {selectedEntity?.entity_type === 'animal'
                ? selectedEntity?.tag_id
                : selectedEntity?.batch_name}
            </h2>

            {vaccineTreatments.length === 0 && vaccinationHistory.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💉</div>
                <h3>No vaccination information found</h3>
                <p>This animal/batch has no vaccination schedules or history.</p>
              </div>
            ) : (
              <>
                {vaccineTreatments.length > 0 && (
                  <div className="vaccine-schedules-section">
                    <div className="section-header">
                      <h2>Vaccination Schedules</h2>
                    </div>
                    <div className="vaccine-schedule-cards">
                      {vaccineTreatments.map(treatment => (
                        <div key={treatment.treatment_id} className="vaccine-schedule-card">
                          <div className="schedule-header">
                            <h3>{treatment.medicine}</h3>
                            <span className={`schedule-status ${new Date() > new Date(treatment.vaccine_end_date) ? 'completed' : 'active'}`}>
                              {new Date() > new Date(treatment.vaccine_end_date) ? 'Completed' : 'Active'}
                            </span>
                          </div>
                          <div className="schedule-details">
                            <div className="detail-row">
                              <span className="label">Interval:</span>
                              <span className="value">{treatment.vaccine_interval_days} days</span>
                            </div>
                            <div className="detail-row">
                              <span className="label">Total Period:</span>
                              <span className="value">{treatment.vaccine_total_months} months</span>
                            </div>
                            <div className="detail-row">
                              <span className="label">End Date:</span>
                              <span className="value">{treatment.vaccine_end_date ? formatDate(treatment.vaccine_end_date) : 'N/A'}</span>
                            </div>
                            <div className="detail-row">
                              <span className="label">Next Due:</span>
                              <span className="value">{treatment.next_due_date ? formatDate(treatment.next_due_date) : 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {vaccinationHistory.length > 0 && (
                  <div className="vaccination-history-section">
                    <div className="section-header">
                      <h2>Scheduled Vaccination History</h2>
                      <button
                        onClick={() => setShowHistorySection(!showHistorySection)}
                        className="btn-secondary"
                      >
                        {showHistorySection ? 'Hide History' : 'Show History'}
                      </button>
                    </div>

                    {showHistorySection && (
                      <div className="vaccination-history-list">
                        {vaccinationHistory.map((vacc, index) => {
                          const today = new Date();
                          const nextDue = new Date(vacc.next_due_date);
                          const isOverdue = nextDue < today && new Date(vacc.vaccine_end_date) > today;
                          const isDueToday = nextDue.toDateString() === today.toDateString();
                          const isCompleted = new Date(vacc.vaccine_end_date) <= today;

                          let status = 'active';
                          if (isCompleted) status = 'completed';
                          else if (isOverdue) status = 'overdue';
                          else if (isDueToday) status = 'due-today';

                          return (
                            <div key={vacc.vacc_id} className={`history-item ${status}`}>
                              <div className="history-header">
                                <span className="dose-number">Dose {index + 1}</span>
                                <span className={`status-indicator ${status}`}>
                                  {status === 'completed' && '✅ Completed'}
                                  {status === 'overdue' && '❌ Overdue'}
                                  {status === 'due-today' && '⚠️ Due Today'}
                                  {status === 'active' && '⏳ Active'}
                                </span>
                              </div>
                              <div className="history-details">
                                <div className="detail-row">
                                  <span className="label">Vaccine:</span>
                                  <span className="value">{vacc.vaccine_name}</span>
                                </div>
                                <div className="detail-row">
                                  <span className="label">Given Date:</span>
                                  <span className="value">{formatDate(vacc.given_date)}</span>
                                </div>
                                <div className="detail-row">
                                  <span className="label">Next Due:</span>
                                  <span className="value">{formatDate(vacc.next_due_date)}</span>
                                </div>
                                {!isCompleted && (
                                  <div className="detail-row">
                                    <span className="label">Days Remaining:</span>
                                    <span className="value">
                                      {Math.max(0, Math.ceil((nextDue - today) / (1000 * 60 * 60 * 24)))} days
                                    </span>
                                  </div>
                                )}
                                <div className="detail-row">
                                  <span className="label">Medicine:</span>
                                  <span className="value">{vacc.medicine}</span>
                                </div>
                                <div className="detail-row">
                                  <span className="label">Medication Type:</span>
                                  <span className="value">{vacc.medication_type}</span>
                                </div>
                              </div>
                              <div className="history-actions">
                                <button
                                  onClick={() => markVaccinationDone(vacc.vacc_id)}
                                  className="btn-vaccine"
                                  disabled={index !== 0 || isCompleted || today < nextDue}
                                >
                                  {isCompleted ? 'Cycle Completed' :
                                   index !== 0 ? 'Not Next Dose' :
                                   today < nextDue ? 'Not Due Yet' :
                                   'Mark as Done'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VaccinationManagement;