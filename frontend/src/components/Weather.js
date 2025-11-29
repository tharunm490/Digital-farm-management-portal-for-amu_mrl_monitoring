import React, { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import './Weather.css';

const Weather = ({ location }) => {
  const { t } = useTranslation();
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_KEY = '09edb31234abb3881dd13c5146ccccc9';

  useEffect(() => {
    const fetchWeather = async (locationToTry, isCoords = false) => {
      if (!locationToTry) {
        setLoading(false);
        return;
      }

      try {
        let url;
        if (isCoords) {
          // locationToTry is {lat, lon}
          url = `https://api.openweathermap.org/data/2.5/weather?lat=${locationToTry.lat}&lon=${locationToTry.lon}&appid=${API_KEY}&units=metric`;
        } else {
          // locationToTry is city name
          url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(locationToTry)}&appid=${API_KEY}&units=metric`;
        }

        const response = await fetch(url);

        if (!response.ok) {
          if (response.status === 404 && !isCoords && locationToTry !== 'Delhi') {
            // Try with default location if the provided location fails
            console.warn(`Weather data not found for ${locationToTry}, trying default location`);
            fetchWeather('Delhi');
            return;
          }
          throw new Error('Weather data not available');
        }

        const data = await response.json();
        setWeather(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const getLocationAndFetchWeather = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            fetchWeather({ lat: latitude, lon: longitude }, true);
          },
          (error) => {
            console.warn('Geolocation error:', error.message);
            // Fall back to profile location
            fetchWeather(location);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      } else {
        // Geolocation not supported, use profile location
        fetchWeather(location);
      }
    };

    getLocationAndFetchWeather();
  }, [location]);

  if (loading) {
    return (
      <div className="weather-card">
        <div className="weather-loading">Loading weather...</div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="weather-card">
        <div className="weather-error">Weather unavailable</div>
      </div>
    );
  }

  const { main, weather: weatherInfo, wind } = weather;
  const iconUrl = `https://openweathermap.org/img/wn/${weatherInfo[0].icon}@2x.png`;
  const weatherMain = weatherInfo[0].main.toLowerCase();

  return (
    <div className={`dashboard-card weather-card ${weatherMain}`}>
      <div className="weather-header">
        <h4>{t('weather')}</h4>
        <span className="location">📍 {weather.name}</span>
      </div>
      <div className="weather-content">
        <div className="weather-main">
          <img src={iconUrl} alt={weatherInfo[0].description} className="weather-icon" />
          <div className="weather-primary">
            <div className="temperature">{Math.round(main.temp)}°C</div>
            <div className="feels-like">{t('feels_like')} {Math.round(main.feels_like)}°C</div>
            <div className="description">{weatherInfo[0].description}</div>
          </div>
        </div>
        <div className="weather-stats-grid">
          <div className="stat-item">
            <span className="stat-icon">💧</span>
            <div className="stat-content">
              <div className="stat-value">{main.humidity}%</div>
              <div className="stat-label">{t('humidity')}</div>
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-icon">💨</span>
            <div className="stat-content">
              <div className="stat-value">{wind.speed} m/s</div>
              <div className="stat-label">{t('wind')}</div>
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🌡️</span>
            <div className="stat-content">
              <div className="stat-value">{main.pressure} hPa</div>
              <div className="stat-label">{t('pressure')}</div>
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-icon">👁️</span>
            <div className="stat-content">
              <div className="stat-value">{(weather.visibility / 1000).toFixed(1)} km</div>
              <div className="stat-label">{t('visibility')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Weather;