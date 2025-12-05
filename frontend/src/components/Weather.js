import React, { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';

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
          url = `https://api.openweathermap.org/data/2.5/weather?lat=${locationToTry.lat}&lon=${locationToTry.lon}&appid=${API_KEY}&units=metric`;
        } else {
          url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(locationToTry)}&appid=${API_KEY}&units=metric`;
        }

        const response = await fetch(url);

        if (!response.ok) {
          if (response.status === 404 && !isCoords && locationToTry !== 'Delhi') {
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
            fetchWeather(location);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
          }
        );
      } else {
        fetchWeather(location);
      }
    };

    getLocationAndFetchWeather();
  }, [location]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-soft p-6">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-gray-200 h-12 w-12"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-white rounded-xl shadow-soft p-6">
        <div className="text-center text-gray-500">
          <span className="text-3xl mb-2 block">☁️</span>
          <p className="text-sm">Weather unavailable</p>
        </div>
      </div>
    );
  }

  const { main, weather: weatherInfo, wind } = weather;
  const iconUrl = `https://openweathermap.org/img/wn/${weatherInfo[0].icon}@2x.png`;

  // Function to get weather emoji based on condition
  const getWeatherEmoji = (weatherMain, weatherId) => {
    // Rain conditions
    if (weatherMain === 'Rain' || weatherMain === 'Drizzle' || weatherMain === 'Thunderstorm') {
      return '🌧️';
    }
    // Snow conditions
    if (weatherMain === 'Snow') {
      return '❄️';
    }
    // Cloudy conditions
    if (weatherMain === 'Clouds') {
      return '☁️';
    }
    // Clear/Sunny
    if (weatherMain === 'Clear') {
      return '☀️';
    }
    // Fog/Mist/Haze
    if (weatherMain === 'Mist' || weatherMain === 'Fog' || weatherMain === 'Haze') {
      return '🌫️';
    }
    // Default
    return '🌤️';
  };

  const weatherEmoji = getWeatherEmoji(weatherInfo[0].main, weatherInfo[0].id);

  return (
    <div className="bg-white rounded-xl shadow-soft p-6 col-span-1 sm:col-span-2 lg:col-span-1">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-900">{t('weather')}</h4>
        <span className="text-sm text-gray-500">📍 {weather.name}</span>
      </div>
      
      <div className="flex items-center space-x-4 mb-6">
        <div className="text-7xl">{weatherEmoji}</div>
        <div>
          <div className="text-4xl font-bold text-gray-900">{Math.round(main.temp)}°C</div>
          <div className="text-sm text-gray-500">{t('feels_like')} {Math.round(main.feels_like)}°C</div>
          <div className="text-sm text-gray-600 capitalize">{weatherInfo[0].description}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">💧</span>
          <div>
            <div className="text-sm font-medium text-gray-900">{main.humidity}%</div>
            <div className="text-xs text-gray-500">{t('humidity')}</div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-2xl">💨</span>
          <div>
            <div className="text-sm font-medium text-gray-900">{wind.speed} m/s</div>
            <div className="text-xs text-gray-500">{t('wind')}</div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-2xl">🌡️</span>
          <div>
            <div className="text-sm font-medium text-gray-900">{main.pressure} hPa</div>
            <div className="text-xs text-gray-500">{t('pressure')}</div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-2xl">👁️</span>
          <div>
            <div className="text-sm font-medium text-gray-900">{(weather.visibility / 1000).toFixed(1)} km</div>
            <div className="text-xs text-gray-500">{t('visibility')}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Weather;

