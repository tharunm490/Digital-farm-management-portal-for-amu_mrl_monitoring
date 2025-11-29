import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './VetWithdrawalAlerts.css';

const VetWithdrawalAlerts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [farms, setFarms] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState('');
  const [withdrawalData, setWithdrawalData] = useState([]);
  const [upcomingSafeDates, setUpcomingSafeDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (user?.role !== 'veterinarian') {
      navigate('/');
      return;
    }
    fetchData();
  }, [user]);

  useEffect(() => {
    if (selectedFarm) {
      fetchFarmWithdrawals(selectedFarm);
    }
  }, [selectedFarm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch assigned farms with withdrawal data
      const farmsRes = await api.get('/vet-treatments/assigned-farms/withdrawals');
      const farmsData = farmsRes.data?.data || farmsRes.data || [];
      setFarms(Array.isArray(farmsData) ? farmsData : []);

      // Fetch upcoming safe dates
      const upcomingRes = await api.get('/vet-treatments/upcoming/safe-dates');
      const upcomingData = upcomingRes.data?.data || upcomingRes.data || [];
      setUpcomingSafeDates(Array.isArray(upcomingData) ? upcomingData : []);

      // Set first farm as default
      if (farmsRes.data && farmsRes.data.length > 0) {
        setSelectedFarm(farmsRes.data[0].farm_id);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load withdrawal data');
    } finally {
      setLoading(false);
    }
  };

  const fetchFarmWithdrawals = async (farmId) => {
    try {
      const response = await api.get(`/vet-treatments/farm/${farmId}/withdrawals`);
      const withdrawalData = response.data?.data || response.data || [];
      setWithdrawalData(Array.isArray(withdrawalData) ? withdrawalData : []);
    } catch (err) {
      console.error('Error fetching farm withdrawals:', err);
      setError('Failed to load farm data');
    }
  };

  const getStatusColor = (daysUntilSafe) => {
    if (!daysUntilSafe && daysUntilSafe !== 0) return 'gray';
    if (daysUntilSafe <= 0) return 'green';
    if (daysUntilSafe <= 3) return 'orange';
    return 'red';
  };

  const getStatusIcon = (daysUntilSafe) => {
    if (!daysUntilSafe && daysUntilSafe !== 0) return '❓';
    if (daysUntilSafe <= 0) return '✅';
    if (daysUntilSafe <= 3) return '⚠️';
    return '❌';
  };

  const getStatusText = (daysUntilSafe) => {
    if (!daysUntilSafe && daysUntilSafe !== 0) return 'No Treatment';
    if (daysUntilSafe <= 0) return 'Safe for Sale';
    if (daysUntilSafe <= 3) return 'Upcoming';
    return 'Under Withdrawal';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const filteredWithdrawals = withdrawalData.filter(record => {
    if (filter === 'safe') return record.days_until_safe <= 0;
    if (filter === 'upcoming') return record.days_until_safe > 0 && record.days_until_safe <= 7;
    if (filter === 'unsafe') return record.days_until_safe > 7;
    return true;
  });

  const stats = {
    total_animals: withdrawalData.filter(r => r.entity_id).length,
    safe: withdrawalData.filter(r => r.days_until_safe <= 0).length,
    upcoming: withdrawalData.filter(r => r.days_until_safe > 0 && r.days_until_safe <= 7).length,
    unsafe: withdrawalData.filter(r => r.days_until_safe > 7).length,
    treated: withdrawalData.filter(r => r.amu_id).length
  };

  if (loading) {
    return (
      <div className="vet-withdrawal-alerts">
        <div className="loading">Loading withdrawal data...</div>
      </div>
    );
  }

  return (
    <div className="vet-withdrawal-alerts">
      <div className="vwa-header">
        <h1>⏰ Withdrawal Period Monitoring</h1>
        <p>Track safe-to-harvest dates for animals on your assigned farms</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="vwa-content">
        {/* Summary Cards */}
        <div className="summary-section">
          <div className="summary-card">
            <div className="card-icon">🐄</div>
            <div className="card-content">
              <h3>{stats.total_animals}</h3>
              <p>Total Animals</p>
            </div>
          </div>

          <div className="summary-card success">
            <div className="card-icon">✅</div>
            <div className="card-content">
              <h3>{stats.safe}</h3>
              <p>Safe for Sale</p>
            </div>
          </div>

          <div className="summary-card warning">
            <div className="card-icon">⚠️</div>
            <div className="card-content">
              <h3>{stats.upcoming}</h3>
              <p>Upcoming (7 days)</p>
            </div>
          </div>

          <div className="summary-card danger">
            <div className="card-icon">❌</div>
            <div className="card-content">
              <h3>{stats.unsafe}</h3>
              <p>Under Withdrawal</p>
            </div>
          </div>

          <div className="summary-card info">
            <div className="card-icon">💊</div>
            <div className="card-content">
              <h3>{stats.treated}</h3>
              <p>Treated Animals</p>
            </div>
          </div>
        </div>

        {/* Farm Selection */}
        {farms.length > 0 && (
          <div className="farm-selector">
            <label>📍 Select Farm:</label>
            <select value={selectedFarm} onChange={(e) => setSelectedFarm(e.target.value)}>
              <option value="">All Farms</option>
              {farms.map(farm => (
                <option key={farm.farm_id} value={farm.farm_id}>
                  {farm.farm_name} ({farm.animal_count} animals, {farm.active_withdrawals} active)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Filter Options */}
        <div className="filter-section">
          <label>Filter:</label>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-btn safe ${filter === 'safe' ? 'active' : ''}`}
              onClick={() => setFilter('safe')}
            >
              ✅ Safe ({stats.safe})
            </button>
            <button
              className={`filter-btn upcoming ${filter === 'upcoming' ? 'active' : ''}`}
              onClick={() => setFilter('upcoming')}
            >
              ⚠️ Upcoming ({stats.upcoming})
            </button>
            <button
              className={`filter-btn unsafe ${filter === 'unsafe' ? 'active' : ''}`}
              onClick={() => setFilter('unsafe')}
            >
              ❌ Unsafe ({stats.unsafe})
            </button>
          </div>
        </div>

        {/* Withdrawals Table/Cards */}
        <div className="withdrawals-container">
          {filteredWithdrawals.length === 0 ? (
            <div className="no-data">
              {selectedFarm ? 'No withdrawal records for selected farm' : 'Select a farm to view withdrawal data'}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="withdrawals-table-wrapper">
                <table className="withdrawals-table">
                  <thead>
                    <tr>
                      <th>Animal ID</th>
                      <th>Species</th>
                      <th>Medicine</th>
                      <th>Dosage</th>
                      <th>Applied</th>
                      <th>Withdrawal (days)</th>
                      <th>Safe Date</th>
                      <th>Days Until Safe</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWithdrawals.map((record, idx) => (
                      <tr key={idx} className={`row-${getStatusColor(record.days_until_safe)}`}>
                        <td className="bold">{record.tag_id || record.batch_name}</td>
                        <td>{record.species}</td>
                        <td>{record.medicine || 'N/A'}</td>
                        <td>{record.dosage ? `${record.dosage} ${record.dose_unit}` : 'N/A'}</td>
                        <td>{formatDate(record.application_date)}</td>
                        <td className="center">{record.withdrawal_period_days || '-'}</td>
                        <td className="bold">{formatDate(record.safe_date)}</td>
                        <td className={`center status-${getStatusColor(record.days_until_safe)}`}>
                          {record.days_until_safe === null || record.days_until_safe === undefined
                            ? 'N/A'
                            : record.days_until_safe}
                        </td>
                        <td className="center">
                          <span className={`status-badge status-${getStatusColor(record.days_until_safe)}`}>
                            {getStatusIcon(record.days_until_safe)} {getStatusText(record.days_until_safe)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="withdrawals-cards">
                {filteredWithdrawals.map((record, idx) => (
                  <div key={idx} className={`withdrawal-card card-${getStatusColor(record.days_until_safe)}`}>
                    <div className="card-header">
                      <h3>{record.tag_id || record.batch_name}</h3>
                      <span className={`status-badge status-${getStatusColor(record.days_until_safe)}`}>
                        {getStatusIcon(record.days_until_safe)} {getStatusText(record.days_until_safe)}
                      </span>
                    </div>
                    <div className="card-body">
                      <p><strong>Species:</strong> {record.species}</p>
                      <p><strong>Medicine:</strong> {record.medicine || 'N/A'}</p>
                      <p><strong>Dosage:</strong> {record.dosage ? `${record.dosage} ${record.dose_unit}` : 'N/A'}</p>
                      <p><strong>Applied:</strong> {formatDate(record.application_date)}</p>
                      <p><strong>Withdrawal Period:</strong> {record.withdrawal_period_days || '-'} days</p>
                      <p><strong>Safe Date:</strong> {formatDate(record.safe_date)}</p>
                      <p><strong>Days Until Safe:</strong> {record.days_until_safe === null || record.days_until_safe === undefined ? 'N/A' : record.days_until_safe}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Upcoming Safe Dates Section */}
        {upcomingSafeDates.length > 0 && (
          <div className="upcoming-section">
            <h2>📅 Upcoming Safe Dates (Next 7 Days)</h2>
            <div className="upcoming-list">
              {upcomingSafeDates.map((item, idx) => (
                <div key={idx} className="upcoming-card">
                  <div className="upcoming-header">
                    <h4>{item.farm_name}</h4>
                    <span className="days-badge">{item.days_until_safe} days</span>
                  </div>
                  <p><strong>Animal:</strong> {item.tag_id || item.batch_name} ({item.species})</p>
                  <p><strong>Medicine:</strong> {item.medicine}</p>
                  <p><strong>Safe Date:</strong> {formatDate(item.safe_date)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VetWithdrawalAlerts;
