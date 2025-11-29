import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './AuthorityReports.css';

const AuthorityReports = () => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState('amu_monthly');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState(null);

  const reportTypes = [
    { value: 'amu_monthly', label: 'AMU Monthly Report', description: 'Monthly antimicrobial usage statistics' },
    { value: 'mrl_violations', label: 'MRL Violation Report', description: 'Maximum residue limit violations' },
    { value: 'state_trends', label: 'State-wise Trends', description: 'Antibiotic usage trends by state' },
    { value: 'vet_activity', label: 'Veterinarian Activity', description: 'Veterinarian treatment logs' }
  ];

  const generateReport = async () => {
    setGenerating(true);
    try {
      const response = await api.get('/authority/reports/generate', {
        params: {
          type: reportType,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }
      });

      setReportData(response.data);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const exportReport = async (format) => {
    try {
      const response = await api.get('/authority/reports/export', {
        params: {
          type: reportType,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          format: format
        },
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_${dateRange.startDate}_to_${dateRange.endDate}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to export report. Please try again.');
    }
  };

  const renderReportContent = () => {
    if (!reportData) return null;

    switch (reportType) {
      case 'amu_monthly':
        return (
          <div className="report-content">
            <h3>AMU Monthly Statistics</h3>
            <div className="stats-grid">
              <div className="stat-box">
                <h4>Total Treatments</h4>
                <p className="stat-value">{reportData.totalTreatments || 0}</p>
              </div>
              <div className="stat-box">
                <h4>Antibiotics Used (kg)</h4>
                <p className="stat-value">{reportData.totalAntibiotics?.toFixed(2) || 0}</p>
              </div>
              <div className="stat-box">
                <h4>MRL Violations</h4>
                <p className="stat-value">{reportData.mrlViolations || 0}</p>
              </div>
              <div className="stat-box">
                <h4>High Risk Cases</h4>
                <p className="stat-value">{reportData.highRiskCases || 0}</p>
              </div>
            </div>

            <div className="chart-section">
              <h4>Species-wise Usage</h4>
              <div className="usage-chart">
                {reportData.speciesUsage?.map((item, index) => (
                  <div key={index} className="usage-item">
                    <span className="species-name">{item.species}</span>
                    <div className="usage-bar">
                      <div
                        className="usage-fill"
                        style={{ width: `${(item.count / Math.max(...reportData.speciesUsage.map(i => i.count))) * 100}%` }}
                      ></div>
                    </div>
                    <span className="usage-count">{item.count}</span>
                  </div>
                )) || <p>No data available</p>}
              </div>
            </div>
          </div>
        );

      case 'mrl_violations':
        return (
          <div className="report-content">
            <h3>MRL Violation Report</h3>
            <div className="violations-list">
              {reportData.violations?.map((violation, index) => (
                <div key={index} className="violation-item">
                  <div className="violation-header">
                    <h4>{violation.farm_name} - {violation.species}</h4>
                    <span className="violation-date">{new Date(violation.date).toLocaleDateString()}</span>
                  </div>
                  <div className="violation-details">
                    <p><strong>Medicine:</strong> {violation.medicine}</p>
                    <p><strong>Residual Level:</strong> {violation.residual_value} µg/kg</p>
                    <p><strong>MRL Limit:</strong> {violation.mrl_limit} µg/kg</p>
                    <p><strong>Violation:</strong> {(violation.residual_value / violation.mrl_limit * 100).toFixed(1)}%</p>
                  </div>
                </div>
              )) || <p>No violations found in the selected period</p>}
            </div>
          </div>
        );

      case 'state_trends':
        return (
          <div className="report-content">
            <h3>State-wise Antibiotic Trends</h3>
            <div className="state-trends">
              {reportData.stateTrends?.map((state, index) => (
                <div key={index} className="state-trend">
                  <h4>{state.state}</h4>
                  <div className="trend-stats">
                    <div className="trend-stat">
                      <span>Treatments:</span>
                      <span>{state.treatments}</span>
                    </div>
                    <div className="trend-stat">
                      <span>Antibiotics (kg):</span>
                      <span>{state.antibiotics?.toFixed(2)}</span>
                    </div>
                    <div className="trend-stat">
                      <span>Violations:</span>
                      <span>{state.violations}</span>
                    </div>
                  </div>
                </div>
              )) || <p>No state data available</p>}
            </div>
          </div>
        );

      case 'vet_activity':
        return (
          <div className="report-content">
            <h3>Veterinarian Activity Report</h3>
            <div className="vet-activity">
              {reportData.vetActivity?.map((vet, index) => (
                <div key={index} className="vet-item">
                  <h4>{vet.name}</h4>
                  <div className="activity-stats">
                    <div className="activity-stat">
                      <span>Total Treatments:</span>
                      <span>{vet.totalTreatments}</span>
                    </div>
                    <div className="activity-stat">
                      <span>Species Treated:</span>
                      <span>{vet.speciesCount}</span>
                    </div>
                    <div className="activity-stat">
                      <span>Farms Served:</span>
                      <span>{vet.farmsCount}</span>
                    </div>
                    <div className="activity-stat">
                      <span>MRL Violations:</span>
                      <span>{vet.violations}</span>
                    </div>
                  </div>
                </div>
              )) || <p>No veterinarian activity data available</p>}
            </div>
          </div>
        );

      default:
        return <p>Report type not supported</p>;
    }
  };

  return (
    <div className="authority-reports">
      <div className="reports-header">
        <h1>📋 Reports & Analytics</h1>
        <p>Generate comprehensive reports on antimicrobial usage and compliance</p>
      </div>

      <div className="report-generator">
        <div className="generator-form">
          <div className="form-group">
            <label>Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              {reportTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <p className="field-description">
              {reportTypes.find(t => t.value === reportType)?.description}
            </p>
          </div>

          <div className="date-range">
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="generator-actions">
            <button
              className="generate-btn"
              onClick={generateReport}
              disabled={generating}
            >
              {generating ? 'Generating...' : 'Generate Report'}
            </button>

            {reportData && (
              <div className="export-actions">
                <button
                  className="export-btn csv"
                  onClick={() => exportReport('csv')}
                >
                  📊 Export CSV
                </button>
                <button
                  className="export-btn pdf"
                  onClick={() => exportReport('pdf')}
                >
                  📄 Export PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {reportData && (
        <div className="report-display">
          <div className="report-header">
            <h2>{reportTypes.find(t => t.value === reportType)?.label}</h2>
            <p>Period: {new Date(dateRange.startDate).toLocaleDateString()} - {new Date(dateRange.endDate).toLocaleDateString()}</p>
          </div>

          {renderReportContent()}
        </div>
      )}

      {!reportData && !generating && (
        <div className="no-report">
          <div className="no-report-content">
            <h3>📊 Generate Your First Report</h3>
            <p>Select a report type and date range above to generate comprehensive analytics on antimicrobial usage and compliance.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthorityReports;