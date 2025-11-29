import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { notificationAPI, vaccinationAPI } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import './FarmerNotifications.css';

const FarmerNotifications = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState({
    vaccinations: [],
    vaccinationHistory: [],
    vaccinationRecords: [],
    mrlAlerts: [],
    dosageAlerts: [],
    overdosageAlerts: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('vaccinations');

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      // First, trigger creation of vaccination notifications by fetching upcoming and overdue
      // These calls create notifications in the database
      try {
        await Promise.all([
          fetch('/api/vaccinations/upcoming/30', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }),
          fetch('/api/vaccinations/overdue', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
        ]);
      } catch (vaccError) {
        console.warn('Failed to fetch vaccination schedules, notifications may not be up to date:', vaccError);
        // Continue with fetching notifications even if vaccination schedule fetch fails
      }

      // Fetch notifications by type and vaccination data
      const [vaccRes, vaccHistoryRes, vaccRecordsRes, mrlRes, dosageRes, overdosageRes] = await Promise.all([
        notificationAPI.getByType('vaccination').catch(err => {
          console.error('Error fetching vaccination notifications:', err);
          return { data: [] };
        }),
        vaccinationAPI.getHistory().catch(err => {
          console.error('Error fetching vaccination history:', err);
          return { data: [] };
        }),
        vaccinationAPI.getAll().catch(() => ({ data: [] })), // Manual vaccinations (may not exist)
        notificationAPI.getByType('mrl_alert').catch(err => {
          console.error('Error fetching MRL alerts:', err);
          return { data: [] };
        }),
        notificationAPI.getByType('high_dosage').catch(err => {
          console.error('Error fetching dosage alerts:', err);
          return { data: [] };
        }),
        notificationAPI.getByType('overdosage').catch(err => {
          console.error('Error fetching overdosage alerts:', err);
          return { data: [] };
        })
      ]);

      setNotifications({
        vaccinations: vaccRes.data,
        vaccinationHistory: vaccHistoryRes.data,
        vaccinationRecords: vaccRecordsRes.data || [],
        mrlAlerts: mrlRes.data,
        dosageAlerts: dosageRes.data,
        overdosageAlerts: overdosageRes.data
      });
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError(t('failed_fetch_notifications'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  const getNotificationTitle = (notification) => {
    if (notification.type === 'vaccination') {
      return t('vaccination_reminder');
    } else if (notification.type === 'alert') {
      if (notification.subtype === 'unsafe_mrl') {
        return t('unsafe_mrl_alert');
      } else if (notification.subtype === 'high_dosage') {
        return t('high_dosage_alert');
      } else if (notification.subtype === 'overdosage') {
        return t('overdosage_alert');
      }
    }
    return t('notifications');
  };

  const getNotificationSeverity = (notification) => {
    if (notification.type === 'vaccination') {
      return 'info';
    } else if (notification.type === 'alert') {
      return 'urgent';
    }
    return 'normal';
  };

  const getNotificationIcon = (notification) => {
    if (notification.type === 'vaccination') {
      return '💉';
    } else if (notification.type === 'alert') {
      if (notification.subtype === 'unsafe_mrl') {
        return '🔴';
      } else if (notification.subtype === 'high_dosage') {
        return '⚠️';
      } else if (notification.subtype === 'overdosage') {
        return '🚨';
      }
    }
    return '🔔';
  };

  const handleReviewTreatment = (notification) => {
    // Navigate to treatment management page for the specific entity
    if (notification.entity_id) {
      navigate(`/treatments/entity/${notification.entity_id}`);
    } else {
      navigate('/treatments');
    }
  };

  const handleViewDetails = (notification) => {
    // For vaccination notifications, go to vaccination management
    if (notification.type === 'vaccination') {
      if (notification.entity_id) {
        navigate(`/vaccinations/entity/${notification.entity_id}`);
      } else {
        navigate('/vaccinations');
      }
    } else {
      // For treatment alerts, go to treatment management
      if (notification.entity_id) {
        navigate(`/treatments/entity/${notification.entity_id}`);
      } else {
        navigate('/treatments');
      }
    }
  };

  if (loading) {
    return (
      <div className="notifications-page">
        <Navigation />
        <div className="loading">{t('loading')} {t('notifications')}...</div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <Navigation />
      <div className="notifications-container">
        <div className="page-header">
          <h1>🔔 {t('notifications')}</h1>
          <p>{t('stay_updated_vaccination_alerts')}</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            {error}
          </div>
        )}

        {/* Notification Stats */}
        <div className="notification-stats">
          <div className="stat-card upcoming">
            <div className="stat-icon">💉</div>
            <div className="stat-content">
              <div className="stat-number">{notifications.vaccinationHistory.length + notifications.vaccinationRecords.length}</div>
              <div className="stat-label">{t('vaccination_records')}</div>
            </div>
          </div>
          <div className="stat-card alerts">
            <div className="stat-icon">🔴</div>
            <div className="stat-content">
              <div className="stat-number">{notifications.mrlAlerts.length}</div>
              <div className="stat-label">{t('mrl_alerts')}</div>
            </div>
          </div>
          <div className="stat-card alerts">
            <div className="stat-icon">⚠️</div>
            <div className="stat-content">
              <div className="stat-number">{notifications.dosageAlerts.length}</div>
              <div className="stat-label">{t('dosage_alerts')}</div>
            </div>
          </div>
          <div className="stat-card alerts">
            <div className="stat-icon">🚨</div>
            <div className="stat-content">
              <div className="stat-number">{notifications.overdosageAlerts.length}</div>
              <div className="stat-label">{t('overdosage_alerts')}</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="notification-tabs">
          <button
            className={`tab-btn ${activeTab === 'vaccinations' ? 'active' : ''}`}
            onClick={() => setActiveTab('vaccinations')}
          >
            💉 {t('vaccinations')} ({notifications.vaccinationHistory.length + notifications.vaccinationRecords.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            🔴 {t('alerts')} ({notifications.mrlAlerts.length + notifications.dosageAlerts.length + notifications.overdosageAlerts.length})
          </button>
        </div>

        {/* Notifications List */}
        <div className="notifications-content">
          {activeTab === 'vaccinations' && (
            <div className="notification-section">
              <h2>{t('vaccination_records_history')}</h2>
              {notifications.vaccinationHistory.length === 0 && notifications.vaccinationRecords.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">💉</div>
                  <h3>{t('no_vaccination_records')}</h3>
                  <p>{t('no_vaccination_data')}</p>
                </div>
              ) : (
                <div className="notifications-list">
                  {/* Vaccination History (from treatments) */}
                  {notifications.vaccinationHistory.map((vacc) => {
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
                      <div key={`history-${vacc.vacc_id}`} className={`notification-card ${status}`}>
                        <div className="notification-header">
                          <div className="notification-icon">💉</div>
                          <div className="notification-title">
                            <h3>{vacc.vaccine_name} - {vacc.medicine} ({t('scheduled')})</h3>
                            <span className="notification-time">
                              {vacc.species} {vacc.tag_id || vacc.batch_name} ({vacc.farm_name})
                            </span>
                          </div>
                          <div className="notification-severity">
                            {status === 'completed' && `✅ ${t('completed')}`}
                            {status === 'overdue' && `❌ ${t('overdue')}`}
                            {status === 'due-today' && `⚠️ ${t('due_today')}`}
                            {status === 'active' && `⏳ ${t('active')}`}
                          </div>
                        </div>

                        <div className="notification-details">
                          <div className="vaccination-details-grid">
                            <div className="detail-item">
                              <span className="label">{t('given_date')}:</span>
                              <span className="value">{formatDate(vacc.given_date)}</span>
                            </div>
                            <div className="detail-item">
                              <span className="label">{t('next_due')}:</span>
                              <span className="value">{formatDate(vacc.next_due_date)}</span>
                            </div>
                            <div className="detail-item">
                              <span className="label">{t('interval')}:</span>
                              <span className="value">{vacc.interval_days} days</span>
                            </div>
                            <div className="detail-item">
                              <span className="label">{t('total_period')}:</span>
                              <span className="value">{vacc.vaccine_total_months} months</span>
                            </div>
                            <div className="detail-item">
                              <span className="label">{t('end_date')}:</span>
                              <span className="value">{formatDate(vacc.vaccine_end_date)}</span>
                            </div>
                            {!isCompleted && (
                              <div className="detail-item">
                                <span className="label">{t('days_remaining')}:</span>
                                <span className="value">
                                  {Math.max(0, Math.ceil((nextDue - today) / (1000 * 60 * 60 * 24)))} days
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="notification-actions">
                          <button className="btn-primary" onClick={() => handleViewDetails({ entity_id: vacc.entity_id })}>
                            {t('view_entity_details')}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Manual Vaccination Records */}
                  {notifications.vaccinationRecords.map((vacc) => (
                    <div key={`record-${vacc.vaccination_id}`} className="notification-card completed">
                      <div className="notification-header">
                        <div className="notification-icon">💉</div>
                        <div className="notification-title">
                          <h3>{vacc.vaccine_name} ({t('manual_record')})</h3>
                          <span className="notification-time">
                            {vacc.tag_id || vacc.batch_name} ({vacc.farm_name})
                          </span>
                        </div>
                        <div className="notification-severity">{t('recorded')}</div>
                      </div>

                      <div className="notification-details">
                        <div className="vaccination-details-grid">
                          <div className="detail-item">
                            <span className="label">{t('vaccination_date')}:</span>
                            <span className="value">{formatDate(vacc.vaccination_date)}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">{t('next_due')}:</span>
                            <span className="value">{vacc.next_due_date ? formatDate(vacc.next_due_date) : t('not_scheduled')}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">{t('batch_number')}:</span>
                            <span className="value">{vacc.batch_number || 'N/A'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">{t('manufacturer')}:</span>
                            <span className="value">{vacc.manufacturer || 'N/A'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">{t('vet')}:</span>
                            <span className="value">{vacc.vet_name || 'N/A'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">{t('dosage')}:</span>
                            <span className="value">{vacc.dosage || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="notification-actions">
                        <button className="btn-primary" onClick={() => handleViewDetails({ entity_id: vacc.entity_id })}>
                          {t('view_entity_details')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="notification-section">
              <h2>{t('alerts')}</h2>
              {notifications.mrlAlerts.length === 0 && notifications.dosageAlerts.length === 0 && notifications.overdosageAlerts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✅</div>
                  <h3>{t('no_alerts')}</h3>
                  <p>{t('all_treatments_safe')}</p>
                </div>
              ) : (
                <div className="notifications-list">
                  {/* MRL Alerts */}
                  {notifications.mrlAlerts.map((notification) => (
                    <div key={notification.notification_id} className={`notification-card ${getNotificationSeverity(notification)}`}>
                      <div className="notification-header">
                        <div className="notification-icon">{getNotificationIcon(notification)}</div>
                        <div className="notification-title">
                          <h3>{getNotificationTitle(notification)}</h3>
                          <span className="notification-time">
                            {new Date(notification.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="notification-severity">
                          {getNotificationSeverity(notification).toUpperCase()}
                        </div>
                      </div>

                      <div className="notification-details">
                        <p>{notification.message}</p>
                      </div>

                      <div className="notification-actions">
                        <button className="btn-primary urgent" onClick={() => handleReviewTreatment(notification)}>
                          {t('review_treatment')}
                        </button>
                        <button className="btn-secondary" onClick={() => handleViewDetails(notification)}>
                          {t('view_details')}
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Dosage Alerts */}
                  {notifications.dosageAlerts.map((notification) => (
                    <div key={notification.notification_id} className={`notification-card ${getNotificationSeverity(notification)}`}>
                      <div className="notification-header">
                        <div className="notification-icon">{getNotificationIcon(notification)}</div>
                        <div className="notification-title">
                          <h3>{getNotificationTitle(notification)}</h3>
                          <span className="notification-time">
                            {new Date(notification.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="notification-severity">
                          {getNotificationSeverity(notification).toUpperCase()}
                        </div>
                      </div>

                      <div className="notification-details">
                        <p>{notification.message}</p>
                      </div>

                      <div className="notification-actions">
                        <button className="btn-primary urgent" onClick={() => handleReviewTreatment(notification)}>
                          {t('review_treatment')}
                        </button>
                        <button className="btn-secondary" onClick={() => handleViewDetails(notification)}>
                          {t('view_details')}
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Overdosage Alerts */}
                  {notifications.overdosageAlerts.map((notification) => (
                    <div key={notification.notification_id} className={`notification-card ${getNotificationSeverity(notification)}`}>
                      <div className="notification-header">
                        <div className="notification-icon">{getNotificationIcon(notification)}</div>
                        <div className="notification-title">
                          <h3>{getNotificationTitle(notification)}</h3>
                          <span className="notification-time">
                            {new Date(notification.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="notification-severity">
                          {getNotificationSeverity(notification).toUpperCase()}
                        </div>
                      </div>

                      <div className="notification-details">
                        <p>{notification.message}</p>
                      </div>

                      <div className="notification-actions">
                        <button className="btn-primary urgent" onClick={() => handleReviewTreatment(notification)}>
                          {t('review_treatment')}
                        </button>
                        <button className="btn-secondary" onClick={() => handleViewDetails(notification)}>
                          {t('view_details')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FarmerNotifications;