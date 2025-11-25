import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { amuAPI } from '../services/api';
import TissuePredictionTable from '../components/TissuePredictionTable';
import './AMURecords.css';

function AMURecords() {
  const { user } = useAuth();
  const [amuRecords, setAmuRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRecords, setExpandedRecords] = useState(new Set());

  useEffect(() => {
    if (user) {
      fetchAMURecords();
    }
  }, [user]);

  const fetchAMURecords = async () => {
    try {
      setLoading(true);
      const response = await amuAPI.getByFarmer(user.user_id);
      setAmuRecords(response.data);
    } catch (err) {
      setError('Failed to fetch AMU records');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const intToDate = (dateInt) => {
    if (typeof dateInt === 'number') {
      const dateStr = dateInt.toString();
      const year = dateStr.slice(0, 4);
      const month = dateStr.slice(4, 6);
      const day = dateStr.slice(6, 8);
      return `${year}-${month}-${day}`;
    }
    return dateInt;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const dateStr = intToDate(dateString);
    const date = new Date(dateStr);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  const getDaysUntilSafe = (safeDate) => {
    if (!safeDate) return null;
    const safe = new Date(safeDate);
    const today = new Date();
    const diffTime = safe - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Safe': return 'status-safe';
      case 'Borderline': return 'status-borderline';
      case 'Unsafe': return 'status-unsafe';
      default: return 'status-unknown';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Safe': return '✅';
      case 'Borderline': return '⚠️';
      case 'Unsafe': return '❌';
      default: return '❓';
    }
  };

  const filteredRecords = amuRecords.filter(record => {
    const matchesFilter = filter === 'all' || record.status?.toLowerCase() === filter;
    const matchesSearch = !searchTerm ||
      record.medicine?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.active_ingredient?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.species?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.farm_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.tag_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.batch_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStats = () => {
    const total = amuRecords.length;
    const safe = amuRecords.filter(r => r.status === 'Safe').length;
    const borderline = amuRecords.filter(r => r.status === 'Borderline').length;
    const unsafe = amuRecords.filter(r => r.status === 'Unsafe').length;
    return { total, safe, borderline, unsafe };
  };

  const toggleExpand = (amuId) => {
    const newExpanded = new Set(expandedRecords);
    if (newExpanded.has(amuId)) {
      newExpanded.delete(amuId);
    } else {
      newExpanded.add(amuId);
    }
    setExpandedRecords(newExpanded);
  };

  const stats = getStats();

  if (loading) return <div className="loading">Loading AMU records...</div>;

  return (
    <div className="amu-records-page">
      <div className="page-header">
        <h1>AMU Records</h1>
        <p>Antimicrobial Use Monitoring</p>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">Total Records</div>
          </div>
        </div>
        <div className="stat-card safe">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">{stats.safe}</div>
            <div className="stat-label">Safe</div>
          </div>
        </div>
        <div className="stat-card borderline">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-number">{stats.borderline}</div>
            <div className="stat-label">Borderline</div>
          </div>
        </div>
        <div className="stat-card unsafe">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <div className="stat-number">{stats.unsafe}</div>
            <div className="stat-label">Unsafe</div>
          </div>
        </div>
      </div>

      {/* Simple Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Status:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Records</option>
            <option value="safe">Safe Only</option>
            <option value="borderline">Borderline Only</option>
            <option value="unsafe">Unsafe Only</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Search:</label>
          <input
            type="text"
            placeholder="Search medicine or animal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* AMU Records Cards */}
      <div className="records-container">
        {filteredRecords.length === 0 ? (
          <div className="no-records">
            <div className="no-records-icon">📭</div>
            <h3>No AMU records found</h3>
            <p>
              {searchTerm || filter !== 'all'
                ? 'Try adjusting your filters.'
                : 'Records will appear here when treatments are administered.'}
            </p>
          </div>
        ) : (
          <div className="records-grid">
            {filteredRecords.map((record) => {
              const effectiveWithdrawalDays = (record.category_type === 'vaccine' || record.category_type === 'vitamin') ? 0 : (record.predicted_withdrawal_days || 0);
              const safeDate = record.safe_date ? formatDate(record.safe_date) : 'N/A';
              const daysUntilSafe = getDaysUntilSafe(record.safe_date);
              const displayWithdrawalDays = Math.max(0, effectiveWithdrawalDays); // Ensure withdrawal days are never negative

              return (
                <div key={record.amu_id} className="record-card">
                  <div className="card-header">
                    <div className="medicine-info">
                      <h3>{record.active_ingredient || record.medicine}</h3>
                      <div className="header-meta">
                        <span className="category">{record.category_type}</span>
                        <span className={`matrix-indicator matrix-${record.matrix?.toLowerCase()}`}>
                          {record.matrix?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className={`status-badge ${getStatusClass(record.status)}`}>
                      {getStatusIcon(record.status)} {record.status}
                    </div>
                  </div>

                  <div className="card-body">
                    <div className="info-section">
                      <h4>Animal/Batch</h4>
                      <p>
                        {record.entity_type === 'animal' ? `🐄 ${record.tag_id}` : `📦 ${record.batch_name}`}
                      </p>
                      <p className="farm">🏡 {record.farm_name}</p>
                      <p className="species">{record.species}</p>
                    </div>

                    <div className="info-section">
                      <h4>Treatment</h4>
                      <p>{record.dose_amount} {record.dose_unit} • {record.route}</p>
                      <p>{record.frequency_per_day}x/day • {record.duration_days} days</p>
                      <p className="reason">{record.reason || 'N/A'}</p>
                    </div>

                    <div className="info-section">
                      <h4>Dates</h4>
                      <p>Start: {formatDate(record.start_date)}</p>
                      <p>End: {formatDate(record.end_date)}</p>
                    </div>

                    <div className="info-section">
                      <h4>Safety</h4>
                      <p>Predicted Residual: {record.predicted_mrl ? `${record.predicted_mrl} µg/kg` : 'N/A'}</p>
                      <p>Risk: {record.risk_percent ? `${parseFloat(record.risk_percent).toFixed(2)}%` : 'N/A'}</p>
                      <p>Withdrawal: {displayWithdrawalDays} days</p>
                      <p className="safe-date">
                        Safe Date: {safeDate}
                        {daysUntilSafe !== null && daysUntilSafe > 0 && (
                          <span> ({daysUntilSafe} days left)</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Residual Details Button for Meat */}
                  {record.matrix === 'meat' && (
                    <div className="card-footer">
                      <button 
                        onClick={() => toggleExpand(record.amu_id)} 
                        className="expand-btn"
                      >
                        {expandedRecords.has(record.amu_id) ? '🔽 Hide' : '🔍 Show'} Residual Details
                      </button>
                    </div>
                  )}

                  {/* Expanded Residual Details */}
                  {expandedRecords.has(record.amu_id) && record.matrix === 'meat' && (
                    <div className="residual-details">
                      {record.tissue_results ? (
                        <TissuePredictionTable tissueResults={record.tissue_results} matrix={record.matrix} />
                      ) : (
                        <div className="no-data">
                          <p>🔬 No tissue prediction data available for this record.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default AMURecords;