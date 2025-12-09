import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../../components/Navigation';

const StateHeatmap = () => {
  const navigate = useNavigate();
  const [stateUsage, setStateUsage] = useState([]);
  const [districtUsage, setDistrictUsage] = useState([]);
  const [selectedState, setSelectedState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHeatmapData();
  }, []);

  const fetchHeatmapData = async () => {
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
      console.error('Error fetching heatmap:', error);
      setLoading(false);
    }
  };

  const getUsageColor = (usage, maxUsage) => {
    const percentage = (usage / maxUsage) * 100;
    if (percentage >= 75) return 'bg-red-500';
    if (percentage >= 50) return 'bg-orange-500';
    if (percentage >= 25) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getUsageIntensity = (usage, maxUsage) => {
    const percentage = (usage / maxUsage) * 100;
    if (percentage >= 75) return 'High Risk';
    if (percentage >= 50) return 'Moderate';
    if (percentage >= 25) return 'Low';
    return 'Minimal';
  };

  const maxUsage = Math.max(...stateUsage.map(s => s.usage), 1);

  const filteredDistricts = selectedState
    ? districtUsage.filter(d => d.state === selectedState)
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navigation />
        <div className="mt-20 flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading Heat Map...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation />
      
      <div className="mt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate('/authority/analytics')}
              className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
            >
              ← Back to Analytics
            </button>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">🗺️ AMU State Heat Map</h1>
            <p className="text-gray-600">Regional antimicrobial usage distribution across India</p>
          </div>
        </div>

        {/* Color Legend */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Usage Intensity Legend</h3>
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-700">Minimal (0-25%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-yellow-500 rounded"></div>
              <span className="text-sm text-gray-700">Low (25-50%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-orange-500 rounded"></div>
              <span className="text-sm text-gray-700">Moderate (50-75%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-red-500 rounded"></div>
              <span className="text-sm text-gray-700">High Risk (75-100%)</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* State-wise List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">📍 State-Wise AMU Distribution</h3>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {stateUsage.map((state, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedState(state.state)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                      selectedState === state.state
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-4 h-4 rounded-full ${getUsageColor(state.usage, maxUsage)}`}></div>
                        <div>
                          <h4 className="font-bold text-gray-900">{state.state}</h4>
                          <p className="text-sm text-gray-600">{getUsageIntensity(state.usage, maxUsage)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">{state.usage}</p>
                        <p className="text-xs text-gray-600">AMU Records</p>
                      </div>
                    </div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getUsageColor(state.usage, maxUsage)}`}
                        style={{ width: `${(state.usage / maxUsage) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* District Drill-Down */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
              <h3 className="text-xl font-bold text-gray-900 mb-4">🏙️ District Breakdown</h3>
              {selectedState ? (
                <div>
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-600">Selected State</p>
                    <p className="text-lg font-bold text-blue-600">{selectedState}</p>
                  </div>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {filteredDistricts.length > 0 ? (
                      filteredDistricts.map((district, index) => (
                        <div key={index} className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-gray-900">{district.district}</p>
                            <p className="text-lg font-bold text-blue-600">{district.usage}</p>
                          </div>
                          <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full"
                              style={{
                                width: `${(district.usage / Math.max(...filteredDistricts.map(d => d.usage))) * 100}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-8">No district data available</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">🗺️</div>
                  <p className="text-gray-600">Select a state to view district-level breakdown</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-4">
              <div className="text-4xl">📍</div>
              <div>
                <p className="text-sm text-gray-600">Total States</p>
                <p className="text-2xl font-bold text-gray-900">{stateUsage.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-4">
              <div className="text-4xl">🏙️</div>
              <div>
                <p className="text-sm text-gray-600">Total Districts</p>
                <p className="text-2xl font-bold text-gray-900">{districtUsage.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-4">
              <div className="text-4xl">💊</div>
              <div>
                <p className="text-sm text-gray-600">Total AMU Records</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stateUsage.reduce((sum, s) => sum + s.usage, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StateHeatmap;
