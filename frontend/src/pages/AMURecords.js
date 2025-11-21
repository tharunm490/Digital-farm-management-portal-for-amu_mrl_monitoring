import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { amuAPI } from '../services/api';
import './AMURecords.css';

function AMURecords() {
  const { user } = useAuth();
  const [amuRecords, setAmuRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('detailed'); // 'detailed' or 'compact'
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  const calculateSafeDate = (endDate, withdrawalDays) => {
    if (!endDate || !withdrawalDays) return 'N/A';
    const end = new Date(endDate);
    end.setDate(end.getDate() + withdrawalDays);
    return formatDate(end.toISOString().split('T')[0]);
  };

  const getDaysUntilSafe = (safeDate) => {
    if (!safeDate) return null;
    const safe = new Date(safeDate);
    const today = new Date();
    const diffTime = safe - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getRiskClass = (riskCategory) => {
    switch (riskCategory?.toLowerCase()) {
      case 'safe': return 'risk-safe';
      case 'borderline': return 'risk-borderline';
      case 'unsafe': return 'risk-unsafe';
      default: return 'risk-unknown';
    }
  };

  const getRiskIcon = (riskCategory) => {
    switch (riskCategory?.toLowerCase()) {
      case 'safe': return '✅';
      case 'borderline': return '⚠️';
      case 'unsafe': return '❌';
      default: return '❓';
    }
  };

  const filteredRecords = amuRecords.filter(record => {
    const daysUntilSafe = getDaysUntilSafe(record.safe_date);
    const isSafe = daysUntilSafe !== null && daysUntilSafe <= 0;
    const effectiveRiskCategory = isSafe ? 'safe' : (record.risk_category || 'unknown');

    const matchesFilter = filter === 'all' ||
      (filter === 'safe' && effectiveRiskCategory?.toLowerCase() === 'safe') ||
      (filter === 'borderline' && effectiveRiskCategory?.toLowerCase() === 'borderline') ||
      (filter === 'unsafe' && effectiveRiskCategory?.toLowerCase() === 'unsafe');

    const matchesSearch = !searchTerm ||
      record.medicine?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.active_ingredient?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.species?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.farm_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.tag_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.batch_name?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm]);

  const getStats = () => {
    const total = amuRecords.length;
    const safe = amuRecords.filter(r => {
      const daysUntilSafe = getDaysUntilSafe(r.safe_date);
      const isSafe = daysUntilSafe !== null && daysUntilSafe <= 0;
      return isSafe || r.risk_category?.toLowerCase() === 'safe';
    }).length;
    const borderline = amuRecords.filter(r => {
      const daysUntilSafe = getDaysUntilSafe(r.safe_date);
      const isSafe = daysUntilSafe !== null && daysUntilSafe <= 0;
      return !isSafe && r.risk_category?.toLowerCase() === 'borderline';
    }).length;
    const unsafe = amuRecords.filter(r => {
      const daysUntilSafe = getDaysUntilSafe(r.safe_date);
      const isSafe = daysUntilSafe !== null && daysUntilSafe <= 0;
      return !isSafe && r.risk_category?.toLowerCase() === 'unsafe';
    }).length;

    return { total, safe, borderline, unsafe };
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = filteredRecords.slice(startIndex, endIndex);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const stats = getStats();

  if (loading) return <div className="loading">Loading AMU records...</div>;

  return (
    <div className="amu-records-page">
      <div className="page-header">
        <h1>📊 AMU Records</h1>
        <p>Antimicrobial Use Monitoring & Risk Assessment</p>
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

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Risk Level:</label>
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
            placeholder="Search by medicine, species, farm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>View:</label>
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'detailed' ? 'active' : ''}`}
              onClick={() => setViewMode('detailed')}
            >
              📋 Detailed
            </button>
            <button
              className={`view-btn ${viewMode === 'compact' ? 'active' : ''}`}
              onClick={() => setViewMode('compact')}
            >
              📦 Compact
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* AMU Records List */}
      <div className="amu-records-container">
        {filteredRecords.length === 0 ? (
          <div className="no-records">
            <div className="no-records-icon">📭</div>
            <h3>No AMU records found</h3>
            <p>
              {searchTerm || filter !== 'all'
                ? 'Try adjusting your filters or search terms.'
                : 'AMU records will appear here when treatments are administered.'}
            </p>
          </div>
        ) : (
          <>
            <div className={`amu-records-table ${viewMode}`}>
              <div className="table-header">
                <div className="col-medicine">Medicine & Product</div>
                <div className="col-entity">Entity & Farm</div>
                <div className="col-treatment">Treatment Details</div>
                <div className="col-dates">Treatment Period</div>
                <div className="col-safety">Safety Info</div>
                <div className="col-status">Risk Status</div>
              </div>
              {currentRecords.map((record) => {
                const daysUntilSafe = getDaysUntilSafe(record.safe_date);
                const safeDate = record.safe_date ? formatDate(record.safe_date) : calculateSafeDate(record.end_date, record.predicted_withdrawal_days);
                const isSafe = daysUntilSafe !== null && daysUntilSafe <= 0;
                const effectiveRiskCategory = isSafe ? 'safe' : (record.risk_category || 'unknown');

                return (
                  <div key={record.amu_id} className={`table-row ${viewMode}`}>
                    <div className="col-medicine">
                      <div className="medicine-name">{record.active_ingredient || record.medicine}</div>
                      {viewMode === 'detailed' && (
                        <>
                          <div className="medicine-type">{record.medication_type}</div>
                          <div className="matrix-info">📦 {record.matrix || 'Unknown'}</div>
                        </>
                      )}
                      {viewMode === 'compact' && (
                        <div className="compact-info">
                          {record.medication_type} • 📦 {record.matrix || 'Unknown'}
                        </div>
                      )}
                    </div>
                    <div className="col-entity">
                      <div className="entity-name">
                        {record.entity_type === 'animal' ? `🐄 ${record.tag_id}` : `📦 ${record.batch_name}`}
                      </div>
                      {viewMode === 'detailed' && (
                        <>
                          <div className="farm-name">🏡 {record.farm_name}</div>
                          <div className="species-info">{record.species}</div>
                        </>
                      )}
                      {viewMode === 'compact' && (
                        <div className="compact-info">
                          🏡 {record.farm_name} • {record.species}
                        </div>
                      )}
                    </div>
                    <div className="col-treatment">
                      {viewMode === 'detailed' ? (
                        <>
                          <div className="treatment-detail">
                            <span className="dose">{record.dose_amount} {record.dose_unit}</span>
                            <span className="route">{record.route}</span>
                          </div>
                          <div className="treatment-detail">
                            <span className="freq">{record.frequency_per_day}x/day</span>
                            <span className="duration">{record.duration_days} days</span>
                          </div>
                          <div className="reason">{record.reason || record.cause || 'N/A'}</div>
                        </>
                      ) : (
                        <div className="compact-treatment">
                          {record.dose_amount} {record.dose_unit} • {record.route} • {record.frequency_per_day}x/day • {record.duration_days} days
                        </div>
                      )}
                    </div>
                    <div className="col-dates">
                      {viewMode === 'detailed' ? (
                        <>
                          <div className="date-info">
                            <div className="date-label">Start:</div>
                            <div className="date-value">{formatDate(record.start_date)}</div>
                          </div>
                          <div className="date-info">
                            <div className="date-label">End:</div>
                            <div className="date-value">{formatDate(record.end_date)}</div>
                          </div>
                        </>
                      ) : (
                        <div className="compact-dates">
                          {formatDate(record.start_date)} → {formatDate(record.end_date)}
                        </div>
                      )}
                    </div>
                    <div className="col-safety">
                      <div className="safety-item">
                        <div className="mrl-value">
                          {record.predicted_mrl ? `${record.predicted_mrl} µg/kg` : 'N/A'}
                        </div>
                        {viewMode === 'detailed' ? (
                          <div className="withdrawal-info">
                            <div className="withdrawal-days">{record.predicted_withdrawal_days || 0} days withdrawal</div>
                            <div className={`safe-date ${isSafe ? 'safe' : 'pending'}`}>
                              Safe: {safeDate}
                              {daysUntilSafe !== null && (
                                <span className="days-remaining">
                                  {daysUntilSafe > 0 ? ` (${daysUntilSafe} days left)` : daysUntilSafe === 0 ? ' (Ready today)' : ' (Safe)'}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="compact-safety">
                            {record.predicted_withdrawal_days || 0} days • Safe: {safeDate}
                            {daysUntilSafe !== null && daysUntilSafe > 0 && (
                              <span className="days-remaining"> ({daysUntilSafe} left)</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-status">
                      <span className={`risk-badge ${getRiskClass(effectiveRiskCategory)}`}>
                        {getRiskIcon(effectiveRiskCategory)} {effectiveRiskCategory || 'Unknown'}
                      </span>
                      {viewMode === 'detailed' && record.predicted_mrl_risk && (
                        <div className="risk-percentage">
                          {(record.predicted_mrl_risk * 100).toFixed(1)}% risk
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="page-btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ‹ Previous
                </button>

                <div className="page-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show first page, last page, current page, and pages around current
                      return page === 1 ||
                             page === totalPages ||
                             (page >= currentPage - 1 && page <= currentPage + 1);
                    })
                    .map((page, index, array) => (
                      <React.Fragment key={page}>
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="page-dots">...</span>
                        )}
                        <button
                          className={`page-btn ${currentPage === page ? 'active' : ''}`}
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}
                </div>

                <button
                  className="page-btn"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next ›
                </button>
              </div>
            )}

            {/* Results summary */}
            <div className="results-summary">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredRecords.length)} of {filteredRecords.length} records
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AMURecords;