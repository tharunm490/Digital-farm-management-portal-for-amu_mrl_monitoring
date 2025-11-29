import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './AuthorityHeatMap.css';

const AuthorityHeatMap = () => {
  const { user } = useAuth();
  const [heatMapData, setHeatMapData] = useState({});
  const [selectedState, setSelectedState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHeatMapData();
  }, []);

  const fetchHeatMapData = async () => {
    try {
      const response = await api.get('/authority/heat-map');
      setHeatMapData(response.data);
    } catch (error) {
      console.error('Error fetching heat map data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIntensity = (value, maxValue) => {
    if (!maxValue || value === 0) return 0;
    return (value / maxValue) * 100;
  };

  const getColor = (intensity) => {
    if (intensity === 0) return '#e5e7eb';
    if (intensity < 25) return '#dbeafe';
    if (intensity < 50) return '#bfdbfe';
    if (intensity < 75) return '#93c5fd';
    return '#3b82f6';
  };

  const indianStates = [
    'Jammu and Kashmir', 'Himachal Pradesh', 'Punjab', 'Haryana', 'Delhi',
    'Rajasthan', 'Uttar Pradesh', 'Uttarakhand', 'Bihar', 'Jharkhand',
    'West Bengal', 'Sikkim', 'Assam', 'Arunachal Pradesh', 'Nagaland',
    'Manipur', 'Mizoram', 'Tripura', 'Meghalaya', 'Chhattisgarh',
    'Madhya Pradesh', 'Maharashtra', 'Gujarat', 'Dadra and Nagar Haveli',
    'Daman and Diu', 'Goa', 'Karnataka', 'Kerala', 'Tamil Nadu',
    'Puducherry', 'Andhra Pradesh', 'Telangana', 'Odisha'
  ];

  const maxAMU = Math.max(...Object.values(heatMapData).map(state => state?.amuVolume || 0));
  const maxRisk = Math.max(...Object.values(heatMapData).map(state => state?.highRiskCases || 0));

  if (loading) {
    return (
      <div className="authority-heat-map">
        <div className="heat-map-header">
          <h1>🌡️ Geographical Heat Map</h1>
          <p>Antimicrobial Usage Intensity Across India</p>
        </div>
        <div className="loading-spinner">Loading heat map data...</div>
      </div>
    );
  }

  return (
    <div className="authority-heat-map">
      <div className="heat-map-header">
        <h1>🌡️ Geographical Heat Map</h1>
        <p>Antimicrobial Usage Intensity Across India</p>
      </div>

      <div className="heat-map-controls">
        <div className="legend">
          <h3>Intensity Scale</h3>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#e5e7eb' }}></div>
              <span>No Data</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#dbeafe' }}></div>
              <span>Low (0-25%)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#bfdbfe' }}></div>
              <span>Medium (25-50%)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#93c5fd' }}></div>
              <span>High (50-75%)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#3b82f6' }}></div>
              <span>Very High (75-100%)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="heat-map-container">
        <div className="india-map">
          {indianStates.map((state) => {
            const stateData = heatMapData[state] || {};
            const amuIntensity = getIntensity(stateData.amuVolume || 0, maxAMU);
            const riskIntensity = getIntensity(stateData.highRiskCases || 0, maxRisk);

            return (
              <div
                key={state}
                className={`map-state ${selectedState === state ? 'selected' : ''}`}
                style={{
                  backgroundColor: getColor(amuIntensity),
                  border: selectedState === state ? '2px solid #1e293b' : '1px solid #d1d5db'
                }}
                onClick={() => setSelectedState(selectedState === state ? null : state)}
                title={`${state}: AMU Volume - ${stateData.amuVolume || 0}, High Risk Cases - ${stateData.highRiskCases || 0}`}
              >
                <span className="state-name">{state.split(' ')[0]}</span>
              </div>
            );
          })}
        </div>

        {selectedState && (
          <div className="state-details">
            <h3>{selectedState}</h3>
            <div className="state-stats">
              <div className="stat-item">
                <span className="stat-label">AMU Volume:</span>
                <span className="stat-value">{heatMapData[selectedState]?.amuVolume || 0} kg</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">High Risk Cases:</span>
                <span className="stat-value">{heatMapData[selectedState]?.highRiskCases || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Farms:</span>
                <span className="stat-value">{heatMapData[selectedState]?.totalFarms || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Active Vets:</span>
                <span className="stat-value">{heatMapData[selectedState]?.activeVets || 0}</span>
              </div>
            </div>

            <div className="state-species-breakdown">
              <h4>Species-wise Usage</h4>
              {heatMapData[selectedState]?.speciesBreakdown ? (
                Object.entries(heatMapData[selectedState].speciesBreakdown).map(([species, data]) => (
                  <div key={species} className="species-item">
                    <span className="species-name">{species}:</span>
                    <span className="species-data">{data.treatments} treatments, {data.antibiotics?.toFixed(2)} kg</span>
                  </div>
                ))
              ) : (
                <p>No species data available</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="heat-map-summary">
        <div className="summary-card">
          <h3>📊 National Overview</h3>
          <div className="summary-stats">
            <div className="summary-stat">
              <span className="stat-label">Total States with Data:</span>
              <span className="stat-value">{Object.keys(heatMapData).length}</span>
            </div>
            <div className="summary-stat">
              <span className="stat-label">Highest AMU State:</span>
              <span className="stat-value">
                {Object.entries(heatMapData).reduce((max, [state, data]) =>
                  (data.amuVolume || 0) > (heatMapData[max]?.amuVolume || 0) ? state : max, '')}
              </span>
            </div>
            <div className="summary-stat">
              <span className="stat-label">Most High-Risk State:</span>
              <span className="stat-value">
                {Object.entries(heatMapData).reduce((max, [state, data]) =>
                  (data.highRiskCases || 0) > (heatMapData[max]?.highRiskCases || 0) ? state : max, '')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthorityHeatMap;