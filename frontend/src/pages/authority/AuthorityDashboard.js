import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './AuthorityDashboard.css';

const AuthorityDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalFarms: 0,
    totalTreatments: 0,
    totalAntibiotics: 0,
    unsafeMRLCases: 0,
    highRiskFarms: 0,
    activeVets: 0,
    stateDistribution: {},
    feedHighRiskFarmers: 0,
    feedAvgAmuRisk: 0
  });
  const [analytics, setAnalytics] = useState({
    topMedicines: [],
    riskDistribution: { safe: 0, borderline: 0, unsafe: 0 },
    overdosageEvents: 0,
    monthlyTrends: []
  });
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFarmsList, setShowFarmsList] = useState(false);
  const [showVetsList, setShowVetsList] = useState(false);
  const [farmsList, setFarmsList] = useState([]);
  const [vetsList, setVetsList] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      console.log('🔄 Fetching dashboard data...');
      
      // Fetch all required statistics
      const [farmsRes, treatmentsRes, amuRes, alertsRes, vetsRes, analyticsRes, complaintsRes, feedStatsRes] = await Promise.all([
        api.get('/authority/stats/farms'),
        api.get('/authority/stats/treatments'),
        api.get('/authority/stats/amu'),
        api.get('/authority/stats/alerts'),
        api.get('/authority/stats/veterinarians'),
        api.get('/authority/amu-analytics?period=30'),
        api.get('/authority/complaints?limit=5'),
        api.get('/feed/authority/feed-risk-stats').catch(() => ({ data: { overall: { high_risk_count: 0, very_high_risk_count: 0, avg_amu_risk: 0 } } }))
      ]);

      console.log('✅ Dashboard data received:', {
        farms: farmsRes.data,
        treatments: treatmentsRes.data,
        amu: amuRes.data,
        alerts: alertsRes.data,
        vets: vetsRes.data,
        analytics: analyticsRes.data,
        complaints: complaintsRes.data
      });

      setStats({
        totalFarms: farmsRes.data.totalFarms || 0,
        totalTreatments: treatmentsRes.data.totalTreatments || 0,
        totalAntibiotics: amuRes.data.totalAntibiotics || 0,
        unsafeMRLCases: alertsRes.data.unsafeMRLCases || 0,
        highRiskFarms: alertsRes.data.highRiskFarms || 0,
        activeVets: vetsRes.data.activeVets || 0,
        stateDistribution: farmsRes.data.stateDistribution || {},
        feedHighRiskFarmers: (feedStatsRes.data.overall?.high_risk_count || 0) + (feedStatsRes.data.overall?.very_high_risk_count || 0),
        feedAvgAmuRisk: feedStatsRes.data.overall?.avg_amu_risk || 0
      });

      setAnalytics({
        topMedicines: analyticsRes.data.topMedicines || [],
        riskDistribution: analyticsRes.data.riskDistribution || { safe: 0, borderline: 0, unsafe: 0 },
        overdosageEvents: analyticsRes.data.overdosageEvents || 0,
        monthlyTrends: analyticsRes.data.monthlyTrends || []
      });

      setRecentAlerts(complaintsRes.data || []);
      console.log('✅ Dashboard state updated successfully');
    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
      console.error('Error details:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const getTopStates = () => {
    return Object.entries(stats.stateDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  };

  const fetchFarmsList = async () => {
    setLoadingDetails(true);
    try {
      const response = await api.get('/authority/farms-list');
      setFarmsList(response.data);
      setShowFarmsList(true);
    } catch (error) {
      console.error('Error fetching farms list:', error);
      alert('Failed to load farms list');
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchVetsList = async () => {
    setLoadingDetails(true);
    try {
      const response = await api.get('/authority/vets-list');
      setVetsList(response.data);
      setShowVetsList(true);
    } catch (error) {
      console.error('Error fetching vets list:', error);
      alert('Failed to load veterinarians list');
    } finally {
      setLoadingDetails(false);
    }
  };

  if (loading) {
    return (
      <div className="authority-dashboard">
        <div className="dashboard-header">
          <h1>🏛️ Authority Dashboard</h1>
          <p>National Overview of Antimicrobial Usage & Monitoring</p>
        </div>
        <div className="loading-spinner">
          <div className="spinner-icon">⏳</div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="authority-dashboard">
      <div className="dashboard-header">
        <h1>🏛️ Authority Dashboard</h1>
        <p>National Overview of Antimicrobial Usage & Monitoring</p>
        <div className="header-actions">
          <button className="profile-btn" onClick={() => navigate('/authority/profile')}>
            👤 Profile
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Stats Flash Cards - Key Metrics */}
        <div className="stats-flash-grid">
          <div className="stat-flash-card primary clickable" onClick={fetchFarmsList} style={{ cursor: 'pointer' }}>
            <div className="stat-flash-header">
              <div className="stat-icon">🏡</div>
              <h3>Registered Farms</h3>
            </div>
            <div className="stat-flash-content">
              <div className="stat-main-value">{stats.totalFarms.toLocaleString()}</div>
              <div className="stat-subtitle">Across India</div>
              <div className="stat-trend positive">📈 Growing network</div>
            </div>
            <div className="card-action-hint">Click to view details →</div>
          </div>

          <div className="stat-flash-card info">
            <div className="stat-flash-header">
              <div className="stat-icon">💊</div>
              <h3>Total Treatments</h3>
            </div>
            <div className="stat-flash-content">
              <div className="stat-main-value">{stats.totalTreatments.toLocaleString()}</div>
              <div className="stat-subtitle">This month</div>
              <div className="stat-trend">📊 Active monitoring</div>
            </div>
          </div>

          <div className="stat-flash-card success">
            <div className="stat-flash-header">
              <div className="stat-icon">🧪</div>
              <h3>Antibiotics Used</h3>
            </div>
            <div className="stat-flash-content">
              <div className="stat-main-value">{stats.totalAntibiotics.toLocaleString()}</div>
              <div className="stat-subtitle">Unique medicines</div>
              <div className="stat-trend">⚖️ Usage tracking</div>
            </div>
          </div>

          <div className="stat-flash-card alert">
            <div className="stat-flash-header">
              <div className="stat-icon">⚠️</div>
              <h3>Unsafe MRL Cases</h3>
            </div>
            <div className="stat-flash-content">
              <div className="stat-main-value">{stats.unsafeMRLCases.toLocaleString()}</div>
              <div className="stat-subtitle">Require attention</div>
              <div className="stat-trend negative">🚨 Critical issues</div>
            </div>
          </div>

          <div className="stat-flash-card warning">
            <div className="stat-flash-header">
              <div className="stat-icon">🚨</div>
              <h3>High Risk Farms</h3>
            </div>
            <div className="stat-flash-content">
              <div className="stat-main-value">{stats.highRiskFarms.toLocaleString()}</div>
              <div className="stat-subtitle">Over threshold</div>
              <div className="stat-trend negative">⚡ Priority monitoring</div>
            </div>
          </div>

          <div className="stat-flash-card primary clickable" onClick={fetchVetsList} style={{ cursor: 'pointer' }}>
            <div className="stat-flash-header">
              <div className="stat-icon">👨‍⚕️</div>
              <h3>Active Veterinarians</h3>
            </div>
            <div className="stat-flash-content">
              <div className="stat-main-value">{stats.activeVets.toLocaleString()}</div>
              <div className="stat-subtitle">Registered vets</div>
              <div className="stat-trend positive">🏥 Healthcare network</div>
            </div>
            <div className="card-action-hint">Click to view details →</div>
          </div>

          <div className="stat-flash-card warning clickable" onClick={() => navigate('/authority/feed-nutrition-analytics')} style={{ cursor: 'pointer' }}>
            <div className="stat-flash-header">
              <div className="stat-icon">🌾</div>
              <h3>Feed-Nutrition Risk</h3>
            </div>
            <div className="stat-flash-content">
              <div className="stat-main-value">{stats.feedHighRiskFarmers.toLocaleString()}</div>
              <div className="stat-subtitle">High-risk farmers</div>
              <div className="stat-trend">📊 Avg Risk: {(stats.feedAvgAmuRisk * 100).toFixed(1)}%</div>
            </div>
            <div className="card-action-hint">Click to view analytics →</div>
          </div>

          <div className="stat-flash-card success clickable" onClick={() => navigate('/authority/biomass-analytics')} style={{ cursor: 'pointer' }}>
            <div className="stat-flash-header">
              <div className="stat-icon">⚖️</div>
              <h3>Biomass-Based AMU</h3>
            </div>
            <div className="stat-flash-content">
              <div className="stat-main-value">View</div>
              <div className="stat-subtitle">Species-wise usage</div>
              <div className="stat-trend">📈 Track AMU by biomass</div>
            </div>
            <div className="card-action-hint">Click to view analytics →</div>
          </div>
        </div>

        {/* Two-Column Layout for Distribution and Alerts */}
        <div className="dashboard-sections-flash">
          {/* State Distribution Card */}
          <div className="section-flash-card">
            <div className="section-flash-header">
              <div className="section-icon">📍</div>
              <h3>State-wise Farm Distribution</h3>
            </div>
            <div className="section-flash-content">
              {getTopStates().length > 0 ? (
                <div className="state-distribution">
                  {getTopStates().map(([state, count]) => (
                    <div key={state} className="state-item">
                      <span className="state-name">{state}</span>
                      <div className="state-bar-container">
                        <div
                          className="state-bar-fill"
                          style={{
                            width: `${(count / Math.max(...Object.values(stats.stateDistribution))) * 100}%`
                          }}
                        ></div>
                      </div>
                      <span className="state-count">{count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-data-flash">
                  <div className="no-data-icon">📊</div>
                  <p>No farm distribution data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Alerts Card */}
          <div className="section-flash-card">
            <div className="section-flash-header">
              <div className="section-icon">🚨</div>
              <h3>Recent Alerts & Compliance Issues</h3>
            </div>
            <div className="section-flash-content">
              <div className="alerts-preview">
                <div className="alert-flash-item critical">
                  <span className="alert-flash-icon">⚠️</span>
                  <div className="alert-flash-content">
                    <p className="alert-flash-title">Unsafe MRL Violations</p>
                    <p className="alert-flash-count">{stats.unsafeMRLCases.toLocaleString()} active cases</p>
                  </div>
                  <button 
                    className="alert-action-btn"
                    onClick={() => navigate('/authority/alerts')}
                  >
                    View →
                  </button>
                </div>
                <div className="alert-flash-item warning">
                  <span className="alert-flash-icon">💊</span>
                  <div className="alert-flash-content">
                    <p className="alert-flash-title">High Dosage Alerts</p>
                    <p className="alert-flash-count">{analytics.overdosageEvents.toLocaleString()} this month</p>
                  </div>
                  <button 
                    className="alert-action-btn"
                    onClick={() => navigate('/authority/alerts')}
                  >
                    View →
                  </button>
                </div>
                {recentAlerts.length > 0 && (
                  <div className="alert-flash-item info">
                    <span className="alert-flash-icon">📊</span>
                    <div className="alert-flash-content">
                      <p className="alert-flash-title">Recent Notifications</p>
                      <p className="alert-flash-count">{recentAlerts.length} new alerts</p>
                    </div>
                    <button 
                      className="alert-action-btn"
                      onClick={() => navigate('/authority/alerts')}
                    >
                      View →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Top Medicines & Risk Distribution Cards */}
        <div className="dashboard-sections-flash">
          <div className="section-flash-card">
            <div className="section-flash-header">
              <div className="section-icon">💊</div>
              <h3>Top 5 Medicines This Month</h3>
            </div>
            <div className="section-flash-content">
              {analytics.topMedicines.length > 0 ? (
                <div className="medicines-list">
                  {analytics.topMedicines.slice(0, 5).map((medicine, idx) => (
                    <div key={idx} className="medicine-item">
                      <div className="medicine-rank">{idx + 1}</div>
                      <div className="medicine-info">
                        <span className="medicine-name">{medicine.medicine}</span>
                        <div className="medicine-bar">
                          <div
                            className="medicine-bar-fill"
                            style={{
                              width: `${(medicine.usage_count / analytics.topMedicines[0].usage_count) * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>
                      <span className="medicine-count">{medicine.usage_count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-data-flash">
                  <div className="no-data-icon">💊</div>
                  <p>No medicine usage data available</p>
                </div>
              )}
            </div>
          </div>

          <div className="section-flash-card">
            <div className="section-flash-header">
              <div className="section-icon">📊</div>
              <h3>Risk Category Distribution</h3>
            </div>
            <div className="section-flash-content">
              <div className="risk-distribution">
                <div className="risk-item safe">
                  <div className="risk-badge">✅</div>
                  <div className="risk-info">
                    <span className="risk-label">Safe</span>
                    <span className="risk-value">{analytics.riskDistribution.safe.toLocaleString()}</span>
                  </div>
                </div>
                <div className="risk-item borderline">
                  <div className="risk-badge">⚠️</div>
                  <div className="risk-info">
                    <span className="risk-label">Borderline</span>
                    <span className="risk-value">{analytics.riskDistribution.borderline.toLocaleString()}</span>
                  </div>
                </div>
                <div className="risk-item unsafe">
                  <div className="risk-badge">🚨</div>
                  <div className="risk-info">
                    <span className="risk-label">Unsafe</span>
                    <span className="risk-value">{analytics.riskDistribution.unsafe.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="section-flash-card full-width">
          <div className="section-flash-header">
            <div className="section-icon">📈</div>
            <h3>Quick Actions</h3>
          </div>
          <div className="section-flash-content">
            <div className="quick-actions-flash">
              <button 
                className="action-flash-btn primary" 
                onClick={() => navigate('/authority/dashboard')}
              >
                <span className="btn-icon">📊</span>
                <span className="btn-text">Analytics Dashboard</span>
              </button>
              <button 
                className="action-flash-btn secondary" 
                onClick={() => navigate('/authority/analytics')}
              >
                <span className="btn-icon">🧬</span>
                <span className="btn-text">Disease Intelligence</span>
              </button>
              <button 
                className="action-flash-btn info" 
                onClick={() => navigate('/authority/map-view')}
              >
                <span className="btn-icon">🗺️</span>
                <span className="btn-text">Maps & Heatmaps</span>
              </button>
              <button 
                className="action-flash-btn warning" 
                onClick={() => navigate('/authority/alerts')}
              >
                <span className="btn-icon">🚨</span>
                <span className="btn-text">Review Alerts</span>
              </button>
              <button 
                className="action-flash-btn success" 
                onClick={() => navigate('/authority/loan-applications')}
              >
                <span className="btn-icon">💼</span>
                <span className="btn-text">Loan Applications</span>
              </button>
              <button 
                className="action-flash-btn primary" 
                onClick={() => navigate('/authority/treatment-reports')}
              >
                <span className="btn-icon">📄</span>
                <span className="btn-text">Treatment Reports</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Farms List Modal */}
      {showFarmsList && (
        <div className="modal-overlay" onClick={() => setShowFarmsList(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🏡 Registered Farms</h2>
              <button className="modal-close" onClick={() => setShowFarmsList(false)}>×</button>
            </div>
            <div className="modal-body">
              {loadingDetails ? (
                <div className="loading-spinner">Loading...</div>
              ) : farmsList.length > 0 ? (
                <div className="farms-list">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Farm Name</th>
                        <th>Farmer</th>
                        <th>Location</th>
                        <th>Contact</th>
                        <th>Animals</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {farmsList.map((farm, idx) => (
                        <tr key={idx}>
                          <td><strong>{farm.farm_name}</strong></td>
                          <td>{farm.farmer_name}</td>
                          <td>{farm.taluk}, {farm.district}, {farm.state}</td>
                          <td>{farm.phone || 'N/A'}</td>
                          <td>{farm.animal_count || 0}</td>
                          <td>
                            <span className={`status-badge ${farm.risk_level || 'safe'}`}>
                              {farm.risk_level === 'unsafe' ? '🚨 High Risk' : 
                               farm.risk_level === 'borderline' ? '⚠️ Moderate' : 
                               '✅ Safe'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="no-data">No farms registered yet</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vets List Modal */}
      {showVetsList && (
        <div className="modal-overlay" onClick={() => setShowVetsList(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>👨‍⚕️ Registered Veterinarians</h2>
              <button className="modal-close" onClick={() => setShowVetsList(false)}>×</button>
            </div>
            <div className="modal-body">
              {loadingDetails ? (
                <div className="loading-spinner">Loading...</div>
              ) : vetsList.length > 0 ? (
                <div className="vets-list">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>License Number</th>
                        <th>Location</th>
                        <th>Contact</th>
                        <th>Assigned Farms</th>
                        <th>Treatments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vetsList.map((vet, idx) => (
                        <tr key={idx}>
                          <td><strong>Dr. {vet.vet_name}</strong></td>
                          <td>{vet.license_number}</td>
                          <td>{vet.district}, {vet.state}</td>
                          <td>{vet.phone || 'N/A'}</td>
                          <td>{vet.assigned_farms || 0}</td>
                          <td>{vet.total_treatments || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="no-data">No veterinarians registered yet</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthorityDashboard;