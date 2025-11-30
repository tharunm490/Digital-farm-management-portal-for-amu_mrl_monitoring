import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './AuthorityDashboard.css';

const AuthorityDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalFarms: 0,
    totalTreatments: 0,
    totalAntibiotics: 0,
    unsafeMRLCases: 0,
    highRiskFarms: 0,
    activeVets: 0,
    stateDistribution: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch all required statistics
      const [farmsRes, treatmentsRes, amuRes, alertsRes, vetsRes] = await Promise.all([
        api.get('/authority/stats/farms'),
        api.get('/authority/stats/treatments'),
        api.get('/authority/stats/amu'),
        api.get('/authority/stats/alerts'),
        api.get('/authority/stats/veterinarians')
      ]);

      setStats({
        totalFarms: farmsRes.data.totalFarms || 0,
        totalTreatments: treatmentsRes.data.totalTreatments || 0,
        totalAntibiotics: amuRes.data.totalAntibiotics || 0,
        unsafeMRLCases: alertsRes.data.unsafeMRLCases || 0,
        highRiskFarms: alertsRes.data.highRiskFarms || 0,
        activeVets: vetsRes.data.activeVets || 0,
        stateDistribution: farmsRes.data.stateDistribution || {}
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <div className={`stat-card ${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <h3 className="stat-value">{loading ? '...' : value.toLocaleString()}</h3>
        <p className="stat-title">{title}</p>
        {subtitle && <p className="stat-subtitle">{subtitle}</p>}
      </div>
    </div>
  );

  const getTopStates = () => {
    return Object.entries(stats.stateDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  };

  if (loading) {
    return (
      <div className="authority-dashboard">
        <div className="dashboard-header">
          <h1>🏛️ Authority Dashboard</h1>
          <p>National Overview of Antimicrobial Usage & Monitoring</p>
        </div>
        <div className="loading-spinner">Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div className="authority-dashboard">
      <div className="dashboard-header">
        <h1>🏛️ Authority Dashboard</h1>
        <p>National Overview of Antimicrobial Usage & Monitoring</p>
      </div>

      <div className="dashboard-content">
        {/* Stats Flash Cards */}
        <div className="stats-flash-grid">
          <div className="stat-flash-card">
            <div className="stat-flash-header">
              <div className="stat-icon">🏡</div>
              <h3>Registered Farms</h3>
            </div>
            <div className="stat-flash-content">
              <div className="stat-main-value">{stats.totalFarms.toLocaleString()}</div>
              <div className="stat-subtitle">Across India</div>
              <div className="stat-trend">📈 Growing network</div>
            </div>
          </div>

          <div className="stat-flash-card">
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

          <div className="stat-flash-card">
            <div className="stat-flash-header">
              <div className="stat-icon">🧪</div>
              <h3>Antibiotics Used</h3>
            </div>
            <div className="stat-flash-content">
              <div className="stat-main-value">{stats.totalAntibiotics.toLocaleString()}</div>
              <div className="stat-subtitle">Kg this month</div>
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
              <div className="stat-trend">🚨 Critical issues</div>
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
              <div className="stat-trend">⚡ Priority monitoring</div>
            </div>
          </div>

          <div className="stat-flash-card">
            <div className="stat-flash-header">
              <div className="stat-icon">👨‍⚕️</div>
              <h3>Active Veterinarians</h3>
            </div>
            <div className="stat-flash-content">
              <div className="stat-main-value">{stats.activeVets.toLocaleString()}</div>
              <div className="stat-subtitle">Registered vets</div>
              <div className="stat-trend">🏥 Healthcare network</div>
            </div>
          </div>
        </div>

        {/* Dashboard Sections Flash Cards */}
        <div className="dashboard-sections-flash">
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
                      <div className="state-bar">
                        <div
                          className="state-bar-fill"
                          style={{
                            width: `${(count / Math.max(...Object.values(stats.stateDistribution))) * 100}%`
                          }}
                        ></div>
                      </div>
                      <span className="state-count">{count}</span>
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

          <div className="section-flash-card">
            <div className="section-flash-header">
              <div className="section-icon">🚨</div>
              <h3>Recent Alerts & Compliance Issues</h3>
            </div>
            <div className="section-flash-content">
              <div className="alerts-preview">
                <div className="alert-flash-item">
                  <span className="alert-flash-icon">⚠️</span>
                  <div className="alert-flash-content">
                    <p className="alert-flash-title">Unsafe MRL Violations</p>
                    <p className="alert-flash-count">{stats.unsafeMRLCases} active cases</p>
                  </div>
                </div>
                <div className="alert-flash-item">
                  <span className="alert-flash-icon">💊</span>
                  <div className="alert-flash-content">
                    <p className="alert-flash-title">High Dosage Alerts</p>
                    <p className="alert-flash-count">Monitor closely</p>
                  </div>
                </div>
                <div className="alert-flash-item">
                  <span className="alert-flash-icon">📊</span>
                  <div className="alert-flash-content">
                    <p className="alert-flash-title">Overdosage Events</p>
                    <p className="alert-flash-count">Track patterns</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="section-flash-card">
            <div className="section-flash-header">
              <div className="section-icon">📈</div>
              <h3>Quick Actions</h3>
            </div>
            <div className="section-flash-content">
              <div className="quick-actions-flash">
                <button className="action-flash-btn primary" onClick={() => window.location.href = '/authority/amu-analytics'}>
                  <span className="btn-icon">📊</span>
                  <span className="btn-text">View AMU Analytics</span>
                </button>
                <button className="action-flash-btn secondary" onClick={() => window.location.href = '/authority/map-view'}>
                  <span className="btn-icon">🗺️</span>
                  <span className="btn-text">Maps & Heatmaps</span>
                </button>
                <button className="action-flash-btn warning" onClick={() => window.location.href = '/authority/complaints'}>
                  <span className="btn-icon">🚨</span>
                  <span className="btn-text">Review Alerts</span>
                </button>
                <button className="action-flash-btn info" onClick={() => window.location.href = '/authority/reports'}>
                  <span className="btn-icon">📋</span>
                  <span className="btn-text">Generate Reports</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthorityDashboard;