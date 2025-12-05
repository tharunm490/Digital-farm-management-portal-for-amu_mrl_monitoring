import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navigation from '../components/Navigation';
import api from '../services/api';
import './VaccinationManagement.css';
import './EnhancedModules.css';

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
      // The /entities route already filters by role (farmer/vet)
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
    <div className="module-page">
      <Navigation />
      
      {/* Enhanced Header */}
      <div className="module-header">
        <div className="module-header-card">
          <div className="module-header-content">
            <div className="module-title-section">
              <div className="module-icon-circle" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'}}>
                💉
              </div>
              <div className="module-title-text">
                <h1>Vaccination Management</h1>
                <p>Track and manage vaccination schedules</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="vaccination-container" style={{maxWidth: '1400px', margin: '0 auto', padding: '0 1.5rem'}}>

        {error && (
          <div style={{background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', padding: '1rem 1.5rem', borderRadius: '16px', border: '2px solid #fca5a5', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem'}}>
            <span style={{fontSize: '1.5rem'}}>❌</span>
            <p style={{color: '#991b1b', fontWeight: '600', margin: 0}}>{error}</p>
          </div>
        )}

        {!entity_id && (
          <div className="module-empty-state">
            <div className="module-empty-icon">💉</div>
            <h3>Select an Animal or Batch</h3>
            <p>Please select an animal or batch to view vaccination schedules and history.</p>
            <div className="filter-field" style={{maxWidth: '400px', marginTop: '2rem'}}>
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
        )}

        {entity_id && (
          <div className="vaccination-content">
            <div style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.9))', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 8px 32px rgba(0,0,0,0.08)'}}>
              <h2 style={{fontSize: '1.75rem', fontWeight: '800', color: '#1f2937', marginBottom: '0.5rem'}}>
                Vaccination Information for {selectedEntity?.entity_type === 'animal'
                  ? selectedEntity?.tag_id
                  : selectedEntity?.batch_name}
              </h2>
              <p style={{color: '#6b7280', fontSize: '1rem'}}>
                {selectedEntity?.species} • {selectedEntity?.farm_name}
              </p>
            </div>

            {vaccineTreatments.length === 0 && vaccinationHistory.length === 0 ? (
              <div className="module-empty-state">
                <div className="module-empty-icon">💉</div>
                <h3>No vaccination information found</h3>
                <p>This animal/batch has no vaccination schedules or history.</p>
              </div>
            ) : (
              <>
                {vaccineTreatments.length > 0 && (
                  <div className="vaccine-schedules-section" style={{marginBottom: '2rem'}}>
                    <h2 style={{fontSize: '1.5rem', fontWeight: '800', color: '#1f2937', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                      <span>📅</span> Vaccination Schedules
                    </h2>
                    <div className="cards-grid">
                      {vaccineTreatments.map(treatment => (
                        <div key={treatment.treatment_id} className="module-card">
                          <div className="module-card-header">
                            <div className="module-card-header-content">
                              <div className="module-card-title-section">
                                <h3 className="module-card-title">💉 {treatment.medicine}</h3>
                                <p className="module-card-subtitle">Vaccination Schedule</p>
                              </div>
                              <div className={`status-chip ${new Date() > new Date(treatment.vaccine_end_date) ? 'safe' : 'pending'}`}>
                                {new Date() > new Date(treatment.vaccine_end_date) ? '✅ Completed' : '⏳ Active'}
                              </div>
                            </div>
                          </div>
                          <div className="module-card-body">
                            <div className="module-info-grid">
                              <div className="module-info-item">
                                <div className="module-info-icon">⏱️</div>
                                <div className="module-info-content">
                                  <div className="module-info-label">Interval</div>
                                  <div className="module-info-value">{treatment.vaccine_interval_days} days</div>
                                </div>
                              </div>
                              <div className="module-info-item">
                                <div className="module-info-icon">📆</div>
                                <div className="module-info-content">
                                  <div className="module-info-label">Total Period</div>
                                  <div className="module-info-value">{treatment.vaccine_total_months} months</div>
                                </div>
                              </div>
                              <div className="module-info-item">
                                <div className="module-info-icon">🏁</div>
                                <div className="module-info-content">
                                  <div className="module-info-label">End Date</div>
                                  <div className="module-info-value">{treatment.vaccine_end_date ? formatDate(treatment.vaccine_end_date) : 'N/A'}</div>
                                </div>
                              </div>
                              <div className="module-info-item">
                                <div className="module-info-icon">📌</div>
                                <div className="module-info-content">
                                  <div className="module-info-label">Next Due</div>
                                  <div className="module-info-value">{treatment.next_due_date ? formatDate(treatment.next_due_date) : 'N/A'}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {vaccinationHistory.length > 0 && (
                  <div className="vaccination-history-section">
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                      <h2 style={{fontSize: '1.5rem', fontWeight: '800', color: '#1f2937', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                        <span>📋</span> Scheduled Vaccination History
                      </h2>
                      <button
                        onClick={() => setShowHistorySection(!showHistorySection)}
                        className="btn-modern-secondary"
                      >
                        {showHistorySection ? 'Hide History' : 'Show History'}
                      </button>
                    </div>

                    {showHistorySection && (
                      <div className="cards-grid">
                        {vaccinationHistory.map((vacc, index) => {
                          const today = new Date();
                          const nextDue = new Date(vacc.next_due_date);
                          const isOverdue = nextDue < today && new Date(vacc.vaccine_end_date) > today;
                          const isDueToday = nextDue.toDateString() === today.toDateString();
                          const isCompleted = new Date(vacc.vaccine_end_date) <= today;

                          let statusType = 'safe';
                          let statusText = '⏳ Active';
                          let statusIcon = '⏳';
                          if (isCompleted) { statusType = 'safe'; statusText = '✅ Completed'; statusIcon = '✅'; }
                          else if (isOverdue) { statusType = 'unsafe'; statusText = '❌ Overdue'; statusIcon = '❌'; }
                          else if (isDueToday) { statusType = 'pending'; statusText = '⚠️ Due Today'; statusIcon = '⚠️'; }

                          return (
                            <div key={vacc.vacc_id} className="module-card">
                              <div className="module-card-header">
                                <div className="module-card-header-content">
                                  <div className="module-card-title-section">
                                    <h3 className="module-card-title">
                                      💉 Dose {index + 1}
                                    </h3>
                                    <p className="module-card-subtitle">{vacc.vaccine_name}</p>
                                  </div>
                                  <div className={`status-chip ${statusType}`}>
                                    {statusText}
                                  </div>
                                </div>
                              </div>
                              <div className="module-card-body">
                                <div className="module-info-grid">
                                  <div className="module-info-item">
                                    <div className="module-info-icon">💊</div>
                                    <div className="module-info-content">
                                      <div className="module-info-label">Medicine</div>
                                      <div className="module-info-value">{vacc.medicine}</div>
                                    </div>
                                  </div>
                                  <div className="module-info-item">
                                    <div className="module-info-icon">📅</div>
                                    <div className="module-info-content">
                                      <div className="module-info-label">Given Date</div>
                                      <div className="module-info-value">{formatDate(vacc.given_date)}</div>
                                    </div>
                                  </div>
                                  <div className="module-info-item">
                                    <div className="module-info-icon">📌</div>
                                    <div className="module-info-content">
                                      <div className="module-info-label">Next Due</div>
                                      <div className="module-info-value">{formatDate(vacc.next_due_date)}</div>
                                    </div>
                                  </div>
                                  {!isCompleted && (
                                    <div className="module-info-item">
                                      <div className="module-info-icon">⏰</div>
                                      <div className="module-info-content">
                                        <div className="module-info-label">Days Remaining</div>
                                        <div className="module-info-value">
                                          {Math.max(0, Math.ceil((nextDue - today) / (1000 * 60 * 60 * 24)))} days
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  <div className="module-info-item">
                                    <div className="module-info-icon">🏷️</div>
                                    <div className="module-info-content">
                                      <div className="module-info-label">Type</div>
                                      <div className="module-info-value">{vacc.medication_type}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="module-card-footer">
                                <button
                                  onClick={() => markVaccinationDone(vacc.vacc_id)}
                                  className={`btn-card-action ${index === 0 && !isCompleted && today >= nextDue ? 'primary' : 'secondary'}`}
                                  disabled={index !== 0 || isCompleted || today < nextDue}
                                  style={{width: '100%'}}
                                >
                                  {isCompleted ? '✅ Cycle Completed' :
                                   index !== 0 ? '⏭️ Not Next Dose' :
                                   today < nextDue ? '⏳ Not Due Yet' :
                                   '✅ Mark as Done'}
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