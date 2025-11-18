import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navigation from '../components/Navigation';
import './AddFarm.css';

const AddFarm = () => {
  const [formData, setFormData] = useState({
    farm_name: '',
    latitude: '',
    longitude: '',
    address: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    // Wait for Google Maps to load
    const checkGoogleMaps = setInterval(() => {
      if (window.google && window.google.maps && mapRef.current && !mapInstanceRef.current) {
        clearInterval(checkGoogleMaps);
        initializeMap();
        setMapLoaded(true);
      }
    }, 100);

    return () => clearInterval(checkGoogleMaps);
  }, []);

  const initializeMap = () => {
    const defaultCenter = { lat: 20.5937, lng: 78.9629 }; // India center
    
    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 5,
      mapTypeControl: true,
      streetViewControl: false,
    });

    // Add click listener to map
    mapInstanceRef.current.addListener('click', (e) => {
      updateLocation(e.latLng.lat(), e.latLng.lng());
    });
  };

  const updateLocation = async (lat, lng) => {
    // Update marker
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }
    
    markerRef.current = new window.google.maps.Marker({
      position: { lat, lng },
      map: mapInstanceRef.current,
      title: 'Farm Location',
      animation: window.google.maps.Animation.DROP,
    });

    // Center map on marker
    mapInstanceRef.current.setCenter({ lat, lng });
    mapInstanceRef.current.setZoom(15);

    // Get address using reverse geocoding
    const geocoder = new window.google.maps.Geocoder();
    try {
      const response = await geocoder.geocode({ location: { lat, lng } });
      const address = response.results[0]?.formatted_address || '';
      
      setFormData({
        ...formData,
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6),
        address: address
      });
    } catch (error) {
      setFormData({
        ...formData,
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6)
      });
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${process.env.REACT_APP_API_URL || '/api'}/farms`, {
        farm_name: formData.farm_name,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Farm added successfully!');
      navigate('/farms');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add farm');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (!mapLoaded) {
      alert('Please wait for the map to load...');
      return;
    }
    
    setGettingLocation(true);
    setError('');
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          updateLocation(lat, lng);
          setGettingLocation(false);
        },
        (error) => {
          let errorMessage = 'Unable to get location';
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable. Please try again.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
            default:
              errorMessage = 'An unknown error occurred.';
          }
          alert(errorMessage);
          setGettingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      alert('Geolocation is not supported by this browser');
      setGettingLocation(false);
    }
  };

  return (
    <div className="add-farm-page">
      <Navigation />
      <div className="add-farm-container">
        <div className="page-header">
          <button onClick={() => navigate('/farms')} className="btn-back">← Back to Farms</button>
          <h1>Add New Farm</h1>
        </div>

        <div className="farm-content">
          {error && <div className="error-message">{error}</div>}
          
          <div className="content-grid">
            <div className="form-section">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Farm Name *</label>
                  <input
                    type="text"
                    name="farm_name"
                    value={formData.farm_name}
                    onChange={handleChange}
                    required
                    placeholder="Enter farm name"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Latitude *</label>
                    <input
                      type="number"
                      step="0.000001"
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleChange}
                      required
                      placeholder="e.g., 12.9716"
                      readOnly
                    />
                  </div>

                  <div className="form-group">
                    <label>Longitude *</label>
                    <input
                      type="number"
                      step="0.000001"
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleChange}
                      required
                      placeholder="e.g., 77.5946"
                      readOnly
                    />
                  </div>
                </div>

                {formData.address && (
                  <div className="form-group">
                    <label>Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      readOnly
                      className="address-display"
                    />
                  </div>
                )}

                <button 
                  type="button" 
                  onClick={getCurrentLocation} 
                  className="btn-location"
                  disabled={gettingLocation || !mapLoaded}
                >
                  {!mapLoaded ? '⏳ Loading Map...' : gettingLocation ? '📍 Getting Location...' : '📍 Use Current Location'}
                </button>

                <button type="submit" className="btn-submit" disabled={loading || !formData.latitude}>
                  {loading ? 'Adding Farm...' : 'Add Farm'}
                </button>
              </form>
            </div>

            <div className="map-section">
              <div className="map-header">
                <h3>📍 Select Farm Location</h3>
                <p>Click on the map or use current location button</p>
              </div>
              <div ref={mapRef} className="map-container"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddFarm;
