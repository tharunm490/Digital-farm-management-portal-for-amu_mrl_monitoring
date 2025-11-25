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

  useEffect(() => {
    if (window.innerWidth < 768) {
      setViewMode('compact');
    }
  }, []);

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

  const calculateSafeDate = (endDate, withdrawalDays) => {
    if (!endDate || withdrawalDays === null || withdrawalDays === undefined) return 'N/A';
    const endStr = intToDate(endDate);
    const end = new Date(endStr);
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

  const getMrlStatus = (predicted_mrl, safe_max, borderline_max, unsafe_above) => {
    if (safe_max === null || safe_max === undefined) {
        return { status: 'Safe', color: 'green' };
    }
    if (predicted_mrl <= safe_max) {
        return { status: 'Safe', color: 'green' };
    }
    if (predicted_mrl <= borderline_max) {
        return { status: 'Borderline', color: 'yellow' };
    }
    return { status: 'Unsafe', color: 'red' };
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Safe': return 'risk-safe';
      case 'Borderline': return 'risk-borderline';
      case 'Unsafe': return 'risk-unsafe';
      default: return 'risk-unknown';
    }
  };

  const getRiskIcon = (status) => {
    switch (status) {
      case 'Safe': return '✅';
      case 'Borderline': return '⚠️';
      case 'Unsafe': return '❌';
      default: return '❓';
    }
  };

  const filteredRecords = amuRecords.filter(record => {
    const effectiveRiskCategory = record.status ? record.status.toLowerCase().replace(' ', '-') : 'unknown';

    const matchesFilter = filter === 'all' ||
      (filter === 'safe' && effectiveRiskCategory === 'safe') ||
      (filter === 'borderline' && effectiveRiskCategory === 'borderline') ||
      (filter === 'unsafe' && effectiveRiskCategory === 'unsafe');

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
    const safe = amuRecords.filter(r => r.status === 'Safe').length;
    const borderline = amuRecords.filter(r => r.status === 'Borderline').length;
    const unsafe = amuRecords.filter(r => r.status === 'Unsafe').length;

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
                // Override withdrawal days for vaccine and vitamin categories
                const effectiveWithdrawalDays = (record.category_type === 'vaccine' || record.category_type === 'vitamin') ? 0 : (record.predicted_withdrawal_days || 0);
                
                const daysUntilSafe = getDaysUntilSafe(record.safe_date);
                const safeDate = record.safe_date ? formatDate(record.safe_date) : calculateSafeDate(record.end_date, effectiveWithdrawalDays);

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
                          Predicted Residual Limit: {record.predicted_mrl ? `${record.predicted_mrl} µg/kg` : 'N/A'}
                        </div>
                        {viewMode === 'detailed' ? (
                          <div className="withdrawal-info">
                            <div className="withdrawal-days">{effectiveWithdrawalDays} days withdrawal</div>
                            <div className={`safe-date ${daysUntilSafe !== null && daysUntilSafe <= 0 ? 'safe' : 'pending'}`}>
                              Safe: {safeDate}
                              {daysUntilSafe !== null && (
                                <span className="days-remaining">
                                  {daysUntilSafe > 0 ? ` (${daysUntilSafe} days left)` : daysUntilSafe === 0 ? ' (Ready today)' : ' (Safe)'}
                                </span>
                              )}
                            </div>
                            <div className="limits">
                              Safe limit: {record.safe_max !== null ? record.safe_max : '–'}
                            </div>
                            <div className="limits">
                              Borderline limit: {record.borderline_max !== null ? record.borderline_max : '–'}
                            </div>
                            <div className="limits">
                              Unsafe above: {record.unsafe_above !== null ? record.unsafe_above : '–'}
                            </div>
                          </div>
                        ) : (
                          <div className="compact-safety">
                            {effectiveWithdrawalDays} days • Safe: {safeDate}
                            {daysUntilSafe !== null && daysUntilSafe > 0 && (
                              <span className="days-remaining"> ({daysUntilSafe} left)</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-status">
                      {record.status !== 'Unknown' && (
                        <span className={`risk-badge ${getStatusClass(record.status)}`}>
                          {getRiskIcon(record.status)} {record.status}
                        </span>
                      )}
                      {viewMode === 'detailed' && record.overdosage && (
                        <div className="risk-percentage">
                          ⚠️ OVERDOSAGE DETECTED
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