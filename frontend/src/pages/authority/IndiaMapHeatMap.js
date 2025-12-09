import React, { useState, useEffect } from 'react';
import AuthorityNavigation from '../../components/AuthorityNavigation';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const IndiaMapHeatMap = () => {
  const [stateUsage, setStateUsage] = useState([]);
  const [districtUsage, setDistrictUsage] = useState([]);
  const [selectedState, setSelectedState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapType, setMapType] = useState('state'); // 'state' or 'district'

  useEffect(() => {
    fetchMapData();
  }, []);

  const fetchMapData = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL || '/api';
      const headers = { Authorization: `Bearer ${token}` };

      const [stateRes, districtRes] = await Promise.all([
        fetch(`${API_URL}/analytics/state-usage`, { headers }),
        fetch(`${API_URL}/analytics/district-usage`, { headers })
      ]);

      const stateData = await stateRes.json();
      const districtData = await districtRes.json();

      setStateUsage(stateData);
      setDistrictUsage(districtData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching map data:', error);
      setLoading(false);
    }
  };

  // Simplified India GeoJSON (state boundaries)
  const indiaGeoJSON = {
    type: "FeatureCollection",
    features: [
      // Add major states with approximate coordinates
      { type: "Feature", properties: { name: "Karnataka", center: [15.3173, 75.7139] }, geometry: null },
      { type: "Feature", properties: { name: "Maharashtra", center: [19.7515, 75.7139] }, geometry: null },
      { type: "Feature", properties: { name: "Tamil Nadu", center: [11.1271, 78.6569] }, geometry: null },
      { type: "Feature", properties: { name: "Kerala", center: [10.8505, 76.2711] }, geometry: null },
      { type: "Feature", properties: { name: "Andhra Pradesh", center: [15.9129, 79.7400] }, geometry: null },
      { type: "Feature", properties: { name: "Telangana", center: [18.1124, 79.0193] }, geometry: null },
      { type: "Feature", properties: { name: "Gujarat", center: [22.2587, 71.1924] }, geometry: null },
      { type: "Feature", properties: { name: "Rajasthan", center: [27.0238, 74.2179] }, geometry: null },
      { type: "Feature", properties: { name: "Uttar Pradesh", center: [26.8467, 80.9462] }, geometry: null },
      { type: "Feature", properties: { name: "Madhya Pradesh", center: [22.9734, 78.6569] }, geometry: null },
      { type: "Feature", properties: { name: "West Bengal", center: [22.9868, 87.8550] }, geometry: null },
      { type: "Feature", properties: { name: "Bihar", center: [25.0961, 85.3131] }, geometry: null },
      { type: "Feature", properties: { name: "Odisha", center: [20.9517, 85.0985] }, geometry: null },
      { type: "Feature", properties: { name: "Punjab", center: [31.1471, 75.3412] }, geometry: null },
      { type: "Feature", properties: { name: "Haryana", center: [29.0588, 76.0856] }, geometry: null },
      { type: "Feature", properties: { name: "Jharkhand", center: [23.6102, 85.2799] }, geometry: null },
      { type: "Feature", properties: { name: "Chhattisgarh", center: [21.2787, 81.8661] }, geometry: null },
      { type: "Feature", properties: { name: "Assam", center: [26.2006, 92.9376] }, geometry: null },
      { type: "Feature", properties: { name: "Himachal Pradesh", center: [31.1048, 77.1734] }, geometry: null },
      { type: "Feature", properties: { name: "Uttarakhand", center: [30.0668, 79.0193] }, geometry: null },
    ]
  };

  const getUsageForState = (stateName) => {
    const state = stateUsage.find(s => s.state === stateName);
    return state ? state.usage : 0;
  };

  const getColorForUsage = (usage) => {
    const maxUsage = Math.max(...stateUsage.map(s => s.usage), 1);
    const intensity = usage / maxUsage;

    if (intensity > 0.7) return '#dc2626'; // Red - High
    if (intensity > 0.4) return '#f59e0b'; // Yellow - Medium
    if (intensity > 0.1) return '#10b981'; // Green - Low
    return '#6b7280'; // Gray - Minimal/None
  };

  const getMarkerIcon = (usage) => {
    const maxUsage = Math.max(...stateUsage.map(s => s.usage), 1);
    const intensity = usage / maxUsage;
    const color = intensity > 0.7 ? 'red' : intensity > 0.4 ? 'orange' : 'green';
    const size = 20 + (intensity * 30);

    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: ${size/3}px;">${usage}</div>`,
      iconSize: [size, size],
      iconAnchor: [size/2, size/2]
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <AuthorityNavigation />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading Map Data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <AuthorityNavigation />
      
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <span className="text-5xl">🗺️</span>
            India AMU Heat Map
          </h1>
          <p className="text-gray-600">Geographical visualization of antimicrobial usage across India</p>
        </div>

        {/* Map Type Toggle */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setMapType('state')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              mapType === 'state'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            State View
          </button>
          <button
            onClick={() => setMapType('district')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              mapType === 'district'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            District View
          </button>
        </div>

        {/* Legend */}
        <div className="mb-6 bg-white rounded-xl shadow-lg p-6">
          <h3 className="font-bold text-gray-900 mb-4">Heat Map Legend</h3>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-green-500 border-2 border-white shadow"></div>
              <span className="text-sm">Low Usage (Safe)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-yellow-500 border-2 border-white shadow"></div>
              <span className="text-sm">Moderate Usage (Increasing)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-red-600 border-2 border-white shadow"></div>
              <span className="text-sm">High Usage (Critical)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gray-500 border-2 border-white shadow"></div>
              <span className="text-sm">No Data</span>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <MapContainer
            center={[20.5937, 78.9629]}
            zoom={5}
            style={{ height: '600px', width: '100%', borderRadius: '12px' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {/* State Markers */}
            {mapType === 'state' && indiaGeoJSON.features.map((feature, index) => {
              const usage = getUsageForState(feature.properties.name);
              if (feature.properties.center && usage > 0) {
                return (
                  <Marker
                    key={index}
                    position={feature.properties.center}
                    icon={getMarkerIcon(usage)}
                  >
                    <Popup>
                      <div className="p-2">
                        <h4 className="font-bold text-lg">{feature.properties.name}</h4>
                        <p className="text-sm text-gray-600">AMU Records: <span className="font-semibold">{usage}</span></p>
                        <p className="text-xs text-gray-500 mt-2">
                          {usage > 100 ? '⚠️ High antibiotic usage detected' : '✅ Moderate usage levels'}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                );
              }
              return null;
            })}
          </MapContainer>
        </div>

        {/* State Statistics Table */}
        {mapType === 'state' && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">State-wise AMU Statistics</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">State</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage Count</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Level</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stateUsage.map((state, index) => {
                    const maxUsage = Math.max(...stateUsage.map(s => s.usage));
                    const percentage = (state.usage / maxUsage) * 100;
                    const riskLevel = percentage > 70 ? 'High' : percentage > 40 ? 'Medium' : 'Low';
                    const riskColor = riskLevel === 'High' ? 'text-red-600 bg-red-50' :
                                     riskLevel === 'Medium' ? 'text-yellow-600 bg-yellow-50' :
                                     'text-green-600 bg-green-50';
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold">
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium">{state.state}</td>
                        <td className="px-6 py-4 text-lg font-semibold">{state.usage}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full font-semibold ${riskColor}`}>
                            {riskLevel}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full ${
                                riskLevel === 'High' ? 'bg-red-500' :
                                riskLevel === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* District Statistics */}
        {mapType === 'district' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">District-wise AMU Distribution</h3>
            
            {/* Group by State */}
            {[...new Set(districtUsage.map(d => d.state))].map(state => {
              const stateDistricts = districtUsage.filter(d => d.state === state);
              const stateTotal = stateDistricts.reduce((sum, d) => sum + d.usage, 0);
              
              return (
                <div key={state} className="mb-6">
                  <button
                    onClick={() => setSelectedState(selectedState === state ? null : state)}
                    className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition mb-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📍</span>
                      <span className="font-bold text-lg">{state}</span>
                      <span className="text-sm text-gray-600">({stateDistricts.length} districts)</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-blue-600">{stateTotal} records</span>
                      <span className="text-xl">{selectedState === state ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {selectedState === state && (
                    <div className="ml-8 space-y-2">
                      {stateDistricts
                        .sort((a, b) => b.usage - a.usage)
                        .map((district, index) => {
                          const percentage = (district.usage / stateTotal) * 100;
                          return (
                            <div key={index} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium">{district.district}</span>
                                <span className="font-semibold text-blue-600">{district.usage}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Insights */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-xl p-6">
            <span className="text-4xl mb-3 block">🔥</span>
            <h4 className="font-bold text-gray-900 mb-2">Highest Usage</h4>
            <p className="text-2xl font-bold text-red-600 mb-1">{stateUsage[0]?.state}</p>
            <p className="text-sm text-gray-600">{stateUsage[0]?.usage} AMU records</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6">
            <span className="text-4xl mb-3 block">📊</span>
            <h4 className="font-bold text-gray-900 mb-2">Total States</h4>
            <p className="text-2xl font-bold text-blue-600 mb-1">{stateUsage.length}</p>
            <p className="text-sm text-gray-600">Monitored regions</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6">
            <span className="text-4xl mb-3 block">📍</span>
            <h4 className="font-bold text-gray-900 mb-2">Total Districts</h4>
            <p className="text-2xl font-bold text-green-600 mb-1">{districtUsage.length}</p>
            <p className="text-sm text-gray-600">Coverage areas</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndiaMapHeatMap;
