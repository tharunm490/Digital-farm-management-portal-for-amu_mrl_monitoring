import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { statesDistricts, getAllStates, getDistrictsByState } from '../../data/statesDistricts';
import './AuthorityMapView.css';

const AuthorityMapView = () => {
  const { user } = useAuth();
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapMode, setMapMode] = useState('markers'); // 'markers' or 'heatmap'
  const [filters, setFilters] = useState({
    species: '',
    state: '',
    district: '',
    risk_type: ''
  });
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef([]);
  const heatmapRef = useRef(null);

  useEffect(() => {
    loadGoogleMaps();
    fetchFarms();
  }, []);

  useEffect(() => {
    fetchFarms();
  }, [filters]);

  // Initialize map when Google Maps is loaded and mapRef is available
  useEffect(() => {
    console.log('Map init useEffect - google loaded:', googleMapsLoaded, 'container ready:', !!mapRef.current, 'map initialized:', !!googleMapRef.current);
    if (googleMapsLoaded && mapRef.current && !googleMapRef.current) {
      console.log('Google Maps loaded and container ready, initializing map...');
      initMap();
    } else {
      console.log('Map init conditions not met');
    }
  }, [googleMapsLoaded]);

  const loadGoogleMaps = () => {
    // Check if API key is available
    if (!process.env.REACT_APP_GOOGLE_MAPS_API_KEY) {
      console.warn('Google Maps API key not found. Maps will not load.');
      setLoading(false);
      return;
    }

    if (window.google && window.google.maps && window.google.maps.visualization) {
      console.log('Google Maps API with visualization library already loaded');
      setGoogleMapsLoaded(true);
      return;
    }

    console.log('Loading Google Maps API with visualization library...');
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=visualization&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;

    // Define the callback function
    window.initGoogleMaps = () => {
      console.log('Google Maps API loaded successfully with visualization library');
      setGoogleMapsLoaded(true);
    };

    script.onerror = () => {
      console.error('Failed to load Google Maps API');
      setLoading(false);
    };
    document.head.appendChild(script);
  };

  const initMap = () => {
    if (!googleMapsLoaded || !mapRef.current) {
      console.error('Google Maps not loaded or map container not found');
      return;
    }

    console.log('Initializing Google Map...');
    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 5,
      center: { lat: 20.5937, lng: 78.9629 }, // Center of India
      mapTypeId: 'roadmap',
    });

    googleMapRef.current = map;
    console.log('Map initialized successfully');

    // If we have farms data, plot them immediately
    if (farms.length > 0) {
      console.log('Plotting farms after map initialization...');
      if (mapMode === 'heatmap') {
        createHeatmap();
      } else {
        plotFarms();
      }
    }
  };

  const fetchFarms = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      console.log('Fetching farms data...');
      const response = await api.get(`/authority/map-view?${params}`);
      console.log('Farms data received:', response.data);
      console.log('Number of farms:', response.data.length);
      console.log('Farms with coordinates:', response.data.filter(f => f.latitude && f.longitude).length);
      setFarms(response.data);
    } catch (error) {
      console.error('Error fetching farms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFarmDetails = async (farmId) => {
    try {
      const response = await api.get(`/authority/farm/${farmId}`);
      setSelectedFarm(response.data);
    } catch (error) {
      console.error('Error fetching farm details:', error);
    }
  };

  useEffect(() => {
    console.log('useEffect triggered - farms:', farms.length, 'mapMode:', mapMode, 'google loaded:', googleMapsLoaded, 'map initialized:', !!googleMapRef.current);
    if (farms.length > 0 && googleMapsLoaded && googleMapRef.current) {
      console.log('Calling map plotting functions...');
      if (mapMode === 'heatmap') {
        createHeatmap();
      } else {
        plotFarms();
      }
    } else if (farms.length > 0 && googleMapsLoaded && !googleMapRef.current) {
      console.log('Farms available but map not initialized, initializing map...');
      if (mapRef.current) {
        initMap();
      }
    } else if (farms.length === 0) {
      console.log('No farms data available');
    } else if (!googleMapsLoaded) {
      console.log('Google Maps API not loaded yet');
    } else if (!googleMapRef.current) {
      console.log('Map reference not available');
    }
  }, [farms, mapMode, googleMapsLoaded]);

  const toggleMapMode = (mode) => {
    setMapMode(mode);
  };

  const createHeatmap = () => {
    console.log('Creating heatmap...');
    // Clear existing markers and heatmap
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    
    if (heatmapRef.current) {
      heatmapRef.current.setMap(null);
    }

    // Create heatmap data points
    const heatmapData = farms
      .filter(farm => farm.latitude && farm.longitude)
      .map(farm => ({
        location: new window.google.maps.LatLng(parseFloat(farm.latitude), parseFloat(farm.longitude)),
        weight: getHeatmapWeight(farm.risk_category)
      }));

    console.log('Heatmap data points:', heatmapData.length);

    if (heatmapData.length > 0) {
      heatmapRef.current = new window.google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map: googleMapRef.current,
        radius: 30,
        opacity: 0.7,
        gradient: [
          'rgba(0, 255, 255, 0)',
          'rgba(0, 255, 255, 1)',
          'rgba(0, 191, 255, 1)',
          'rgba(0, 127, 255, 1)',
          'rgba(0, 63, 255, 1)',
          'rgba(0, 0, 255, 1)',
          'rgba(0, 0, 223, 1)',
          'rgba(0, 0, 191, 1)',
          'rgba(0, 0, 159, 1)',
          'rgba(0, 0, 127, 1)',
          'rgba(63, 0, 91, 1)',
          'rgba(127, 0, 63, 1)',
          'rgba(191, 0, 31, 1)',
          'rgba(255, 0, 0, 1)'
        ]
      });
      console.log('Heatmap created successfully');
    } else {
      console.log('No valid heatmap data points found');
    }
  };

  const getHeatmapWeight = (riskCategory) => {
    switch (riskCategory) {
      case 'unsafe': return 10;
      case 'borderline': return 5;
      default: return 1;
    }
  };

  const plotFarms = () => {
    console.log('Plotting farms on map...');
    // Clear existing markers and heatmap
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    
    if (heatmapRef.current) {
      heatmapRef.current.setMap(null);
    }

    const farmsWithCoords = farms.filter(farm => farm.latitude && farm.longitude);
    console.log('Farms with coordinates:', farmsWithCoords.length);

    farmsWithCoords.forEach(farm => {
      if (farm.latitude && farm.longitude) {
        const marker = new window.google.maps.Marker({
          position: { lat: parseFloat(farm.latitude), lng: parseFloat(farm.longitude) },
          map: googleMapRef.current,
          title: farm.farm_name,
          icon: {
            url: getMarkerIcon(farm.risk_category),
            scaledSize: new window.google.maps.Size(30, 30)
          }
        });

        marker.addListener('click', () => {
          fetchFarmDetails(farm.farm_id);
        });

        markersRef.current.push(marker);
      }
    });

    console.log('Markers created:', markersRef.current.length);

    // Fit bounds to show all markers
    if (markersRef.current.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      markersRef.current.forEach(marker => bounds.extend(marker.getPosition()));
      googleMapRef.current.fitBounds(bounds);
      console.log('Map bounds fitted to markers');
    } else {
      console.log('No markers to fit bounds to');
    }
  };

  const getMarkerIcon = (riskCategory) => {
    switch (riskCategory) {
      case 'unsafe':
        return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
            <circle cx="15" cy="15" r="12" fill="#dc2626" stroke="#ffffff" stroke-width="2"/>
            <text x="15" y="20" text-anchor="middle" fill="white" font-size="16" font-weight="bold">!</text>
          </svg>
        `);
      case 'borderline':
        return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
            <circle cx="15" cy="15" r="12" fill="#f59e0b" stroke="#ffffff" stroke-width="2"/>
            <text x="15" y="20" text-anchor="middle" fill="white" font-size="16" font-weight="bold">?</text>
          </svg>
        `);
      default:
        return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
            <circle cx="15" cy="15" r="12" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
            <text x="15" y="20" text-anchor="middle" fill="white" font-size="16" font-weight="bold">✓</text>
          </svg>
        `);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      // Clear district when state changes
      if (key === 'state' && value !== prev.state) {
        newFilters.district = '';
      }
      return newFilters;
    });
  };

  if (loading) {
    return (
      <div className="authority-map-view">
        <div className="map-view-header">
          <h1>🗺️ Maps & Heatmaps</h1>
          <p>Detailed geographical insights with farm locations and risk visualization</p>
        </div>
        <div className="loading-spinner">Loading map data...</div>
      </div>
    );
  }

  // Check if Google Maps is available
  if (!window.google || !window.google.maps || !window.google.maps.visualization) {
    return (
      <div className="authority-map-view">
        <div className="map-view-header">
          <h1>🗺️ Maps & Heatmaps</h1>
          <p>Detailed geographical insights with farm locations and risk visualization</p>
        </div>
        <div className="map-unavailable">
          <div className="map-unavailable-content">
            <h2>🗺️ Map View Unavailable</h2>
            <p>Google Maps API with visualization library is not configured. Please contact the administrator to set up the Google Maps API key.</p>
            <div className="map-alternative">
              <h3>📊 Farm Data Summary</h3>
              <div className="farm-stats-grid">
                <div className="stat-item">
                  <span className="stat-number">{farms.length}</span>
                  <span className="stat-label">Total Farms</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{farms.filter(f => f.risk_category === 'unsafe').length}</span>
                  <span className="stat-label">Unsafe Farms</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{farms.filter(f => f.risk_category === 'borderline').length}</span>
                  <span className="stat-label">Borderline Farms</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{farms.filter(f => f.risk_category === 'safe').length}</span>
                  <span className="stat-label">Safe Farms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="authority-map-view">
      <div className="map-view-header">
        <h1>🗺️ Maps & Heatmaps</h1>
        <p>Detailed geographical insights with farm locations and risk visualization</p>
        <div className="map-mode-toggle">
          <button 
            className={`mode-btn ${mapMode === 'markers' ? 'active' : ''}`}
            onClick={() => toggleMapMode('markers')}
          >
            📍 Markers
          </button>
          <button 
            className={`mode-btn ${mapMode === 'heatmap' ? 'active' : ''}`}
            onClick={() => toggleMapMode('heatmap')}
          >
            🌡️ Heatmap
          </button>
        </div>
      </div>

      <div className="map-filters">
        <div className="filter-group">
          <label>Species:</label>
          <select value={filters.species} onChange={(e) => handleFilterChange('species', e.target.value)}>
            <option value="">All Species</option>
            <option value="cattle">Cattle</option>
            <option value="poultry">Poultry</option>
            <option value="pig">Pig</option>
            <option value="goat">Goat</option>
            <option value="sheep">Sheep</option>
          </select>
        </div>

        <div className="filter-group">
          <label>State:</label>
          <select value={filters.state} onChange={(e) => handleFilterChange('state', e.target.value)}>
            <option value="">All States</option>
            {getAllStates().map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>District:</label>
          <select 
            value={filters.district} 
            onChange={(e) => handleFilterChange('district', e.target.value)}
            disabled={!filters.state}
          >
            <option value="">All Districts</option>
            {filters.state && getDistrictsByState(filters.state).map(district => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Risk Type:</label>
          <select value={filters.risk_type} onChange={(e) => handleFilterChange('risk_type', e.target.value)}>
            <option value="">All Risks</option>
            <option value="safe">Safe</option>
            <option value="borderline">Borderline</option>
            <option value="unsafe">Unsafe</option>
          </select>
        </div>
      </div>

      <div className="map-container">
        <div ref={mapRef} className="google-map" style={{ height: '600px', width: '100%', border: '2px solid red', background: '#f0f0f0' }}></div>
        {!window.google && <div style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'red', fontSize: '20px'}}>Google Maps API Not Loaded</div>}
        {!window.google?.maps?.visualization && window.google && <div style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'orange', fontSize: '20px'}}>Heatmap Library Not Loaded</div>}
        {farms.length === 0 && <div style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'blue', fontSize: '20px'}}>No Farm Data Available</div>}

        {selectedFarm && (
          <div className="farm-details-panel">
            <div className="panel-header">
              <h3>{selectedFarm.farm.farm_name}</h3>
              <button onClick={() => setSelectedFarm(null)}>×</button>
            </div>
            <div className="panel-content">
              <div className="farm-info">
                <p><strong>Location:</strong> {selectedFarm.farm.state}, {selectedFarm.farm.district}</p>
                <p><strong>Total AMU Records:</strong> {selectedFarm.farm.total_amu}</p>
                <p><strong>Unsafe AMU Records:</strong> {selectedFarm.farm.unsafe_amu}</p>
              </div>
              <div className="amu-summary">
                <h4>Top Medicines Used</h4>
                {selectedFarm.amuSummary.slice(0, 5).map((item, index) => (
                  <div key={index} className="medicine-item">
                    <span className="medicine-name">{item.medicine_name}</span>
                    <span className="medicine-count">{item.count} uses</span>
                    <span className={`risk-badge ${item.risk_category}`}>{item.risk_category}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="map-legend">
        {mapMode === 'markers' ? (
          <>
            <h3>Marker Legend</h3>
            <div className="legend-items">
              <div className="legend-item">
                <div className="legend-marker safe"></div>
                <span>Safe</span>
              </div>
              <div className="legend-item">
                <div className="legend-marker borderline"></div>
                <span>Borderline</span>
              </div>
              <div className="legend-item">
                <div className="legend-marker unsafe"></div>
                <span>Unsafe</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <h3>Heatmap Legend</h3>
            <div className="heatmap-legend">
              <div className="heatmap-gradient"></div>
              <div className="heatmap-labels">
                <span>Low Risk</span>
                <span>High Risk</span>
              </div>
            </div>
            <p className="heatmap-info">Darker areas indicate higher concentration of unsafe AMU practices</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthorityMapView;