import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './DiseaseIntelligenceHub.css';

const DiseaseIntelligenceHub = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('clusters');
  const [diseaseData, setDiseaseData] = useState({
    clusters: [],
    medications: [],
    rootCauses: [],
    withdrawalViolations: [],
    amrRisks: {},
    monthlyForecast: []
  });

  useEffect(() => {
    fetchDiseaseIntelligence();
  }, []);

  const fetchDiseaseIntelligence = async () => {
    try {
      const [clustersRes, medicationsRes, causesRes, violationsRes, amrRes, forecastRes] = await Promise.all([
        api.get('/authority/intelligence/disease-clusters'),
        api.get('/authority/intelligence/medication-usage'),
        api.get('/authority/intelligence/root-causes'),
        api.get('/authority/intelligence/withdrawal-violations'),
        api.get('/authority/intelligence/amr-risks'),
        api.get('/authority/intelligence/disease-forecast')
      ]);

      setDiseaseData({
        clusters: clustersRes.data || [],
        medications: medicationsRes.data || [],
        rootCauses: causesRes.data || [],
        withdrawalViolations: violationsRes.data || [],
        amrRisks: amrRes.data || {},
        monthlyForecast: forecastRes.data || []
      });
    } catch (error) {
      console.error('Error fetching disease intelligence:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderDiseaseClusters = () => (
    <div className="intelligence-section">
      <div className="section-header">
        <h3>🗺️ Disease Cluster Map</h3>
        <p>Geographic concentration of disease patterns by species and severity</p>
      </div>
      <div className="clusters-grid">
        {diseaseData.clusters.length > 0 ? (
          diseaseData.clusters.map((cluster, idx) => (
            <div key={idx} className={`cluster-card ${cluster.severity_level}`}>
              <div className="cluster-header">
                <div className="cluster-icon">
                  {cluster.severity_level === 'unsafe' ? '🚨' : 
                   cluster.severity_level === 'borderline' ? '⚠️' : '✅'}
                </div>
                <div className="cluster-info">
                  <h4>Cluster {idx + 1}</h4>
                  <span className="cluster-location">{cluster.district}, {cluster.state}</span>
                </div>
              </div>
              <div className="cluster-stats">
                <div className="stat-item">
                  <span className="stat-label">Farms Affected</span>
                  <span className="stat-value">{cluster.farm_count}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Species</span>
                  <span className="stat-value">{cluster.species}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Cases</span>
                  <span className="stat-value">{cluster.case_count}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Risk Level</span>
                  <span className={`risk-badge ${cluster.severity_level}`}>
                    {cluster.severity_level}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-data">
            <span className="no-data-icon">🗺️</span>
            <p>No disease clusters detected</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderMedicationUsage = () => (
    <div className="intelligence-section">
      <div className="section-header">
        <h3>💊 Medication Usage & Risk Insights</h3>
        <p>Most used medicines and risk assessment</p>
      </div>
      <div className="medications-container">
        {diseaseData.medications.length > 0 ? (
          <div className="medications-list">
            {diseaseData.medications.map((med, idx) => (
              <div key={idx} className={`medication-card ${med.risk_category}`}>
                <div className="medication-rank">{idx + 1}</div>
                <div className="medication-details">
                  <h4 className="medication-name">{med.medicine}</h4>
                  <div className="medication-meta">
                    <span className="meta-item">
                      <strong>Usage:</strong> {med.usage_count} times
                    </span>
                    <span className="meta-item">
                      <strong>Category:</strong> {med.category_type}
                    </span>
                    {med.risk_category && (
                      <span className={`risk-tag ${med.risk_category}`}>
                        {med.risk_category === 'unsafe' ? '🚨' : 
                         med.risk_category === 'borderline' ? '⚠️' : '✅'}
                        {med.risk_category}
                      </span>
                    )}
                  </div>
                  {med.avg_risk_percent != null && (
                    <div className="risk-bar-container">
                      <div className="risk-bar-label">
                        <span>Risk Level</span>
                        <span>{Number(med.avg_risk_percent).toFixed(1)}%</span>
                      </div>
                      <div className="risk-bar">
                        <div 
                          className={`risk-bar-fill ${med.risk_category}`}
                          style={{ width: `${Number(med.avg_risk_percent)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data">
            <span className="no-data-icon">💊</span>
            <p>No medication usage data available</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderRootCauses = () => (
    <div className="intelligence-section">
      <div className="section-header">
        <h3>🔬 Root Cause Analysis</h3>
        <p>Disease causes by district and species</p>
      </div>
      <div className="causes-grid">
        {diseaseData.rootCauses.length > 0 ? (
          diseaseData.rootCauses.map((cause, idx) => (
            <div key={idx} className="cause-card">
              <div className="cause-header">
                <div className="cause-icon">📊</div>
                <h4>{cause.cause || 'Unknown Cause'}</h4>
              </div>
              <div className="cause-breakdown">
                <div className="breakdown-item">
                  <span className="breakdown-label">Total Cases</span>
                  <span className="breakdown-value">{cause.case_count}</span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-label">Primary Species</span>
                  <span className="breakdown-value">{cause.primary_species}</span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-label">Top District</span>
                  <span className="breakdown-value">{cause.top_district}</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${(cause.case_count / diseaseData.rootCauses[0]?.case_count) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-data">
            <span className="no-data-icon">🔬</span>
            <p>No root cause data available</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderWithdrawalCompliance = () => (
    <div className="intelligence-section">
      <div className="section-header">
        <h3>⏱️ Withdrawal Compliance Monitor</h3>
        <p>Tracking withdrawal period violations by district</p>
      </div>
      <div className="compliance-container">
        {diseaseData.withdrawalViolations.length > 0 ? (
          <div className="violations-leaderboard">
            <div className="leaderboard-header">
              <span>Rank</span>
              <span>District</span>
              <span>Violations</span>
              <span>Status</span>
            </div>
            {diseaseData.withdrawalViolations.map((violation, idx) => (
              <div key={idx} className="leaderboard-row">
                <div className={`rank-badge ${idx < 3 ? 'top-rank' : ''}`}>
                  {idx + 1}
                </div>
                <div className="district-info">
                  <strong>{violation.district}</strong>
                  <span className="state-tag">{violation.state}</span>
                </div>
                <div className="violation-count">{violation.violation_count}</div>
                <div className={`status-badge ${violation.status}`}>
                  {violation.status === 'critical' ? '🚨 Critical' :
                   violation.status === 'warning' ? '⚠️ Warning' : '✅ Normal'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data">
            <span className="no-data-icon">⏱️</span>
            <p>No withdrawal violations recorded</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderAMRRisk = () => (
    <div className="intelligence-section">
      <div className="section-header">
        <h3>🧬 AMR Risk Radar</h3>
        <p>Antimicrobial Resistance risk factors assessment</p>
      </div>
      <div className="amr-container">
        {Object.keys(diseaseData.amrRisks).length > 0 ? (
          <div className="amr-grid">
            <div className="amr-card">
              <div className="amr-icon">⚠️</div>
              <div className="amr-content">
                <h4>Average Risk Percentage</h4>
                <div className="amr-value">{diseaseData.amrRisks.avg_risk_percent != null ? Number(diseaseData.amrRisks.avg_risk_percent).toFixed(1) : 0}%</div>
              </div>
            </div>
            <div className="amr-card">
              <div className="amr-icon">💉</div>
              <div className="amr-content">
                <h4>Overdosage Cases</h4>
                <div className="amr-value">{diseaseData.amrRisks.overdosage_count || 0}</div>
              </div>
            </div>
            <div className="amr-card">
              <div className="amr-icon">🧪</div>
              <div className="amr-content">
                <h4>Worst Tissue MRL</h4>
                <div className="amr-value">{diseaseData.amrRisks.worst_tissue || 'N/A'}</div>
              </div>
            </div>
            <div className="amr-card">
              <div className="amr-icon">📊</div>
              <div className="amr-content">
                <h4>Predicted Residual (Avg)</h4>
                <div className="amr-value">{diseaseData.amrRisks.avg_predicted_mrl != null ? Number(diseaseData.amrRisks.avg_predicted_mrl).toFixed(2) : 0}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="no-data">
            <span className="no-data-icon">🧬</span>
            <p>No AMR risk data available</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderMonthlyForecast = () => (
    <div className="intelligence-section">
      <div className="section-header">
        <h3>📈 Monthly Disease Forecast</h3>
        <p>Time series analysis for disease trend prediction</p>
      </div>
      <div className="forecast-container">
        {diseaseData.monthlyForecast.length > 0 ? (
          <div className="forecast-chart">
            {diseaseData.monthlyForecast.map((month, idx) => (
              <div key={idx} className="forecast-bar-container">
                <div className="forecast-month">{month.month}</div>
                <div className="forecast-bar-wrapper">
                  <div 
                    className="forecast-bar"
                    style={{ 
                      height: `${(month.case_count / Math.max(...diseaseData.monthlyForecast.map(m => m.case_count))) * 100}%` 
                    }}
                  >
                    <span className="forecast-value">{month.case_count}</span>
                  </div>
                </div>
                {month.trend && (
                  <div className={`trend-indicator ${month.trend}`}>
                    {month.trend === 'increasing' ? '📈' : month.trend === 'decreasing' ? '📉' : '➡️'}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data">
            <span className="no-data-icon">📈</span>
            <p>Insufficient data for forecasting</p>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="disease-intelligence-hub">
        <div className="intelligence-header">
          <h1>🧬 Livestock Disease Intelligence Hub</h1>
          <p>Advanced analytics for disease patterns and antimicrobial resistance</p>
        </div>
        <div className="loading-container">
          <div className="spinner">⏳</div>
          <p>Loading intelligence data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="disease-intelligence-hub">
      <div className="intelligence-header">
        <h1>🧬 Livestock Disease Intelligence Hub</h1>
        <p>Advanced analytics for disease patterns and antimicrobial resistance</p>
      </div>

      <div className="intelligence-tabs">
        <button 
          className={`tab-btn ${activeTab === 'clusters' ? 'active' : ''}`}
          onClick={() => setActiveTab('clusters')}
        >
          🗺️ Disease Clusters
        </button>
        <button 
          className={`tab-btn ${activeTab === 'medications' ? 'active' : ''}`}
          onClick={() => setActiveTab('medications')}
        >
          💊 Medications
        </button>
        <button 
          className={`tab-btn ${activeTab === 'causes' ? 'active' : ''}`}
          onClick={() => setActiveTab('causes')}
        >
          🔬 Root Causes
        </button>
        <button 
          className={`tab-btn ${activeTab === 'compliance' ? 'active' : ''}`}
          onClick={() => setActiveTab('compliance')}
        >
          ⏱️ Compliance
        </button>
        <button 
          className={`tab-btn ${activeTab === 'amr' ? 'active' : ''}`}
          onClick={() => setActiveTab('amr')}
        >
          🧬 AMR Risk
        </button>
        <button 
          className={`tab-btn ${activeTab === 'forecast' ? 'active' : ''}`}
          onClick={() => setActiveTab('forecast')}
        >
          📈 Forecast
        </button>
      </div>

      <div className="intelligence-content">
        {activeTab === 'clusters' && renderDiseaseClusters()}
        {activeTab === 'medications' && renderMedicationUsage()}
        {activeTab === 'causes' && renderRootCauses()}
        {activeTab === 'compliance' && renderWithdrawalCompliance()}
        {activeTab === 'amr' && renderAMRRisk()}
        {activeTab === 'forecast' && renderMonthlyForecast()}
      </div>
    </div>
  );
};

export default DiseaseIntelligenceHub;
