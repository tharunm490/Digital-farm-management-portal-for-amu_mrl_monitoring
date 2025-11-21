import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navigation from '../components/Navigation';
import { vaccinationAPI } from '../services/api';
import './FarmerNotifications.css';

const FarmerNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState({
    upcoming: [],
    overdue: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const [upcomingRes, overdueRes] = await Promise.all([
        vaccinationAPI.getUpcoming(user.user_id),
        vaccinationAPI.getOverdue(user.user_id)
      ]);

      setNotifications({
        upcoming: upcomingRes.data,
        overdue: overdueRes.data
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
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <div className="stat-number">{notifications.upcoming.length}</div>
              <div className="stat-label">Upcoming Vaccinations</div>
            </div>
          </div>
          <div className="stat-card overdue">
            <div className="stat-icon">🚨</div>
            <div className="stat-content">
              <div className="stat-number">{notifications.overdue.length}</div>
              <div className="stat-label">Overdue Vaccinations</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="notification-tabs">
          <button
            className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            📅 Upcoming ({notifications.upcoming.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'overdue' ? 'active' : ''}`}
            onClick={() => setActiveTab('overdue')}
          >
            🚨 Overdue ({notifications.overdue.length})
          </button>
        </div>

        {/* Notifications List */}
        <div className="notifications-content">
          {activeTab === 'upcoming' && (
            <div className="notification-section">
              <h2>Upcoming Vaccinations</h2>
              {notifications.upcoming.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✅</div>
                  <h3>All caught up!</h3>
                  <p>No upcoming vaccinations scheduled.</p>
                </div>
              ) : (
                <div className="notifications-list">
                  {notifications.upcoming.map((notification) => (
                    <div key={notification.vacc_id} className={`notification-card ${getUrgencyClass(notification.days_until_due)}`}>
                      <div className="notification-header">
                        <div className="notification-icon">
                          {getUrgencyIcon(notification.days_until_due)}
                        </div>
                        <div className="notification-title">
                          <h3>{notification.vaccine_name}</h3>
                          <span className="entity-info">
                            {notification.entity_type === 'animal' ? `🐄 ${notification.tag_id}` : `📦 ${notification.batch_name}`}
                            ({notification.species})
                          </span>
                        </div>
                        <div className="notification-urgency">
                          {getDaysText(notification.days_until_due)}
                        </div>
                      </div>

                      <div className="notification-details">
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="label">Farm:</span>
                            <span className="value">{notification.farm_name}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Next Due:</span>
                            <span className="value">{formatDate(notification.next_due_date)}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Interval:</span>
                            <span className="value">{notification.interval_days} days</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Last Given:</span>
                            <span className="value">{formatDate(notification.given_date)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="notification-actions">
                        <button className="btn-primary">
                          Mark as Completed
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

          {activeTab === 'overdue' && (
            <div className="notification-section">
              <h2>Overdue Vaccinations</h2>
              {notifications.overdue.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🎉</div>
                  <h3>No overdue vaccinations!</h3>
                  <p>All vaccinations are up to date.</p>
                </div>
              ) : (
                <div className="notifications-list">
                  {notifications.overdue.map((notification) => (
                    <div key={notification.vacc_id} className="notification-card overdue">
                      <div className="notification-header">
                        <div className="notification-icon">🚨</div>
                        <div className="notification-title">
                          <h3>{notification.vaccine_name}</h3>
                          <span className="entity-info">
                            {notification.entity_type === 'animal' ? `🐄 ${notification.tag_id}` : `📦 ${notification.batch_name}`}
                            ({notification.species})
                          </span>
                        </div>
                        <div className="notification-urgency">
                          {Math.abs(notification.days_overdue)} days overdue
                        </div>
                      </div>

                      <div className="notification-details">
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="label">Farm:</span>
                            <span className="value">{notification.farm_name}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Due Date:</span>
                            <span className="value">{formatDate(notification.next_due_date)}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Interval:</span>
                            <span className="value">{notification.interval_days} days</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Last Given:</span>
                            <span className="value">{formatDate(notification.given_date)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="notification-actions">
                        <button className="btn-primary urgent">
                          Schedule Now
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