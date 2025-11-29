import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './AuthorityAMUAnalytics.css';

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
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // days
  const [selectedMetric, setSelectedMetric] = useState('usage');

  useEffect(() => {
    fetchAMUAnalytics();
  }, [timeRange]);

  const fetchAMUAnalytics = async () => {
    try {
      const response = await api.get(`/authority/amu-analytics?days=${timeRange}`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching AMU analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderEnhancedBarChart = (data, title, color, icon) => {
    if (!data || data.length === 0) {
      return (
        <div className="no-data-container">
          <div className="no-data-icon">📊</div>
          <p className="no-data-text">No data available for {title.toLowerCase()}</p>
        </div>
      );
    }

    const maxValue = Math.max(...data.map(item => item.value || item.count || 0));

    return (
      <div className="chart-container">
        <div className="chart-header">
          <div className="chart-title">
            <span className="chart-icon">{icon}</span>
            <h3>{title}</h3>
          </div>
          <div className="chart-stats">
            <span className="stat-number">{data.length}</span>
            <span className="stat-label">categories</span>
          </div>
        </div>
        <div className="bar-chart">
          {data.slice(0, 8).map((item, index) => {
            const value = item.value || item.count || 0;
            const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
            const label = item.name || item.species || item.medicine || `Item ${index + 1}`;

            return (
              <div key={index} className="bar-item">
                <div className="bar-info">
                  <span className="bar-rank">#{index + 1}</span>
                  <span className="bar-label">{label}</span>
                  <span className="bar-value">{value.toLocaleString()}</span>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${percentage}%`,
                      background: `linear-gradient(90deg, ${color}, ${color}dd)`
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderRiskDistribution = () => {
    const { riskDistribution } = analytics;
    const total = riskDistribution.safe + riskDistribution.borderline + riskDistribution.unsafe;

    if (total === 0) {
      return (
        <div className="no-data-container">
          <div className="no-data-icon">⚠️</div>
          <p className="no-data-text">No risk assessment data available</p>
        </div>
      );
    }

    const safePercent = (riskDistribution.safe / total) * 100;
    const borderlinePercent = (riskDistribution.borderline / total) * 100;
    const unsafePercent = (riskDistribution.unsafe / total) * 100;

    return (
      <div className="risk-distribution">
        <div className="risk-header">
          <h3>Risk Category Distribution</h3>
          <div className="total-cases">
            <span className="total-number">{total.toLocaleString()}</span>
            <span className="total-label">total cases</span>
          </div>
        </div>
        <div className="risk-chart">
          <div className="risk-item safe">
            <div className="risk-info">
              <div className="risk-label">
                <span className="risk-color"></span>
                <span>Safe</span>
              </div>
              <div className="risk-stats">
                <span className="risk-count">{riskDistribution.safe.toLocaleString()}</span>
                <span className="risk-percentage">({safePercent.toFixed(1)}%)</span>
              </div>
            </div>
            <div className="risk-bar">
              <div
                className="risk-fill safe-fill"
                style={{ width: `${safePercent}%` }}
              ></div>
            </div>
          </div>

          <div className="risk-item borderline">
            <div className="risk-info">
              <div className="risk-label">
                <span className="risk-color"></span>
                <span>Borderline</span>
              </div>
              <div className="risk-stats">
                <span className="risk-count">{riskDistribution.borderline.toLocaleString()}</span>
                <span className="risk-percentage">({borderlinePercent.toFixed(1)}%)</span>
              </div>
            </div>
            <div className="risk-bar">
              <div
                className="risk-fill borderline-fill"
                style={{ width: `${borderlinePercent}%` }}
              ></div>
            </div>
          </div>

          <div className="risk-item unsafe">
            <div className="risk-info">
              <div className="risk-label">
                <span className="risk-color"></span>
                <span>Unsafe</span>
              </div>
              <div className="risk-stats">
                <span className="risk-count">{riskDistribution.unsafe.toLocaleString()}</span>
                <span className="risk-percentage">({unsafePercent.toFixed(1)}%)</span>
              </div>
            </div>
            <div className="risk-bar">
              <div
                className="risk-fill unsafe-fill"
                style={{ width: `${unsafePercent}%` }}
              ></div>
            </div>
          </div>
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
        <div className="header-content">
          <div className="header-icon">📊</div>
          <div className="header-text">
            <h1>AMU Analytics Dashboard</h1>
            <p>Comprehensive antimicrobial usage insights and monitoring</p>
          </div>
        </div>

        <div className="header-controls">
          <div className="time-range-selector">
            <label htmlFor="timeRange">Time Period:</label>
            <select
              id="timeRange"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="30">Last 30 Days</option>
              <option value="60">Last 60 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="180">Last 6 Months</option>
            </select>
          </div>
          <div className="metric-selector">
            <label htmlFor="metric">View:</label>
            <select
              id="metric"
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
            >
              <option value="usage">Usage Analytics</option>
              <option value="trends">Trend Analysis</option>
              <option value="risk">Risk Assessment</option>
            </select>
          </div>
        </div>
      </div>

      <div className="analytics-content">
        {selectedMetric === 'usage' && (
          <div className="analytics-grid">
            <div className="analytics-card">
              <div className="card-content">
                {renderEnhancedBarChart(analytics.antibioticUsageBySpecies, 'Antibiotic Usage by Species', '#3b82f6', '🐄')}
              </div>
            </div>

            <div className="analytics-card">
              <div className="card-content">
                {renderEnhancedBarChart(analytics.topMedicines, 'Top Medicines Used', '#8b5cf6', '💊')}
              </div>
            </div>

            <div className="analytics-card full-width">
              <div className="card-content">
                {renderTrendChart()}
              </div>
            </div>
          </div>
        )}

        {selectedMetric === 'trends' && (
          <div className="analytics-grid">
            <div className="analytics-card full-width">
              <div className="card-content">
                {renderTrendChart()}
              </div>
            </div>

            <div className="analytics-card">
              <div className="card-content">
                {renderEnhancedBarChart(analytics.treatmentTrends, 'Treatment Frequency', '#10b981', '📈')}
              </div>
            </div>

            <div className="analytics-card">
              <div className="card-content">
                <div className="summary-stats">
                  <h3>Treatment Summary</h3>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <span className="stat-value">{analytics.treatmentTrends.reduce((sum, item) => sum + (item.count || 0), 0)}</span>
                      <span className="stat-label">Total Treatments</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">{Math.round(analytics.treatmentTrends.reduce((sum, item) => sum + (item.count || 0), 0) / Math.max(analytics.treatmentTrends.length, 1))}</span>
                      <span className="stat-label">Avg per Period</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedMetric === 'risk' && (
          <div className="analytics-grid">
            <div className="analytics-card">
              <div className="card-content">
                {renderRiskDistribution()}
              </div>
            </div>

            <div className="analytics-card">
              <div className="card-content">
                <div className="overdosage-alert">
                  <div className="alert-header">
                    <div className="alert-icon">🚨</div>
                    <div className="alert-info">
                      <h3>Overdosage Events</h3>
                      <p className="alert-description">Critical incidents requiring immediate attention</p>
                    </div>
                  </div>
                  <div className="alert-metrics">
                    <div className="metric">
                      <span className="metric-value">{analytics.overdosageEvents.toLocaleString()}</span>
                      <span className="metric-label">events detected</span>
                    </div>
                    <div className="metric">
                      <span className="metric-value">{Math.round((analytics.overdosageEvents / Math.max(analytics.treatmentTrends.reduce((sum, item) => sum + (item.count || 0), 0), 1)) * 100)}%</span>
                      <span className="metric-label">of total treatments</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="analytics-card full-width">
              <div className="card-content">
                <div className="risk-insights">
                  <h3>Risk Assessment Insights</h3>
                  <div className="insights-grid">
                    <div className="insight-card">
                      <div className="insight-icon">🛡️</div>
                      <div className="insight-content">
                        <h4>Safety Score</h4>
                        <p>{Math.round((analytics.riskDistribution.safe / Math.max(analytics.riskDistribution.safe + analytics.riskDistribution.borderline + analytics.riskDistribution.unsafe, 1)) * 100)}% of cases are within safe limits</p>
                      </div>
                    </div>
                    <div className="insight-card">
                      <div className="insight-icon">⚠️</div>
                      <div className="insight-content">
                        <h4>Attention Required</h4>
                        <p>{analytics.riskDistribution.borderline + analytics.riskDistribution.unsafe} cases need monitoring or intervention</p>
                      </div>
                    </div>
                    <div className="insight-card">
                      <div className="insight-icon">📋</div>
                      <div className="insight-content">
                        <h4>Compliance Rate</h4>
                        <p>Based on current risk distribution and usage patterns</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthorityAMUAnalytics;