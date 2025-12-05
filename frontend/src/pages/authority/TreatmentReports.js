import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import indiaLocations from '../../data/indiaLocations';
import './TreatmentReports.css';

const TreatmentReports = () => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [filters, setFilters] = useState({
    fromDate: thirtyDaysAgo,
    toDate: today,
    species: '',
    state: '',
    district: '',
    taluk: '',
    medicine_category: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFilterChange = (field, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [field]: value };
      // Reset dependent filters
      if (field === 'state') {
        newFilters.district = '';
        newFilters.taluk = '';
      } else if (field === 'district') {
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

  const generateReport = async () => {
    if (!filters.fromDate || !filters.toDate) {
      setError('Please select both From Date and To Date');
      return;
    }

    if (new Date(filters.fromDate) > new Date(filters.toDate)) {
      setError('From Date cannot be after To Date');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('fromDate', filters.fromDate);
      params.append('toDate', filters.toDate);
      if (filters.species) params.append('species', filters.species);
      if (filters.state) params.append('state', filters.state);
      if (filters.district) params.append('district', filters.district);
      if (filters.taluk) params.append('taluk', filters.taluk);
      if (filters.medicine_category) params.append('medicine_category', filters.medicine_category);

      // Fetch PDF
      const response = await api.get(`/authority/reports/treatments?${params.toString()}`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `AMU_Report_${filters.state || 'National'}_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error generating report:', error);
      setError('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="treatment-reports">
      <div className="reports-header">
        <button className="back-btn" onClick={() => navigate('/authority/dashboard')}>
          ← Back to Dashboard
        </button>
        <div className="header-content">
          <h1>📄 Treatment Reports</h1>
          <p>Generate comprehensive AMU compliance reports</p>
        </div>
      </div>

      <div className="reports-container">
        <div className="filters-card">
          <div className="card-header">
            <h2>📋 Report Filters</h2>
            <p>Select criteria for your report</p>
          </div>

          <div className="filters-grid">
            {/* Date Range */}
            <div className="filter-section full-width">
              <h3>📅 Date Range (Required)</h3>
              <div className="date-inputs">
                <div className="form-group">
                  <label>From Date</label>
                  <input
                    type="date"
                    value={filters.fromDate}
                    onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                    max={today}
                  />
                </div>
                <div className="form-group">
                  <label>To Date</label>
                  <input
                    type="date"
                    value={filters.toDate}
                    onChange={(e) => handleFilterChange('toDate', e.target.value)}
                    max={today}
                  />
                </div>
              </div>
            </div>

            {/* Optional Filters */}
            <div className="filter-section">
              <h3>🐄 Species (Optional)</h3>
              <select
                value={filters.species}
                onChange={(e) => handleFilterChange('species', e.target.value)}
              >
                <option value="">All Species</option>
                <option value="cattle">Cattle</option>
                <option value="goat">Goat</option>
                <option value="sheep">Sheep</option>
                <option value="pig">Pig</option>
                <option value="poultry">Poultry</option>
              </select>
            </div>

            <div className="filter-section">
              <h3>💊 Medicine Category (Optional)</h3>
              <select
                value={filters.medicine_category}
                onChange={(e) => handleFilterChange('medicine_category', e.target.value)}
              >
                <option value="">All Categories</option>
                <option value="antibiotic">Antibiotic</option>
                <option value="bacterial">Bacterial</option>
                <option value="nsaid">NSAID</option>
                <option value="vaccine">Vaccine</option>
                <option value="anthelmintic">Anthelmintic</option>
              </select>
            </div>

            <div className="filter-section">
              <h3>📍 State (Optional)</h3>
              <select
                value={filters.state}
                onChange={(e) => handleFilterChange('state', e.target.value)}
              >
                <option value="">Select State</option>
                {getStates().map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div className="filter-section">
              <h3>🏘️ District (Optional)</h3>
              <select
                value={filters.district}
                onChange={(e) => handleFilterChange('district', e.target.value)}
                disabled={!filters.state}
              >
                <option value="">Select District</option>
                {getDistricts().map(district => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>

            <div className="filter-section">
              <h3>🏡 Taluk (Optional)</h3>
              <select
                value={filters.taluk}
                onChange={(e) => handleFilterChange('taluk', e.target.value)}
                disabled={!filters.district}
              >
                <option value="">Select Taluk</option>
                {getTaluks().map(taluk => (
                  <option key={taluk} value={taluk}>{taluk}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <div className="action-buttons">
            <button
              className="reset-btn"
              onClick={() => setFilters({
                fromDate: thirtyDaysAgo,
                toDate: today,
                species: '',
                state: '',
                district: '',
                taluk: '',
                medicine_category: ''
              })}
            >
              🔄 Reset Filters
            </button>
            <button
              className="generate-btn"
              onClick={generateReport}
              disabled={loading || !filters.fromDate || !filters.toDate}
            >
              {loading ? '⏳ Generating PDF...' : '📥 Generate PDF Report'}
            </button>
          </div>
        </div>

        <div className="info-card">
          <h2>📌 Report Information</h2>
          <div className="info-content">
            <div className="info-item">
              <span className="info-icon">📊</span>
              <div>
                <h4>Comprehensive Data</h4>
                <p>Includes farmer details, farm info, treatment records, AMU compliance, and withdrawal periods</p>
              </div>
            </div>
            <div className="info-item">
              <span className="info-icon">🔒</span>
              <div>
                <h4>Secure & Verified</h4>
                <p>Government-approved format with authority credentials and timestamp verification</p>
              </div>
            </div>
            <div className="info-item">
              <span className="info-icon">📈</span>
              <div>
                <h4>Summary Analytics</h4>
                <p>Automatic calculation of compliance statistics, top medicines, and risk categories</p>
              </div>
            </div>
            <div className="info-item">
              <span className="info-icon">✅</span>
              <div>
                <h4>Distributor Verification</h4>
                <p>Includes distributor acceptance/rejection logs if available</p>
              </div>
            </div>
          </div>

          <div className="report-preview">
            <h3>Report Will Include:</h3>
            <ul>
              <li>✓ Farmer Details (Name, Aadhaar, Phone, Location)</li>
              <li>✓ Farm & Animal/Batch Information</li>
              <li>✓ Complete Treatment Records</li>
              <li>✓ Medicine & Dosage Details</li>
              <li>✓ AMR Risk Assessment</li>
              <li>✓ Withdrawal Period Compliance</li>
              <li>✓ Current Safety Status</li>
              <li>✓ Distributor Verification Logs</li>
              <li>✓ Summary Statistics & Trends</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TreatmentReports;
