import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { notificationAPI } from '../services/api';
import './FarmerNotifications.css';

const FarmerNotifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState({
    vaccinations: [],
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
      
      // Fetch notifications by type
      const [vaccRes, mrlRes, dosageRes, overdosageRes] = await Promise.all([
        notificationAPI.getByType('vaccination'),
        notificationAPI.getByType('mrl_alert'),
        notificationAPI.getByType('high_dosage'),
        notificationAPI.getByType('overdosage')
      ]);
      
      setNotifications({
        vaccinations: vaccRes.data,
        mrlAlerts: mrlRes.data,
        dosageAlerts: dosageRes.data,
        overdosageAlerts: overdosageRes.data
      });
    } catch (err) {
      setError('Failed to fetch notifications');
      console.error(err);
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
      return 'Vaccination Reminder';
    } else if (notification.type === 'alert') {
      if (notification.subtype === 'unsafe_mrl') {
        return 'Unsafe MRL Alert';
      } else if (notification.subtype === 'high_dosage') {
        return 'High Dosage Alert';
      } else if (notification.subtype === 'overdosage') {
        return 'Overdosage Alert';
      }
    }
    return 'Notification';
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
        <div className="loading">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <Navigation />
      <div className="notifications-container">
        <div className="page-header">
          <h1>🔔 Farmer Notifications</h1>
          <p>Stay updated with vaccination schedules and important alerts</p>
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
              <div className="stat-number">{notifications.vaccinations.length}</div>
              <div className="stat-label">Vaccination Notifications</div>
            </div>
          </div>
          <div className="stat-card alerts">
            <div className="stat-icon">🔴</div>
            <div className="stat-content">
              <div className="stat-number">{notifications.mrlAlerts.length}</div>
              <div className="stat-label">MRL Alerts</div>
            </div>
          </div>
          <div className="stat-card alerts">
            <div className="stat-icon">⚠️</div>
            <div className="stat-content">
              <div className="stat-number">{notifications.dosageAlerts.length}</div>
              <div className="stat-label">Dosage Alerts</div>
            </div>
          </div>
          <div className="stat-card alerts">
            <div className="stat-icon">🚨</div>
            <div className="stat-content">
              <div className="stat-number">{notifications.overdosageAlerts.length}</div>
              <div className="stat-label">Overdosage Alerts</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="notification-tabs">
          <button
            className={`tab-btn ${activeTab === 'vaccinations' ? 'active' : ''}`}
            onClick={() => setActiveTab('vaccinations')}
          >
            💉 Vaccinations ({notifications.vaccinations.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            🔴 Alerts ({notifications.mrlAlerts.length + notifications.dosageAlerts.length + notifications.overdosageAlerts.length})
          </button>
        </div>

        {/* Notifications List */}
        <div className="notifications-content">
          {activeTab === 'vaccinations' && (
            <div className="notification-section">
              <h2>Vaccination Notifications</h2>
              {notifications.vaccinations.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✅</div>
                  <h3>No vaccination notifications!</h3>
                  <p>All vaccinations are up to date.</p>
                </div>
              ) : (
                <div className="notifications-list">
                  {notifications.vaccinations.map((notification) => (
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
                        <button className="btn-primary" onClick={() => handleViewDetails(notification)}>
                          View Details
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
              <h2>Alerts</h2>
              {notifications.mrlAlerts.length === 0 && notifications.dosageAlerts.length === 0 && notifications.overdosageAlerts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✅</div>
                  <h3>No alerts!</h3>
                  <p>All treatments are safe.</p>
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
                          Review Treatment
                        </button>
                        <button className="btn-secondary" onClick={() => handleViewDetails(notification)}>
                          View Details
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
                          Review Treatment
                        </button>
                        <button className="btn-secondary" onClick={() => handleViewDetails(notification)}>
                          View Details
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
                          Review Treatment
                        </button>
                        <button className="btn-secondary" onClick={() => handleViewDetails(notification)}>
                          View Details
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