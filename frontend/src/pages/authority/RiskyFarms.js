import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../../components/Navigation';

const RiskyFarms = () => {
  const navigate = useNavigate();
  const [riskyFarms, setRiskyFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('unsafe_count'); // unsafe_count or max_residue

  useEffect(() => {
    fetchRiskyFarms();
  }, []);

  const fetchRiskyFarms = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL || '/api';
      const response = await fetch(`${API_URL}/analytics/risky-farms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setRiskyFarms(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching risky farms:', error);
      setLoading(false);
    }
  };

  const getSeverityBadge = (unsafeCount) => {
    if (unsafeCount >= 10) return { label: 'Critical', color: 'bg-red-600 text-white' };
    if (unsafeCount >= 5) return { label: 'High', color: 'bg-orange-500 text-white' };
    if (unsafeCount >= 3) return { label: 'Moderate', color: 'bg-yellow-500 text-gray-900' };
    return { label: 'Low', color: 'bg-blue-500 text-white' };
  };

  const sortedFarms = [...riskyFarms].sort((a, b) => {
    if (sortBy === 'unsafe_count') return b.unsafe_count - a.unsafe_count;
    return b.max_residue - a.max_residue;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navigation />
        <div className="mt-20 flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading Risky Farms...</p>
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
        <div className="mb-8">
          <button
            onClick={() => navigate('/authority/analytics')}
            className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
          >
            ← Back to Analytics
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🚨 High-Risk Farms Analysis</h1>
          <p className="text-gray-600">Farms with recurring unsafe antimicrobial residue reports</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Risky Farms</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{riskyFarms.length}</p>
              </div>
              <div className="text-4xl">🏡</div>
            </div>
          </div>

          <div className="bg-red-50 rounded-xl shadow-lg p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-800 font-medium">Critical Risk</p>
                <p className="text-3xl font-bold text-red-600 mt-1">
                  {riskyFarms.filter(f => f.unsafe_count >= 10).length}
                </p>
              </div>
              <div className="text-4xl">🔴</div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-800 font-medium">High Risk</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">
                  {riskyFarms.filter(f => f.unsafe_count >= 5 && f.unsafe_count < 10).length}
                </p>
              </div>
              <div className="text-4xl">🟠</div>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-800 font-medium">Moderate Risk</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">
                  {riskyFarms.filter(f => f.unsafe_count >= 3 && f.unsafe_count < 5).length}
                </p>
              </div>
              <div className="text-4xl">🟡</div>
            </div>
          </div>
        </div>

        {/* Sorting & Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">📊 Sort By:</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setSortBy('unsafe_count')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  sortBy === 'unsafe_count'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🔢 Unsafe Reports Count
              </button>
              <button
                onClick={() => setSortBy('max_residue')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  sortBy === 'max_residue'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                ⚗️ Max Residue Level
              </button>
            </div>
          </div>
        </div>

        {/* Farms Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Farm Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Unsafe Reports
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Max Residue
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedFarms.length > 0 ? (
                  sortedFarms.map((farm, index) => {
                    const severity = getSeverityBadge(farm.unsafe_count);
                    return (
                      <tr key={index} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 font-bold text-gray-700">
                            {index + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-bold text-gray-900">{farm.farm_name}</p>
                            <p className="text-sm text-gray-600">ID: {farm.farm_id}</p>
                            <p className="text-sm text-gray-600">Owner: {farm.farmer_name || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <p className="text-gray-900">{farm.district}</p>
                            <p className="text-gray-600">{farm.state}</p>
                            <p className="text-gray-500 text-xs">{farm.taluk}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <div className="text-2xl font-bold text-red-600">{farm.unsafe_count}</div>
                            <div className="text-sm text-gray-600">reports</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-lg font-bold text-orange-600">
                            {farm.max_residue ? `${farm.max_residue.toFixed(2)} ppm` : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${severity.color}`}>
                            {severity.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-semibold text-sm">
                            📋 View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      <div className="text-5xl mb-4">🎉</div>
                      <p className="text-lg font-semibold">No high-risk farms detected</p>
                      <p className="text-sm">All farms are maintaining safe residue levels</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Recommendations */}
        {riskyFarms.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">💡 Recommended Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
                <p className="font-semibold text-red-900 mb-2">🚨 Immediate Actions</p>
                <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                  <li>Schedule mandatory farm inspections</li>
                  <li>Review antimicrobial prescribing practices</li>
                  <li>Enforce stricter withdrawal period monitoring</li>
                  <li>Issue compliance notices to farm owners</li>
                </ul>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                <p className="font-semibold text-blue-900 mb-2">📚 Long-Term Interventions</p>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Conduct training on antimicrobial stewardship</li>
                  <li>Implement regular testing protocols</li>
                  <li>Establish farm certification programs</li>
                  <li>Increase awareness about AMR risks</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 flex space-x-4">
              <button className="bg-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 transition">
                🚨 Send Alert to Authorities
              </button>
              <button className="bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition">
                📥 Export Risky Farms Report
              </button>
              <button className="bg-gray-200 text-gray-900 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition">
                📧 Email to Regional Officers
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiskyFarms;
