import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './AuthorityComplaints.css';

const AuthorityComplaints = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: 'all',
    state: 'all',
    species: 'all',
    severity: 'all'
  });
  const [selectedAlert, setSelectedAlert] = useState(null);

  useEffect(() => {
    fetchAlerts();
  }, [filters]);

  const fetchAlerts = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== 'all') params.append(key, value);
      });

      const response = await api.get(`/authority/complaints?${params}`);
      setAlerts(response.data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const markAsReviewed = async (alertId) => {
    try {
      await api.patch(`/authority/complaints/${alertId}/review`);
      // Refresh alerts
      fetchAlerts();
    } catch (error) {
      console.error('Error marking alert as reviewed:', error);
    }
  };

  const getSeverityColor = (alert) => {
    // Determine severity based on subtype and risk_category
    if (alert.subtype === 'overdosage' || alert.risk_category === 'unsafe') {
      return '#ef4444'; // red for high severity
    } else if (alert.subtype === 'high_dosage' || alert.risk_category === 'borderline') {
      return '#f59e0b'; // orange for medium severity
    } else {
      return '#10b981'; // green for low severity
    }
  };

  const getSeverityLevel = (alert) => {
    // Determine severity level based on subtype and risk_category
    if (alert.subtype === 'overdosage' || alert.risk_category === 'unsafe') {
      return 'high';
    } else if (alert.subtype === 'high_dosage' || alert.risk_category === 'borderline') {
      return 'medium';
    } else {
      return 'low';
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'unsafe_mrl': return '⚠️';
      case 'high_dosage': return '💊';
      case 'overdosage': return '🚨';
      default: return '📢';
    }
  };

  const formatAlertMessage = (alert) => {
    switch (alert.subtype) {
      case 'unsafe_mrl':
        return `MRL violation detected for ${alert.species} at ${alert.farm_name}. Residual level: ${alert.residual_value} µg/kg`;
      case 'high_dosage':
        return `High dosage administered to ${alert.species} at ${alert.farm_name}. Dosage: ${alert.dosage_amount} ${alert.dosage_unit}`;
      case 'overdosage':
        return `Overdosage event for ${alert.species} at ${alert.farm_name}. Exceeded recommended limits.`;
      default:
        return alert.message || 'Alert triggered';
    }
  };

  if (loading) {
    return (
      <div className="authority-complaints">
        <div className="complaints-header">
          <h1>🚨 Complaints & Alerts</h1>
          <p>Risk Monitoring & Compliance Alerts</p>
        </div>
        <div className="loading-spinner">Loading alerts...</div>
      </div>
    );
  }

  return (
    <div className="authority-complaints">
      <div className="complaints-header">
        <h1>🚨 Complaints & Alerts</h1>
        <p>Risk Monitoring & Compliance Alerts</p>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <label>Alert Type:</label>
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="unsafe_mrl">Unsafe MRL</option>
            <option value="high_dosage">High Dosage</option>
            <option value="overdosage">Overdosage</option>
          </select>
        </div>

        <div className="filter-group">
          <label>State:</label>
          <select
            value={filters.state}
            onChange={(e) => handleFilterChange('state', e.target.value)}
          >
            <option value="all">All States</option>
            <option value="Maharashtra">Maharashtra</option>
            <option value="Karnataka">Karnataka</option>
            <option value="Tamil Nadu">Tamil Nadu</option>
            <option value="Andhra Pradesh">Andhra Pradesh</option>
            <option value="Telangana">Telangana</option>
            {/* Add more states as needed */}
          </select>
        </div>

        <div className="filter-group">
          <label>Species:</label>
          <select
            value={filters.species}
            onChange={(e) => handleFilterChange('species', e.target.value)}
          >
            <option value="all">All Species</option>
            <option value="cattle">Cattle</option>
            <option value="buffalo">Buffalo</option>
            <option value="goat">Goat</option>
            <option value="sheep">Sheep</option>
            <option value="pig">Pig</option>
            <option value="poultry">Poultry</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Severity:</label>
          <select
            value={filters.severity}
            onChange={(e) => handleFilterChange('severity', e.target.value)}
          >
            <option value="all">All Severities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div className="alerts-summary">
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-number">{alerts.filter(a => getSeverityLevel(a) === 'high').length}</span>
            <span className="stat-label">High Priority</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{alerts.filter(a => getSeverityLevel(a) === 'medium').length}</span>
            <span className="stat-label">Medium Priority</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{alerts.filter(a => getSeverityLevel(a) === 'low').length}</span>
            <span className="stat-label">Low Priority</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{alerts.length}</span>
            <span className="stat-label">Total Alerts</span>
          </div>
        </div>
      </div>

      <div className="alerts-list">
        {alerts.length === 0 ? (
          <div className="no-alerts-flash">
            <div className="no-alerts-icon">✅</div>
            <h3>No alerts found</h3>
            <p>All systems are running smoothly. No alerts match your current filters.</p>
          </div>
        ) : (
          <div className="alerts-flash-grid">
            {alerts.map((alert) => (
              <div
                key={alert.notification_id || alert.id}
                className={`alert-flash-card ${getSeverityLevel(alert)} ${alert.is_read ? 'reviewed' : ''}`}
                onClick={() => setSelectedAlert(selectedAlert?.notification_id === alert.notification_id ? null : alert)}
              >
                <div className="alert-flash-header">
                  <div className="alert-flash-icon">
                    {getAlertIcon(alert.subtype)}
                  </div>
                  <div className="alert-flash-meta">
                    <span
                      className="severity-flash-badge"
                      style={{ backgroundColor: getSeverityColor(alert) }}
                    >
                      {getSeverityLevel(alert).toUpperCase()}
                    </span>
                    <span className="alert-flash-date">
                      {new Date(alert.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="alert-flash-content">
                  <h3 className="alert-flash-title">
                    {alert.farm_name || 'Unknown Farm'} - {alert.species || 'Unknown Species'}
                  </h3>
                  <p className="alert-flash-location">
                    📍 {alert.state || 'Unknown State'}, {alert.district || 'Unknown District'}
                  </p>
                  <p className="alert-flash-message">
                    {formatAlertMessage(alert)}
                  </p>
                </div>

                <div className="alert-flash-details">
                  <div className="detail-flash-item">
                    <span className="detail-flash-label">Vet:</span>
                    <span className="detail-flash-value">{alert.vet_name || 'N/A'}</span>
                  </div>
                  <div className="detail-flash-item">
                    <span className="detail-flash-label">Risk:</span>
                    <span className="detail-flash-value">{alert.risk_category || 'N/A'}</span>
                  </div>
                  <div className="detail-flash-item">
                    <span className="detail-flash-label">Farm ID:</span>
                    <span className="detail-flash-value">{alert.farm_id}</span>
                  </div>
                </div>

                <div className="alert-flash-actions">
                  {!alert.is_read && (
                    <button
                      className="review-flash-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsReviewed(alert.notification_id || alert.id);
                      }}
                    >
                      ✓ Mark as Reviewed
                    </button>
                  )}
                  {alert.is_read && (
                    <span className="reviewed-flash-badge">✓ Reviewed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedAlert && (
        <div className="alert-modal-overlay" onClick={() => setSelectedAlert(null)}>
          <div className="alert-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Alert Details</h2>
              <button className="modal-close" onClick={() => setSelectedAlert(null)}>×</button>
            </div>
            <div className="modal-content">
              <div className="alert-detail-grid">
                <div className="detail-section">
                  <h3>Farm Information</h3>
                  <p><strong>Farm Name:</strong> {selectedAlert.farm_name}</p>
                  <p><strong>Location:</strong> {selectedAlert.state}, {selectedAlert.district}</p>
                  <p><strong>Farm ID:</strong> {selectedAlert.farm_id}</p>
                </div>

                <div className="detail-section">
                  <h3>Animal Information</h3>
                  <p><strong>Species:</strong> {selectedAlert.species}</p>
                  <p><strong>Entity ID:</strong> {selectedAlert.entity_id}</p>
                  <p><strong>Tag ID:</strong> {selectedAlert.tag_id || 'N/A'}</p>
                </div>

                <div className="detail-section">
                  <h3>Alert Information</h3>
                  <p><strong>Type:</strong> {selectedAlert.subtype}</p>
                  <p><strong>Severity:</strong> {getSeverityLevel(selectedAlert).toUpperCase()}</p>
                  <p><strong>Risk Category:</strong> {selectedAlert.risk_category || 'N/A'}</p>
                  <p><strong>Date:</strong> {new Date(selectedAlert.created_at).toLocaleString()}</p>
                </div>

                <div className="detail-section">
                  <h3>Treatment Details</h3>
                  <p><strong>Medicine:</strong> {selectedAlert.medicine || 'N/A'}</p>
                  <p><strong>Dosage:</strong> {selectedAlert.dosage_amount} {selectedAlert.dosage_unit}</p>
                  <p><strong>Veterinarian:</strong> {selectedAlert.vet_name || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthorityComplaints;