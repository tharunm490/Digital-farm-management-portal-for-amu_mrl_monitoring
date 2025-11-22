import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navigation from '../components/Navigation';
import { notificationAPI } from '../services/api';
import './FarmerNotifications.css';

const FarmerNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState({
    vaccinations: [],
    mrlAlerts: [],
    dosageAlerts: []
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
      const [vaccRes, mrlRes, dosageRes] = await Promise.all([
        notificationAPI.getByType('vaccination'),
        notificationAPI.getByType('mrl_alert'),
        notificationAPI.getByType('high_dosage')
      ]);
      
      setNotifications({
        vaccinations: vaccRes.data,
        mrlAlerts: mrlRes.data,
        dosageAlerts: dosageRes.data
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

  const getDaysText = (days) => {
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 0) return `${Math.abs(days)} days ago`;
    return `In ${days} days`;
  };

  const getUrgencyClass = (days) => {
    if (days < 0) return 'overdue';
    if (days <= 3) return 'urgent';
    if (days <= 7) return 'warning';
    return 'normal';
  };

  const getUrgencyIcon = (days) => {
    if (days < 0) return '🚨';
    if (days <= 3) return '🔴';
    if (days <= 7) return '🟡';
    return '🟢';
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
            🔴 Alerts ({notifications.mrlAlerts.length + notifications.dosageAlerts.length})
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
                    <div key={notification.notification_id} className={`notification-card ${notification.severity}`}>
                      <div className="notification-header">
                        <div className="notification-icon">💉</div>
                        <div className="notification-title">
                          <h3>{notification.title}</h3>
                          <span className="notification-time">
                            {new Date(notification.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="notification-severity">
                          {notification.severity.toUpperCase()}
                        </div>
                      </div>

                      <div className="notification-details">
                        <p>{notification.message}</p>
                      </div>

                      <div className="notification-actions">
                        <button className="btn-primary">
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
              {notifications.mrlAlerts.length === 0 && notifications.dosageAlerts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✅</div>
                  <h3>No alerts!</h3>
                  <p>All treatments are safe.</p>
                </div>
              ) : (
                <div className="notifications-list">
                  {/* MRL Alerts */}
                  {notifications.mrlAlerts.map((notification) => (
                    <div key={notification.notification_id} className={`notification-card ${notification.severity}`}>
                      <div className="notification-header">
                        <div className="notification-icon">🔴</div>
                        <div className="notification-title">
                          <h3>{notification.title}</h3>
                          <span className="notification-time">
                            {new Date(notification.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="notification-severity">
                          {notification.severity.toUpperCase()}
                        </div>
                      </div>

                      <div className="notification-details">
                        <p>{notification.message}</p>
                      </div>

                      <div className="notification-actions">
                        <button className="btn-primary urgent">
                          Review Treatment
                        </button>
                        <button className="btn-secondary">
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Dosage Alerts */}
                  {notifications.dosageAlerts.map((notification) => (
                    <div key={notification.notification_id} className={`notification-card ${notification.severity}`}>
                      <div className="notification-header">
                        <div className="notification-icon">⚠️</div>
                        <div className="notification-title">
                          <h3>{notification.title}</h3>
                          <span className="notification-time">
                            {new Date(notification.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="notification-severity">
                          {notification.severity.toUpperCase()}
                        </div>
                      </div>

                      <div className="notification-details">
                        <p>{notification.message}</p>
                      </div>

                      <div className="notification-actions">
                        <button className="btn-primary urgent">
                          Review Treatment
                        </button>
                        <button className="btn-secondary">
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