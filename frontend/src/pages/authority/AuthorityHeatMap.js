import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './AuthorityHeatMap.css';

const AuthorityHeatMap = () => {
  const { user } = useAuth();
  const [heatMapData, setHeatMapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const heatmapRef = useRef(null);

  useEffect(() => {
    fetchHeatMapData();
    loadGoogleMaps();
  }, []);

  const loadGoogleMaps = () => {
    if (window.google && window.google.maps) {
      initMap();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=visualization`;
    script.async = true;
    script.defer = true;
    script.onload = initMap;
    document.head.appendChild(script);
  };

  const initMap = () => {
    if (!window.google || !mapRef.current) return;

    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 5,
      center: { lat: 20.5937, lng: 78.9629 }, // Center of India
      mapTypeId: 'roadmap',
    });

    googleMapRef.current = map;

    if (heatMapData.length > 0) {
      createHeatmap();
    }
  };

  const createHeatmap = () => {
    if (!window.google || !googleMapRef.current || heatMapData.length === 0) return;

    // Convert data to Google Maps heatmap format
    const heatmapData = heatMapData.map(item => ({
      location: new window.google.maps.LatLng(item.latitude, item.longitude),
      weight: item.intensity || 1
    }));

    const heatmap = new window.google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      dissipating: false,
      radius: 20,
      opacity: 0.8,
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

    heatmap.setMap(googleMapRef.current);
    heatmapRef.current = heatmap;
  };

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

  useEffect(() => {
    if (heatMapData.length > 0 && window.google) {
      createHeatmap();
    }
  }, [heatMapData]);

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

      <div className="heat-map-container">
        <div ref={mapRef} className="google-map" style={{ height: '600px', width: '100%' }}></div>
      </div>

      <div className="heat-map-legend">
        <h3>Heat Intensity Legend</h3>
        <div className="legend-gradient"></div>
        <div className="legend-labels">
          <span>Low</span>
          <span>High</span>
        </div>
        <p>Intensity represents number of AMU records or % unsafe MRL cases</p>
      </div>
    </div>
  );
};

export default AuthorityHeatMap;