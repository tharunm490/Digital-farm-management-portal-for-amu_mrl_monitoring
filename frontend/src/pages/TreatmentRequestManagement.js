import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navigation from '../components/Navigation';
import api from '../services/api';
import './TreatmentRequestManagement.css';
import { useTranslation } from '../hooks/useTranslation';

const TreatmentRequestManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [amuRecords, setAmuRecords] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showResidual, setShowResidual] = useState({});
  const [approvingRequests, setApprovingRequests] = useState(new Set());
  const { t } = useTranslation();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      let reqRes, treatRes, amuRes, vacRes, notRes;

      // Fetch treatment requests
      reqRes = await api.get('/treatment-requests');
      console.log('Treatment requests:', reqRes.data);

      // Fetch treatments
      treatRes = await api.get('/treatments');
      console.log('Treatments:', treatRes.data);
      
      // Check for duplicates in treatments
      const treatmentIds = treatRes.data.map(t => t.treatment_id);
      const uniqueTreatmentIds = new Set(treatmentIds);
      console.log('Treatment IDs:', treatmentIds);
      console.log('Unique treatment IDs:', uniqueTreatmentIds.size, 'Total:', treatmentIds.length);
      
      if (uniqueTreatmentIds.size !== treatmentIds.length) {
        console.warn('Duplicate treatments found!');
        // Remove duplicates
        const uniqueTreatments = treatRes.data.filter((treatment, index, self) => 
          index === self.findIndex(t => t.treatment_id === treatment.treatment_id)
        );
        treatRes.data = uniqueTreatments;
      }

      // Fetch AMU based on role
      if (user.role === 'farmer') {
        amuRes = await api.get(`/amu/farmer/${user.farmer_id}`);
      } else if (user.role === 'veterinarian') {
        amuRes = await api.get(`/amu/vet/${user.user_id}`);
      } else {
        amuRes = { data: [] };
      }

      // Fetch vaccinations (only for farmers)
      if (user.role === 'farmer') {
        vacRes = await api.get('/vaccinations');
      } else {
        vacRes = { data: [] };
      }

      // Fetch notifications
      notRes = await api.get('/notifications');

      setRequests(reqRes.data);
      setTreatments(treatRes.data);
      setAmuRecords(amuRes.data);
      setVaccinations(vacRes.data);
      setNotifications(notRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'approved': return 'green';
      case 'completed': return 'blue';
      default: return 'gray';
    }
  };

  const getProductImage = (species) => {
    const normalizedSpecies = species?.toLowerCase();
    // Milk producing animals
    if (['cattle', 'buffalo', 'goat', 'sheep'].includes(normalizedSpecies)) {
      return '🥛'; // Milk
    }
    // Egg producing animals
    if (['poultry', 'chicken', 'duck'].includes(normalizedSpecies)) {
      return '🥚'; // Egg
    }
    // Meat producing animals
    if (['pig', 'pigs'].includes(normalizedSpecies)) {
      return '🥩'; // Meat
    }
    // Default to meat for other animals
    return '🥩'; // Meat
  };

  if (!user) {
    return (
      <div className="treatment-requests-container">
        <Navigation />
        <div className="loading">{t('loading_user')}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="treatment-requests-container">
        <Navigation />
        <div className="loading">{t('loading_treatment_requests')}</div>
      </div>
    );
  }

  const isVet = user?.role === 'veterinarian' || user?.display_name?.includes('veterinarian');

  return (
    <div className={`treatment-requests-container ${user?.role === 'veterinarian' ? 'vet-theme' : ''}`}>
      <Navigation />

      <div className="treatment-requests-content">
        <h2>💊 {isVet ? t('veterinarian_treatment_management') : t('farmer_treatment_management')}</h2>
        <p>{isVet ? t('manage_requests_assigned_farms') : t('manage_treatments_health')}</p>

        {!isVet && (
          <div className="section">
            <button className="request-btn" onClick={() => navigate('/request-treatment')}>
              + {t('request_treatment')}
            </button>
            <p className="info-note">ℹ️ {t('farmers_poultry_note')}</p>
          </div>
        )}

        {isVet && (
          <>
            <div className="section">
              <h3>{t('treatments')}</h3>
              <div className="treatment-grid">
                {treatments.length === 0 ? (
                  <p className="empty-message">{t('no_treatments_found')}</p>
                ) : (
                  treatments.map((treatment, index) => (
                    <div key={treatment.id || `treatment-${index}`} className="treatment-flash-card">
                      <div className="treatment-card-header">
                        <span className="medicine-icon">💊</span>
                        <h4>{treatment.medicine}</h4>
                      </div>
                      <div className="treatment-card-body">
                        <div className="treatment-info-row">
                          <span className="info-icon">🐄</span>
                          <span className="info-text">{treatment.species} - {treatment.tag_id}</span>
                        </div>
                        <div className="treatment-info-row">
                          <span className="info-icon">💉</span>
                          <span className="info-text">{treatment.dose_amount} {treatment.dose_unit}</span>
                        </div>
                        <div className="treatment-card-footer">
                          <span className={`treatment-status ${treatment.status}`}>
                            {treatment.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="section">
              <h3>{t('treatment_requests')}</h3>
              <div className="requests-list">
                {requests.length === 0 ? (
                  <p>{t('no_treatment_requests_found')}</p>
                ) : (
                  requests.map((request, index) => (
                    <div key={request.request_id || `request-${index}`} className="request-card vet-request-card">
                      <div className="request-header">
                        <h3>
                          <span className="species-icon">
                            {(() => {
                              const icons = {
                                cattle: '🐄',
                                buffalo: '🐃',
                                goat: '🐐',
                                sheep: '🐑',
                                pig: '🐖',
                                poultry: '🐔'
                              };
                              return icons[request.species] || '🐾';
                            })()}
                          </span>
                          {request.species} - {request.tag_id || request.batch_name}
                        </h3>
                        <span className={`status-badge ${getStatusColor(request.status)}`}>
                          {request.status === 'completed' ? t('fulfilled') : request.status}
                        </span>
                      </div>

                      <div className="request-body">
                        {/* Farmer Contact Card */}
                        <div className="farmer-contact-card">
                          <div className="contact-header">
                            <span className="contact-icon">👨‍🌾</span>
                            <h4>{t('farmer_details') || 'Farmer'}</h4>
                          </div>
                          <div className="contact-info-compact">
                            <div className="info-line">👤 {request.farmer_name || 'N/A'}</div>
                            {request.farmer_phone && (
                              <div className="info-line">📞 <a href={`tel:${request.farmer_phone}`}>{request.farmer_phone}</a></div>
                            )}
                          </div>
                        </div>

                        {/* Farm Location Card */}
                        <div className="farm-location-card">
                          <div className="location-header">
                            <span className="location-icon">🏡</span>
                            <h4>{request.farm_name || 'Farm'}</h4>
                          </div>
                          <div className="contact-info-compact">
                            <div className="info-line">📍 {[request.farmer_taluk, request.farmer_district].filter(Boolean).join(', ') || 'N/A'}</div>
                          </div>
                        </div>

                        {/* Symptoms Card */}
                        <div className="symptoms-card">
                          <div className="symptoms-header">
                            <span className="symptoms-icon">🏥</span>
                            <h4>{t('symptoms') || 'Symptoms'}</h4>
                          </div>
                          <div className="symptoms-content-compact">
                            {request.symptoms || 'No symptoms provided'}
                          </div>
                        </div>
                      </div>

                      {request.handling_status === 'handled_by_other' && (
                        <div className="handling-notice warning">
                          ℹ️ {t('request_handled_by_other').replace('{vet}', request.handled_by_vet)}
                        </div>
                      )}
                      {request.handling_status === 'handled_by_me' && (
                        <div className="handling-notice success">
                          ✅ {t('request_handled_by_you')}
                        </div>
                      )}

                      {request.status === 'pending' && isVet && request.handling_status !== 'handled_by_other' && (
                        <div className="request-actions">
                          <button
                            className="approve-btn"
                            disabled={approvingRequests.has(request.request_id)}
                            onClick={async () => {
                              if (approvingRequests.has(request.request_id)) return;
                              
                              setApprovingRequests(prev => new Set(prev).add(request.request_id));
                              try {
                                await api.post(`/treatment-requests/${request.request_id}/approve-and-treat`);
                                // After approval, navigate to treatment page
                                navigate(`/treatments/entity/${request.entity_id}?request_id=${request.request_id}`);
                              } catch (error) {
                                console.error('Failed to approve request:', error);
                                alert(t('failed_approve_request'));
                              } finally {
                                setApprovingRequests(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(request.request_id);
                                  return newSet;
                                });
                              }
                            }}
                          >
                            {approvingRequests.has(request.request_id) ? t('approving') : t('approve_treat')}
                          </button>
                          {request.farmer_phone && (
                            <a href={`tel:${request.farmer_phone}`} className="call-btn">
                              📞 {t('call_farmer') || 'Call Farmer'}
                            </a>
                          )}
                        </div>
                      )}

                      {request.status === 'approved' && isVet && request.handling_status !== 'handled_by_other' && (
                        <div className="request-actions">
                          <button
                            className="give-treatment-btn"
                            onClick={() => navigate(`/treatments/entity/${request.entity_id}?request_id=${request.request_id}`)}
                          >
                            {t('give_treatment') || 'Give Treatment'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {!isVet && (
          <>
            <div className="section">
              <h3>{t('treatments')}</h3>
              <div className="items-list">
                {treatments.length === 0 ? (
                  <p>{t('no_treatments_found')}</p>
                ) : (
                  treatments.map((treatment, index) => (
                    <div key={treatment.id || `treatment-${index}`} className="item-card">
                      <p><strong>{t('medicine')}:</strong> {treatment.medicine}</p>
                      <p><strong>{t('animal')}:</strong> {treatment.species} - {treatment.tag_id}</p>
                      <p><strong>{t('dose')}:</strong> {treatment.dose_amount} {treatment.dose_unit}</p>
                      <p><strong>{t('status')}:</strong> {treatment.status}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="section">
              <h3>{t('treatment_requests')}</h3>
              <div className="requests-list">
                {requests.length === 0 ? (
                  <p>{t('no_treatment_requests_found')}</p>
                ) : (
                  requests.map((request, index) => (
                    <div key={request.request_id || `request-${index}`} className="request-card">
                      <div className="request-header">
                        <h3>{request.species} - {request.tag_id || request.batch_name}</h3>
                        <span className={`status-badge ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </div>

                      <div className="request-details">
                        <p><strong>{t('farm')}:</strong> {request.farm_name}</p>
                        <p><strong>{t('farmer')}:</strong> {request.farmer_name}</p>
                        <p><strong>{t('symptoms')}:</strong> {request.symptoms}</p>
                        <p><strong>{t('requested')}:</strong> {new Date(request.created_at).toLocaleDateString()}</p>
                      </div>

                      {request.status === 'pending' && (
                        <div className="request-actions">
                          <button
                            className="approve-btn"
                            onClick={() => navigate(`/treatments/entity/${request.entity_id}?request_id=${request.request_id}`)}
                          >
                            {t('approve_treat')}
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="section">
              <h3>{t('amu_records')}</h3>
              <div className="amu-list">
                {amuRecords.length === 0 ? (
                  <p>{t('no_amu_records_found')}</p>
                ) : (
                  amuRecords.map((record, index) => {
                    const speciesIcons = {
                      cattle: '🐄',
                      buffalo: '🐃',
                      goat: '🐐',
                      sheep: '🐑',
                      pig: '🐖',
                      poultry: '🐔'
                    };
                    const icon = speciesIcons[record.species] || '🐾';
                    const isSafe = record.risk_percent < 100; // assume if risk < 100 safe
                    return (
                      <div key={record.id || `amu-${index}`} className="amu-card">
                        <div className="amu-header">
                          <h4>{record.medicine}</h4>
                          <span className="category">{record.category || record.category_type}</span>
                          <span className="tissue">{record.tissue || 'MEAT'}</span>
                          <span className={`safety ${isSafe ? 'safe' : 'unsafe'}`}>
                            {isSafe ? '✅ Safe' : '❌ Unsafe'}
                          </span>
                        </div>
                        <div className="amu-details">
                          <p><strong>{t('animal_batch')}:</strong> {icon} {record.tag_id || record.batch_name}</p>
                          <p><strong>{t('farm')}:</strong> 🏡 {record.farm_name}</p>
                          <p><strong>{t('species')}:</strong> {record.species}</p>
                          <p><strong>{t('treatment')}:</strong> {record.dose_amount} {record.dose_unit} • {record.route}</p>
                          <p>{record.frequency_per_day}{t('times_per_day')} • {record.duration_days} {t('days_duration')}</p>
                          <p><strong>{t('reason')}:</strong> {record.reason}</p>
                        </div>
                        <div className="amu-dates">
                          <p><strong>{t('dates')}</strong></p>
                          <p>{t('start')}: {new Date(record.start_date).toLocaleDateString()}</p>
                          <p>{t('end')}: {new Date(record.end_date).toLocaleDateString()}</p>
                        </div>
                      <div className="amu-safety">
                        <button 
                          className="toggle-btn" 
                          onClick={() => setShowResidual(prev => ({ ...prev, [record.id]: !prev[record.id] }))}
                        >
                          {showResidual[record.id] ? t('hide_residual_details') : t('show_residual_details')}
                        </button>
                        {showResidual[record.id] && (
                          <>
                            <p>{t('predicted_residual')}: {record.predicted_mrl || record.predicted_residual} µg/kg</p>
                            <p>{t('risk')}: {record.risk_percent}%</p>
                            <p>{t('withdrawal')}: {record.predicted_withdrawal_days || record.withdrawal_days} {t('days_duration')}</p>
                            <p>{t('safe_date')}: {record.safe_date ? new Date(record.safe_date).toLocaleDateString() : 'N/A'} ({record.days_left || 0} {t('days_left')})</p>
                          </>
                        )}
                      </div>
                      <div className="tissue-prediction">
                        <p>🔬 {record.message || t('no_tissue_data')}</p>
                      </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="section">
              <h3>{t('vaccinations')}</h3>
              <div className="items-list">
                {vaccinations.length === 0 ? (
                  <p>{t('no_vaccinations_found')}</p>
                ) : (
                  vaccinations.map((vaccination, index) => (
                    <div key={vaccination.id || `vaccination-${index}`} className="item-card">
                      <p><strong>{t('vaccine')}:</strong> {vaccination.vaccine}</p>
                      <p><strong>{t('animal')}:</strong> {vaccination.species} - {vaccination.tag_id}</p>
                      <p><strong>{t('date')}:</strong> {new Date(vaccination.date).toLocaleDateString()}</p>
                      <p><strong>{t('status')}:</strong> {vaccination.status}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="section">
              <h3>{t('notifications')}</h3>
              <div className="notifications-list">
                {notifications.length === 0 ? (
                  <p>{t('no_notifications_found')}</p>
                ) : (
                  notifications.map((notification, index) => (
                    <div key={notification.id || `notification-${index}`} className="notification-card">
                      <p><strong>{t('title')}:</strong> {notification.title}</p>
                      <p><strong>{t('message')}:</strong> {notification.message}</p>
                      <p><strong>{t('date')}:</strong> {new Date(notification.created_at).toLocaleDateString()}</p>
                      <p><strong>{t('read')}:</strong> {notification.is_read ? t('yes') : t('no')}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TreatmentRequestManagement;