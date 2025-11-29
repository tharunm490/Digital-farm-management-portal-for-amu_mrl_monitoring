import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './AuthorityNotifications.css';

const AuthorityNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/authority/notifications', {
        params: { type: filter === 'all' ? null : filter }
      });
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.patch(`/authority/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'unsafe_mrl': return '⚠️';
      case 'high_dosage': return '💊';
      case 'overdosage': return '🚨';
      case 'amr_risk': return '🦠';
      default: return '📢';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'unsafe_mrl': return '#ef4444';
      case 'high_dosage': return '#f59e0b';
      case 'overdosage': return '#dc2626';
      case 'amr_risk': return '#7c3aed';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="authority-notifications">
        <div className="notifications-header">
          <h1>🔔 Authority Notifications</h1>
          <p>Critical alerts and system notifications</p>
        </div>
        <div className="loading-spinner">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="authority-notifications">
      <div className="notifications-header">
        <h1>🔔 Authority Notifications</h1>
        <p>Critical alerts and system notifications</p>
      </div>

      <div className="notifications-controls">
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Notifications
          </button>
          <button
            className={`filter-btn ${filter === 'unsafe_mrl' ? 'active' : ''}`}
            onClick={() => setFilter('unsafe_mrl')}
          >
            MRL Alerts
          </button>
          <button
            className={`filter-btn ${filter === 'high_dosage' ? 'active' : ''}`}
            onClick={() => setFilter('high_dosage')}
          >
            High Dosage
          </button>
          <button
            className={`filter-btn ${filter === 'overdosage' ? 'active' : ''}`}
            onClick={() => setFilter('overdosage')}
          >
            Overdosage
          </button>
          <button
            className={`filter-btn ${filter === 'amr_risk' ? 'active' : ''}`}
            onClick={() => setFilter('amr_risk')}
          >
            AMR Risk
          </button>
        </div>
      </div>

      <div className="notifications-list">
        {notifications.length === 0 ? (
          <div className="no-notifications">
            <p>✅ No notifications found for the selected filter.</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
            >
              <div className="notification-icon">
                {getNotificationIcon(notification.subtype)}
              </div>

              <div className="notification-content">
                <div className="notification-header">
                  <h3>{notification.title}</h3>
                  <div className="notification-meta">
                    <span
                      className="notification-type"
                      style={{ backgroundColor: getNotificationColor(notification.subtype) }}
                    >
                      {notification.subtype?.toUpperCase().replace('_', ' ')}
                    </span>
                    <span className="notification-date">
                      {new Date(notification.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <p className="notification-message">{notification.message}</p>

                {notification.farm_name && (
                  <div className="notification-details">
                    <span><strong>Farm:</strong> {notification.farm_name}</span>
                    <span><strong>Location:</strong> {notification.state}, {notification.district}</span>
                    {notification.species && <span><strong>Species:</strong> {notification.species}</span>}
                  </div>
                )}

                <div className="notification-actions">
                  {!notification.is_read && (
                    <button
                      className="mark-read-btn"
                      onClick={() => markAsRead(notification.id)}
                    >
                      Mark as Read
                    </button>
                  )}
                  {notification.is_read && (
                    <span className="read-indicator">✓ Read</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="notifications-summary">
        <div className="summary-card">
          <h3>📊 Notification Summary</h3>
          <div className="summary-stats">
            <div className="summary-stat">
              <span>Total Notifications:</span>
              <span>{notifications.length}</span>
            </div>
            <div className="summary-stat">
              <span>Unread:</span>
              <span>{notifications.filter(n => !n.is_read).length}</span>
            </div>
            <div className="summary-stat">
              <span>High Priority:</span>
              <span>{notifications.filter(n => n.severity === 'high').length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthorityNotifications;