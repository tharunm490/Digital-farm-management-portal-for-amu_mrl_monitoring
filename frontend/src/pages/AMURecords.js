import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { amuAPI } from '../services/api';
import TissuePredictionTable from '../components/TissuePredictionTable';
import './AMURecords.css';

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
          <label>{t('status')}:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">{t('all_records')}</option>
            <option value="safe">{t('safe_only')}</option>
            <option value="borderline">{t('borderline_only')}</option>
            <option value="unsafe">{t('unsafe_only')}</option>
          </select>
        </div>
        <div className="filter-group">
          <label>{t('search')}:</label>
          <input
            type="text"
            placeholder={t('search_medicine_animal')}
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
            <h3>{t('no_amu_records')}</h3>
            <p>
              {searchTerm || filter !== 'all'
                ? t('adjust_filters')
                : t('records_appear_here')}
            </p>
          </div>
        ) : (
          <div className="records-grid">
            {filteredRecords.map((record, index) => {
              const effectiveWithdrawalDays = (record.category_type === 'vaccine' || record.category_type === 'vitamin') ? 0 : (record.predicted_withdrawal_days || 0);
              const safeDate = record.safe_date ? formatDate(record.safe_date) : 'N/A';
              const daysUntilSafe = getDaysUntilSafe(record.safe_date);
              const displayWithdrawalDays = Math.max(0, effectiveWithdrawalDays); // Ensure withdrawal days are never negative

              return (
                <div key={record.amu_id || `amu-${index}`} className="record-card">
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
                      {getStatusIcon(record.status)} {getStatusText(record.status)}
                    </div>
                  </div>

                  <div className="card-body">
                    <div className="info-section">
                      <h4>{t('animal_batch')}</h4>
                      <p>
                        {record.entity_type === 'animal' ? `${getAnimalIcon(record.species)} ${record.tag_id}` : `📦 ${record.batch_name}`}
                      </p>
                      <p className="farm">🏡 {record.farm_name}</p>
                      <p className="species">{record.species}</p>
                    </div>

                    <div className="info-section">
                      <h4>{t('treatment')}</h4>
                      <p>{record.dose_amount} {record.dose_unit} • {record.route}</p>
                      <p>{record.frequency_per_day}x/day • {record.duration_days} days</p>
                      <p className="reason">{record.reason || 'N/A'}</p>
                    </div>

                    <div className="info-section">
                      <h4>{t('dates')}</h4>
                      <p>{t('start')}: {formatDate(record.start_date)}</p>
                      <p>{t('end')}: {formatDate(record.end_date)}</p>
                    </div>

                    <div className="info-section">
                      <h4>{t('safety')}</h4>
                      <p>{t('predicted_residual')}: {record.predicted_mrl ? `${record.predicted_mrl} µg/kg` : 'N/A'}</p>
                      <p>{t('risk')}: {record.risk_percent ? `${parseFloat(record.risk_percent).toFixed(2)}%` : 'N/A'}</p>
                      <p>{t('withdrawal')}: {displayWithdrawalDays} days</p>
                      <p className="safe-date">
                        {t('safe_date')}: {safeDate}
                        {daysUntilSafe !== null && daysUntilSafe > 0 && (
                          <span> ({daysUntilSafe} {t('days_left')})</span>
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
                        {expandedRecords.has(record.amu_id) ? '🔽 ' + t('hide') : '🔍 ' + t('show')} {t('residual_details')}
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