import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './AuthorityAMUAnalytics.css';
import indiaLocations from '../../data/indiaLocations';

const AuthorityAMUAnalytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState({
    antibioticUsageBySpecies: [],
    treatmentTrends: [],
    topMedicines: [],
    riskDistribution: { safe: 0, borderline: 0, unsafe: 0 },
    overdosageEvents: 0,
    monthlyTrends: [],
    stateWiseUsage: []
  });
  const [amuRecords, setAmuRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30'); // days
  const [selectedMetric, setSelectedMetric] = useState('usage');
  const [filters, setFilters] = useState({
    state: '',
    district: '',
    taluk: '',
    species: '',
    risk_category: ''
  });

  useEffect(() => {
    fetchAMUAnalytics();
  }, [timeRange]);

  useEffect(() => {
    fetchAMURecords();
  }, [filters]);

  useEffect(() => {
    if (selectedMetric === 'risk' && amuRecords.length === 0) {
      fetchAMURecords();
    }
  }, [selectedMetric]);

  const fetchAMUAnalytics = async () => {
    try {
      setError(null);
      const response = await api.get(`/authority/amu-analytics?days=${timeRange}`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching AMU analytics:', error);
      setError('Unable to load analytics data. Please check your connection and try again.');
      // Set some fallback data to prevent empty UI
      setAnalytics({
        antibioticUsageBySpecies: [
          { species: 'cattle', count: 0 },
          { species: 'poultry', count: 0 },
          { species: 'pig', count: 0 },
          { species: 'sheep', count: 0 }
        ],
        treatmentTrends: [],
        topMedicines: [
          { medicine: 'No data available', usage_count: 0 },
          { medicine: 'No data available', usage_count: 0 },
          { medicine: 'No data available', usage_count: 0 },
          { medicine: 'No data available', usage_count: 0 },
          { medicine: 'No data available', usage_count: 0 }
        ],
        riskDistribution: { safe: 0, borderline: 0, unsafe: 0 },
        overdosageEvents: 0,
        monthlyTrends: [{ month: '2025-11', count: 0 }],
        stateWiseUsage: []
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAMURecords = async () => {
    try {
      setLoadingRecords(true);
      console.log('Fetching AMU records with filters:', filters);
      const params = new URLSearchParams();
      params.append('limit', '50');
      params.append('sort_by', 'created_at');
      params.append('sort_order', 'DESC');

      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await api.get(`/authority/amu-records?${params}`);
      console.log('AMU records response:', response.data);
      setAmuRecords(response.data.records || []);
    } catch (error) {
      console.error('Error fetching AMU records:', error);
      setAmuRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleAMURecordClick = (record) => {
    // Show detailed AMU record information
    const details = `
AMU Record Details (ID: ${record.amu_id})

📊 BASIC INFORMATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Species: ${record.species || 'N/A'}
Medicine: ${record.medicine || 'N/A'}
Category: ${record.category_type || 'N/A'}

💊 DOSAGE INFORMATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Amount: ${record.dosage.amount || 'N/A'} ${record.dosage.unit || ''}
Route: ${record.dosage.route || 'N/A'}
Frequency: ${record.dosage.frequency_per_day || 'N/A'} times per day
Duration: ${record.dosage.duration_days || 'N/A'} days

👤 FARMER & FARM DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Farmer: ${record.farmer_name || 'N/A'}
Farm: ${record.farm_name || 'N/A'}
Location: ${record.location.state || ''}${record.location.state && record.location.district ? ', ' : ''}${record.location.district || ''}${record.location.district && record.location.taluk ? ', ' : ''}${record.location.taluk || ''}

📅 TREATMENT DATES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Start Date: ${record.dates.start_date ? new Date(record.dates.start_date).toLocaleDateString() : 'N/A'}
End Date: ${record.dates.end_date ? new Date(record.dates.end_date).toLocaleDateString() : 'N/A'}
Created: ${record.created_at ? new Date(record.created_at).toLocaleString() : 'N/A'}

⏳ WITHDRAWAL INFORMATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Predicted Withdrawal Days: ${record.withdrawal.predicted_withdrawal_days || 'N/A'}
Safe Date: ${record.withdrawal.safe_date ? new Date(record.withdrawal.safe_date).toLocaleDateString() : 'N/A'}

⚠️ RISK ASSESSMENT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Risk Category: ${record.risk.risk_category || 'N/A'}
Predicted Residual: ${record.risk.predicted_mrl || 'N/A'}
Risk Percentage: ${record.risk.risk_percent ? `${record.risk.risk_percent}%` : 'N/A'}

🏥 ADDITIONAL DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Matrix Type: ${record.matrix || 'N/A'}
Veterinarian: ${record.veterinarian_name || 'N/A'}
    `.trim();

    alert(details);
  };

  const exportToPDF = () => {
    // Placeholder for PDF export
    alert('PDF export functionality will be implemented');
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [filterType]: value };
      // Reset dependent filters
      if (filterType === 'state') {
        newFilters.district = '';
        newFilters.taluk = '';
      } else if (filterType === 'district') {
        newFilters.taluk = '';
      }
      return newFilters;
    });
  };

  const getStates = () => Object.keys(indiaLocations);

  const getDistricts = () => {
    if (!filters.state) return [];
    return Object.keys(indiaLocations[filters.state] || {});
  };

  const getTaluks = () => {
    if (!filters.state || !filters.district) return [];
    return indiaLocations[filters.state]?.[filters.district] || [];
  };

  const renderAMUFlashcards = () => {
    return (
      <div className="flash-card wide">
        <div className="flash-card-header">
          <div className="card-icon">💊</div>
          <h3>AMU Records ({amuRecords.length})</h3>
          <button
            className="refresh-btn"
            onClick={fetchAMURecords}
            disabled={loadingRecords}
            style={{
              cursor: loadingRecords ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem',
              marginLeft: 'auto'
            }}
          >
            {loadingRecords ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
        </div>

        {/* Search Filters */}
        <div className="search-filters-bar">
          <div className="filter-group">
            <label>State:</label>
            <select
              value={filters.state}
              onChange={(e) => handleFilterChange('state', e.target.value)}
            >
              <option value="">All States</option>
              {getStates().map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>District:</label>
            <select
              value={filters.district}
              onChange={(e) => handleFilterChange('district', e.target.value)}
              disabled={!filters.state}
            >
              <option value="">All Districts</option>
              {getDistricts().map(district => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Taluk:</label>
            <select
              value={filters.taluk}
              onChange={(e) => handleFilterChange('taluk', e.target.value)}
              disabled={!filters.district}
            >
              <option value="">All Taluks</option>
              {getTaluks().map(taluk => (
                <option key={taluk} value={taluk}>{taluk}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Species:</label>
            <select
              value={filters.species}
              onChange={(e) => handleFilterChange('species', e.target.value)}
            >
              <option value="">All Species</option>
              <option value="cattle">Cattle</option>
              <option value="buffalo">Buffalo</option>
              <option value="goat">Goat</option>
              <option value="sheep">Sheep</option>
              <option value="pig">Pig</option>
              <option value="poultry">Poultry</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Risk Category:</label>
            <select
              value={filters.risk_category}
              onChange={(e) => handleFilterChange('risk_category', e.target.value)}
            >
              <option value="">All Risks</option>
              <option value="safe">Safe</option>
              <option value="borderline">Borderline</option>
              <option value="unsafe">Unsafe</option>
            </select>
          </div>

          <button
            className="clear-filters-btn"
            onClick={() => setFilters({
              state: '',
              district: '',
              taluk: '',
              species: '',
              risk_category: ''
            })}
          >
            Clear Filters
          </button>
        </div>

        <div className="flash-card-content">
          {loadingRecords ? (
            <div className="loading-records">
              <div className="loading-spinner">Loading AMU records...</div>
            </div>
          ) : !amuRecords || amuRecords.length === 0 ? (
            <div className="no-data-flash">
              <div className="no-data-icon">💊</div>
              <p>No AMU records available</p>
              <p className="no-data-hint">
                Try adjusting your filters or click refresh to try loading data again
              </p>
            </div>
          ) : (
            <div className="amu-flashcards-container">
              {amuRecords.map((record, index) => {
                const riskClass = record.risk.risk_category === 'Safe' ? 'safe' :
                                 record.risk.risk_category === 'Borderline' ? 'borderline' : 'unsafe';

                return (
                  <div key={record.amu_id || index} className="amu-flashcard" onClick={() => handleAMURecordClick(record)}>
                    <div className="amu-flashcard-header">
                      <div className="amu-species-info">
                        <span className="amu-species">{record.species || 'Unknown Species'}</span>
                        <span className={`amu-risk-badge ${riskClass}`}>
                          {record.risk.risk_category || 'Unknown'}
                        </span>
                      </div>
                      <div className="amu-date">
                        {record.created_at ? new Date(record.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>

                    <div className="amu-flashcard-body">
                      <div className="amu-medicine-section">
                        <div className="amu-medicine-name">{record.medicine || 'Unknown Medicine'}</div>
                        <div className="amu-category">Category: {record.category_type || 'N/A'}</div>
                        <div className="amu-dosage">
                          Dosage: {record.dosage.amount || 'N/A'} {record.dosage.unit || ''} {record.dosage.route || ''} {record.dosage.frequency_per_day ? `${record.dosage.frequency_per_day}x/day` : ''} for {record.dosage.duration_days || 'N/A'} days
                        </div>
                      </div>

                      <div className="amu-location-section">
                        <div className="amu-farmer">👤 {record.farmer_name || 'Unknown Farmer'}</div>
                        <div className="amu-farm">🏡 {record.farm_name || 'Unknown Farm'}</div>
                        <div className="amu-location">
                          📍 {record.location.state || ''}{record.location.state && record.location.district ? ', ' : ''}{record.location.district || ''}{record.location.district && record.location.taluk ? ', ' : ''}{record.location.taluk || ''}
                        </div>
                      </div>

                      <div className="amu-dates-section">
                        <div className="amu-dates">
                          Start: {record.dates.start_date ? new Date(record.dates.start_date).toLocaleDateString() : 'N/A'} |
                          End: {record.dates.end_date ? new Date(record.dates.end_date).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="amu-withdrawal">
                          Withdrawal: {record.withdrawal.predicted_withdrawal_days || 'N/A'} days |
                          Safe Date: {record.withdrawal.safe_date ? new Date(record.withdrawal.safe_date).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>

                      <div className="amu-risk-section">
                        <div className="amu-mrl">Predicted Residual: {record.risk.predicted_mrl || 'N/A'}</div>
                        <div className="amu-risk-percent">Risk: {record.risk.risk_percent ? `${record.risk.risk_percent}%` : 'N/A'}</div>
                      </div>

                      <div className="amu-details-section">
                        <div className="amu-matrix">Matrix: {record.matrix || 'N/A'}</div>
                        <div className="amu-vet">👨‍⚕️ {record.veterinarian_name || 'Unknown Vet'}</div>
                      </div>
                    </div>

                    <div className="amu-flashcard-footer">
                      <div className="amu-treatment-id">AMU #{record.amu_id || 'N/A'}</div>
                      <div className="amu-click-hint">Click for details</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTrendChart = () => {
    const { monthlyTrends } = analytics;
    if (!monthlyTrends || monthlyTrends.length === 0) {
      return (
        <div className="no-data-container">
          <div className="no-data-icon">📈</div>
          <p className="no-data-text">No trend data available</p>
        </div>
      );
    }

    const maxValue = Math.max(...monthlyTrends.map(item => item.count || 0));

    return (
      <div className="trend-chart">
        <div className="trend-header">
          <h3>Monthly Treatment Trends</h3>
          <div className="trend-period">{timeRange} days</div>
        </div>
        <div className="trend-visualization">
          {monthlyTrends.map((item, index) => {
            const height = maxValue > 0 ? (item.count / maxValue) * 100 : 0;
            return (
              <div key={index} className="trend-bar">
                <div className="trend-bar-fill" style={{ height: `${height}%` }}>
                  <span className="trend-value">{item.count}</span>
                </div>
                <span className="trend-label">{item.month}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="authority-amu-analytics">
        <div className="analytics-header">
          <div className="header-content">
            <div className="header-icon">📊</div>
            <div className="header-text">
              <h1>AMU Analytics Dashboard</h1>
              <p>Comprehensive antimicrobial usage insights and monitoring</p>
            </div>
          </div>
        </div>
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading analytics data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="authority-amu-analytics">
      <div className="analytics-header">
        <h1>📊 AMU Analytics</h1>
        <p>Antimicrobial usage insights and monitoring</p>
      </div>

      {/* Quick Stats Flashcards */}
      <div className="analytics-stats-grid">
        <div className="stat-flashcard">
          <div className="stat-icon">💊</div>
          <div className="stat-content">
            <div className="stat-value">{amuRecords.length}</div>
            <div className="stat-label">Total Records</div>
          </div>
        </div>
        <div className="stat-flashcard">
          <div className="stat-icon">🚨</div>
          <div className="stat-content">
            <div className="stat-value">{amuRecords.filter(r => r.risk?.risk_category === 'Unsafe').length}</div>
            <div className="stat-label">Unsafe Records</div>
          </div>
        </div>
        <div className="stat-flashcard">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-value">{amuRecords.filter(r => r.risk?.risk_category === 'Borderline').length}</div>
            <div className="stat-label">Borderline</div>
          </div>
        </div>
        <div className="stat-flashcard">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{amuRecords.filter(r => r.risk?.risk_category === 'Safe').length}</div>
            <div className="stat-label">Safe Records</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <div className="error-icon">⚠️</div>
          <div className="error-message">{error}</div>
          <button className="retry-btn" onClick={fetchAMUAnalytics}>
            🔄 Retry
          </button>
        </div>
      )}

      {/* Filters Flashcard */}
      <div className="filters-flashcard">
        <div className="filter-group">
          <label>State:</label>
          <select value={filters.state} onChange={(e) => handleFilterChange('state', e.target.value)}>
            <option value="">All States</option>
            {getStates().map(state => <option key={state} value={state}>{state}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>District:</label>
          <select value={filters.district} onChange={(e) => handleFilterChange('district', e.target.value)} disabled={!filters.state}>
            <option value="">All Districts</option>
            {getDistricts().map(district => <option key={district} value={district}>{district}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>Species:</label>
          <select value={filters.species} onChange={(e) => handleFilterChange('species', e.target.value)}>
            <option value="">All Species</option>
            <option value="cattle">Cattle</option>
            <option value="buffalo">Buffalo</option>
            <option value="goat">Goat</option>
            <option value="sheep">Sheep</option>
            <option value="pig">Pig</option>
            <option value="poultry">Poultry</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Risk:</label>
          <select value={filters.risk_category} onChange={(e) => handleFilterChange('risk_category', e.target.value)}>
            <option value="">All Risks</option>
            <option value="safe">Safe</option>
            <option value="borderline">Borderline</option>
            <option value="unsafe">Unsafe</option>
          </select>
        </div>
        <button className="refresh-btn" onClick={fetchAMURecords} disabled={loadingRecords}>
          {loadingRecords ? '🔄 Loading...' : '🔄 Refresh'}
        </button>
      </div>

      <div className="analytics-content">

        {/* Top Medicines Compact Card */}
        <div className="compact-card">
          <div className="compact-card-header">
            <h3>💊 Top Medicines</h3>
          </div>
          <div className="compact-card-content">
            {analytics.topMedicines && analytics.topMedicines.length > 0 ? (
              <div className="medicines-compact-list">
                {analytics.topMedicines.slice(0, 5).map((medicine, index) => (
                  <div key={index} className="medicine-compact-item">
                    <span className="rank">#{index + 1}</span>
                    <span className="name">{medicine.medicine || medicine.name || 'Unknown'}</span>
                    <span className="count">{medicine.usage_count || medicine.count || 0}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data-hint">No medicine data available</p>
            )}
          </div>
        </div>

        {/* Treatment Trends Compact Card */}
        <div className="compact-card wide">
          <div className="compact-card-header">
            <h3>📈 Monthly Trends</h3>
          </div>
          <div className="compact-card-content">
            {analytics.monthlyTrends && analytics.monthlyTrends.length > 0 ? (
              <div className="trends-compact-grid">
                {analytics.monthlyTrends.slice(-6).map((item, index) => (
                  <div key={index} className="trend-compact-item">
                    <div className="trend-value">{item.count}</div>
                    <div className="trend-month">{item.month}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data-hint">No trend data available</p>
            )}
          </div>
        </div>

        {/* AMU Records Grid */}
        <div className="compact-card wide">
          <div className="compact-card-header">
            <h3>💊 Recent AMU Records ({amuRecords.length})</h3>
          </div>
          <div className="compact-card-content">
            {loadingRecords ? (
              <p className="no-data-hint">Loading AMU records...</p>
            ) : !amuRecords || amuRecords.length === 0 ? (
              <p className="no-data-hint">No AMU records available</p>
            ) : (
              <div className="amu-records-grid">
                {amuRecords.slice(0, 10).map((record, index) => (
                  <div key={record.amu_id || index} className="amu-record-card">
                    <div className="amu-record-header">
                      <span className="amu-species">{record.species || 'Unknown'}</span>
                      <span className={`amu-risk-badge ${(record.risk?.risk_category || '').toLowerCase()}`}>
                        {record.risk?.risk_category || 'N/A'}
                      </span>
                    </div>
                    <div className="amu-record-body">
                      <div className="amu-medicine">{record.medicine || 'Unknown Medicine'}</div>
                      <div className="amu-location">📍 {record.state || 'N/A'}, {record.district || 'N/A'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedMetric === 'trends' && (
        <div className="analytics-content">
          <div className="compact-card">
            <div className="compact-card-header">
              <h3>📊 Treatment Frequency</h3>
            </div>
            <div className="compact-card-content">
              <p className="no-data-hint">Trend analysis coming soon</p>
            </div>
          </div>
        </div>
      )}

      {selectedMetric === 'risk' && (
        <div className="analytics-content">
          <div className="compact-card">
            <div className="compact-card-header">
              <h3>🚨 Risk Assessment</h3>
            </div>
            <div className="compact-card-content">
              <p className="no-data-hint">Risk assessment coming soon</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthorityAMUAnalytics;