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

      <div className="stats-grid">
        <StatCard
          title="Registered Farms"
          value={stats.totalFarms}
          icon="🏡"
          color="blue"
          subtitle="Across India"
        />
        <StatCard
          title="Total Treatments"
          value={stats.totalTreatments}
          icon="💊"
          color="green"
          subtitle="This month"
        />
        <StatCard
          title="Antibiotics Used"
          value={stats.totalAntibiotics}
          icon="🧪"
          color="purple"
          subtitle="Kg this month"
        />
        <StatCard
          title="Unsafe MRL Cases"
          value={stats.unsafeMRLCases}
          icon="⚠️"
          color="red"
          subtitle="Require attention"
        />
        <StatCard
          title="High Risk Farms"
          value={stats.highRiskFarms}
          icon="🚨"
          color="orange"
          subtitle="Over threshold"
        />
        <StatCard
          title="Active Veterinarians"
          value={stats.activeVets}
          icon="👨‍⚕️"
          color="teal"
          subtitle="Registered vets"
        />
      </div>

      <div className="dashboard-sections">
        <div className="dashboard-section">
          <h2>📍 State-wise Farm Distribution</h2>
          <div className="state-distribution">
            {getTopStates().length > 0 ? (
              getTopStates().map(([state, count]) => (
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
              ))
            ) : (
              <p className="no-data">No farm distribution data available</p>
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <h2>🚨 Recent Alerts & Compliance Issues</h2>
          <div className="alerts-preview">
            <div className="alert-item">
              <span className="alert-icon">⚠️</span>
              <div className="alert-content">
                <p className="alert-title">Unsafe MRL Violations</p>
                <p className="alert-count">{stats.unsafeMRLCases} active cases</p>
              </div>
            </div>
            <div className="alert-item">
              <span className="alert-icon">💊</span>
              <div className="alert-content">
                <p className="alert-title">High Dosage Alerts</p>
                <p className="alert-count">Monitor closely</p>
              </div>
            </div>
            <div className="alert-item">
              <span className="alert-icon">📊</span>
              <div className="alert-content">
                <p className="alert-title">Overdosage Events</p>
                <p className="alert-count">Track patterns</p>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <h2>📈 Quick Actions</h2>
          <div className="quick-actions">
            <button className="action-btn primary" onClick={() => window.location.href = '/authority/amu-analytics'}>
              📊 View AMU Analytics
            </button>
            <button className="action-btn secondary" onClick={() => window.location.href = '/authority/heat-map'}>
              🌡️ Check Heat Map
            </button>
            <button className="action-btn warning" onClick={() => window.location.href = '/authority/complaints'}>
              🚨 Review Alerts
            </button>
            <button className="action-btn info" onClick={() => window.location.href = '/authority/reports'}>
              📋 Generate Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthorityDashboard;