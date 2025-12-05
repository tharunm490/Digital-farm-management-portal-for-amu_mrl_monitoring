import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { amuAPI } from '../services/api';
import TissuePredictionTable from '../components/TissuePredictionTable';
import './AMURecords.css';
import './EnhancedModules.css';

function AMURecords() {
  const { user } = useAuth();
  const { t } = useTranslation();
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
      let response;
      if (user.role === 'farmer') {
        response = await amuAPI.getByFarmer(user.farmer_id);
      } else if (user.role === 'veterinarian') {
        response = await amuAPI.getByVet(user.user_id); // Assuming vet_id is stored in user object
      } else {
        setAmuRecords([]);
        return;
      }
      
      // Check for duplicates
      const records = response.data;
      const seen = new Set();
      const duplicates = [];
      records.forEach(record => {
        if (seen.has(record.amu_id)) {
          duplicates.push(record.amu_id);
        } else {
          seen.add(record.amu_id);
        }
      });
      
      if (duplicates.length > 0) {
        console.warn('Duplicate AMU records found:', duplicates);
        // Remove duplicates
        const uniqueRecords = records.filter((record, index, self) => 
          index === self.findIndex(r => r.amu_id === record.amu_id)
        );
        setAmuRecords(uniqueRecords);
      } else {
        setAmuRecords(records);
      }
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

  const getAnimalIcon = (species) => {
    const normalizedSpecies = species?.toLowerCase();
    switch (normalizedSpecies) {
      case 'cattle': return '🐄';
      case 'pig':
      case 'pigs': return '🐖';
      case 'sheep': return '🐑';
      case 'goat': return '🐐';
      default: return '🐄'; // Default to cattle icon
    }
  };

  const getStatusClass = (status) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'safe': return 'status-safe';
      case 'borderline': return 'status-borderline';
      case 'unsafe': return 'status-unsafe';
      default: return 'status-unknown';
    }
  };

  const getStatusIcon = (status) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'safe': return '✅';
      case 'borderline': return '⚠️';
      case 'unsafe': return '❌';
      default: return '❓';
    }
  };

  const getStatusText = (status) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'safe': return 'Safe';
      case 'borderline': return 'Borderline';
      case 'unsafe': return 'Unsafe';
      default: return status || 'Unknown';
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
    const safe = amuRecords.filter(r => r.status?.toLowerCase() === 'safe').length;
    const borderline = amuRecords.filter(r => r.status?.toLowerCase() === 'borderline').length;
    const unsafe = amuRecords.filter(r => r.status?.toLowerCase() === 'unsafe').length;
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

  if (loading) return (
    <div className="module-page">
      <div className="module-loading">
        <div className="module-spinner"></div>
        <div className="module-loading-text">Loading AMU records...</div>
      </div>
    </div>
  );

  return (
    <div className="module-page">
      {/* Enhanced Header */}
      <div className="module-header">
        <div className="module-header-card">
          <div className="module-header-content">
            <div className="module-title-section">
              <div className="module-icon-circle" style={{background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)'}}>
                📊
              </div>
              <div className="module-title-text">
                <h1>AMU Records</h1>
                <p>Antimicrobial Use Monitoring & Safety Tracking</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="module-stats-grid">
        <div className="module-stat-card" style={{borderLeftColor: '#3b82f6'}}>
          <div className="module-stat-content">
            <div className="module-stat-icon">📋</div>
            <div className="module-stat-value">{stats.total}</div>
            <div className="module-stat-label">Total Records</div>
          </div>
        </div>
        <div className="module-stat-card" style={{borderLeftColor: '#10b981'}}>
          <div className="module-stat-content">
            <div className="module-stat-icon">✅</div>
            <div className="module-stat-value">{stats.safe}</div>
            <div className="module-stat-label">Safe</div>
          </div>
        </div>
        <div className="module-stat-card" style={{borderLeftColor: '#f59e0b'}}>
          <div className="module-stat-content">
            <div className="module-stat-icon">⚠️</div>
            <div className="module-stat-value">{stats.borderline}</div>
            <div className="module-stat-label">Borderline</div>
          </div>
        </div>
        <div className="module-stat-card" style={{borderLeftColor: '#ef4444'}}>
          <div className="module-stat-content">
            <div className="module-stat-icon">❌</div>
            <div className="module-stat-value">{stats.unsafe}</div>
            <div className="module-stat-label">Unsafe</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="module-filters">
        <div className="module-filters-card">
          <div className="filter-field">
            <label>{t('status')}:</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">{t('all_records')}</option>
              <option value="safe">{t('safe_only')}</option>
              <option value="borderline">{t('borderline_only')}</option>
              <option value="unsafe">{t('unsafe_only')}</option>
            </select>
          </div>
          <div className="filter-field">
            <label>{t('search')}:</label>
            <input
              type="text"
              placeholder={t('search_medicine_animal')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-6xl mx-auto px-6 mb-6">
          <div style={{background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', padding: '1rem 1.5rem', borderRadius: '16px', border: '2px solid #fca5a5', display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
            <span style={{fontSize: '1.5rem'}}>❌</span>
            <p style={{color: '#991b1b', fontWeight: '600', margin: 0}}>{error}</p>
          </div>
        </div>
      )}

      {/* AMU Records Flash Cards */}
      <div className="records-container">
        {filteredRecords.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>{t('no_amu_records')}</h3>
            <p>
              {searchTerm || filter !== 'all'
                ? t('adjust_filters')
                : t('records_appear_here')}
            </p>
          </div>
        ) : (
          <div className="amu-grid">
            {filteredRecords.map((record, index) => {
              const effectiveWithdrawalDays = (record.category_type === 'vaccine' || record.category_type === 'vitamin') ? 0 : (record.predicted_withdrawal_days || 0);
              const safeDate = record.safe_date ? formatDate(record.safe_date) : 'N/A';
              const daysUntilSafe = getDaysUntilSafe(record.safe_date);
              const displayWithdrawalDays = Math.max(0, effectiveWithdrawalDays);
              const statusClass = getStatusClass(record.status).replace('status-', '');

              return (
                <div key={record.amu_id || `amu-${index}`} className="amu-flash-card">
                  <div className="amu-card-header">
                    <div className="amu-card-title">
                      <div className="amu-title-left">
                        <h3>💊 {record.active_ingredient || record.medicine}</h3>
                        <p className="amu-subtitle">
                          {record.entity_type === 'animal' ? `${getAnimalIcon(record.species)} ${record.tag_id}` : `📦 ${record.batch_name}`}
                        </p>
                      </div>
                      <div className={`amu-status-badge ${statusClass}`}>
                        {getStatusIcon(record.status)} {getStatusText(record.status)}
                      </div>
                    </div>
                  </div>

                  <div className="amu-card-body">
                    <div className="amu-info-grid">
                      <div className="amu-info-row">
                        <span className="amu-info-label">🏡 Farm</span>
                        <span className="amu-info-value">{record.farm_name}</span>
                      </div>

                      <div className="amu-info-row">
                        <span className="amu-info-label">🐾 Species</span>
                        <span className="amu-info-value">{record.species}</span>
                      </div>

                      <div className="amu-info-row">
                        <span className="amu-info-label">🥛 Product</span>
                        <span className="amu-info-value">{record.matrix?.toUpperCase()}</span>
                      </div>

                      <div className="amu-info-row">
                        <span className="amu-info-label">📋 Category</span>
                        <span className="amu-info-value">{record.category_type}</span>
                      </div>

                      <div className="amu-info-row">
                        <span className="amu-info-label">💉 Dosage</span>
                        <span className="amu-info-value">{record.dose_amount} {record.dose_unit}</span>
                      </div>

                      <div className="amu-info-row">
                        <span className="amu-info-label">🔄 Route</span>
                        <span className="amu-info-value">{record.route}</span>
                      </div>

                      <div className="amu-info-row">
                        <span className="amu-info-label">⏱️ Frequency</span>
                        <span className="amu-info-value">{record.frequency_per_day}x/day</span>
                      </div>

                      <div className="amu-info-row">
                        <span className="amu-info-label">📅 Duration</span>
                        <span className="amu-info-value">{record.duration_days} days</span>
                      </div>

                      <div className="amu-info-row">
                        <span className="amu-info-label">📆 Start Date</span>
                        <span className="amu-info-value">{formatDate(record.start_date)}</span>
                      </div>

                      <div className="amu-info-row">
                        <span className="amu-info-label">📆 End Date</span>
                        <span className="amu-info-value">{formatDate(record.end_date)}</span>
                      </div>

                      {record.reason && (
                        <div className="amu-info-row" style={{gridColumn: '1 / -1'}}>
                          <span className="amu-info-label">💬 Reason</span>
                          <span className="amu-info-value">{record.reason}</span>
                        </div>
                      )}
                    </div>

                    <div className={`amu-mrl-highlight ${statusClass === 'safe' ? '' : statusClass === 'borderline' ? 'warning' : 'danger'}`}>
                      <div className="amu-mrl-title">🔬 Residual Analysis</div>
                      <div className="amu-info-grid">
                        <div className="amu-info-row highlight">
                          <span className="amu-info-label">📊 Predicted Residual</span>
                          <span className="amu-mrl-value">{record.predicted_mrl ? `${parseFloat(record.predicted_mrl).toFixed(2)} µg/kg` : 'N/A'}</span>
                        </div>
                        <div className="amu-info-row highlight">
                          <span className="amu-info-label">⚠️ Risk Level</span>
                          <span className="amu-mrl-value">{record.risk_percent ? `${parseFloat(record.risk_percent).toFixed(2)}%` : 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="amu-withdrawal-info">
                      <div className="amu-withdrawal-title">⏳ Withdrawal Period</div>
                      <div className="amu-withdrawal-days">{displayWithdrawalDays} days</div>
                      <div className="amu-info-row">
                        <span className="amu-info-label">✅ Safe Date</span>
                        <span className="amu-info-value">
                          {safeDate}
                          {daysUntilSafe !== null && daysUntilSafe > 0 && (
                            <> ({daysUntilSafe} days left)</>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {record.matrix === 'meat' && (
                    <div className="amu-card-footer">
                      <button 
                        onClick={() => toggleExpand(record.amu_id)} 
                        className="amu-expand-btn"
                      >
                        {expandedRecords.has(record.amu_id) ? '🔽 Hide' : '🔍 Show'} Tissue Details
                      </button>
                    </div>
                  )}

                  {expandedRecords.has(record.amu_id) && record.matrix === 'meat' && (
                    <div className="residual-details">
                      {record.tissue_results ? (
                        <TissuePredictionTable tissueResults={record.tissue_results} matrix={record.matrix} />
                      ) : (
                        <div className="no-data">
                          <p>🔬 {t('no_tissue_data')}</p>
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