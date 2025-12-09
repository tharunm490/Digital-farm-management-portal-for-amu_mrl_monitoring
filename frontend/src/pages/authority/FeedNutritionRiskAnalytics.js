import React, { useState, useEffect } from 'react';
import { Bar, Pie, Line } from 'react-chartjs-2';
import AuthorityNavigation from '../../components/AuthorityNavigation';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const FeedNutritionRiskAnalytics = () => {
  const [analytics, setAnalytics] = useState([]);
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    riskLevel: '',
    species: '',
    startDate: '',
    endDate: ''
  });
  const [highRiskAlerts, setHighRiskAlerts] = useState(0);

  const API_URL = process.env.REACT_APP_API_URL || '/api';

  useEffect(() => {
    fetchAnalytics();
    fetchStats();
    fetchChartData();
    fetchHighRiskAlerts();
  }, [filters]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.riskLevel) params.append('riskLevel', filters.riskLevel);
      if (filters.species) params.append('species', filters.species);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`${API_URL}/feed/authority/feed-risk-analytics?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setAnalytics(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalytics([]);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/feed/authority/feed-risk-stats`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchChartData = async () => {
    try {
      const response = await fetch(`${API_URL}/feed/authority/feed-quality-chart`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setChartData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setChartData([]);
    }
  };

  const fetchHighRiskAlerts = async () => {
    try {
      const response = await fetch(`${API_URL}/feed/authority/high-risk-alerts`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setHighRiskAlerts(data.alertCount || 0);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const getRiskColor = (level) => {
    switch(level) {
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'very_high': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRiskBadge = (level) => {
    const icons = {
      low: '🟢',
      moderate: '🟡',
      high: '🟠',
      very_high: '🔴'
    };
    return `${icons[level] || ''} ${level.toUpperCase().replace('_', ' ')}`;
  };

  // Risk Distribution Pie Chart
  const riskDistributionData = stats ? {
    labels: ['Low Risk', 'Moderate Risk', 'High Risk', 'Very High Risk'],
    datasets: [{
      data: [
        stats.overall?.low_risk_count || 0,
        stats.overall?.moderate_risk_count || 0,
        stats.overall?.high_risk_count || 0,
        stats.overall?.very_high_risk_count || 0
      ],
      backgroundColor: ['#4ade80', '#fbbf24', '#fb923c', '#ef4444'],
      borderColor: '#fff',
      borderWidth: 2
    }]
  } : null;

  // Species-wise AMU Risk Bar Chart
  const speciesRiskData = stats?.bySpecies ? {
    labels: stats.bySpecies.map(s => s.species.charAt(0).toUpperCase() + s.species.slice(1)),
    datasets: [{
      label: 'Average AMU Risk',
      data: stats.bySpecies.map(s => parseFloat(s.avg_amu_risk)),
      backgroundColor: ['#3b82f6', '#10b981'],
      borderColor: ['#2563eb', '#059669'],
      borderWidth: 2
    }]
  } : null;

  // Feed Quality vs AMU Risk Trend Line Chart
  const trendData = chartData.length > 0 ? {
    labels: [...new Set(chartData.map(d => new Date(d.date).toLocaleDateString()))].slice(-14),
    datasets: [
      {
        label: 'Cattle FNI',
        data: [...new Set(chartData.map(d => d.date))].slice(-14).map(date => {
          const found = chartData.find(c => c.date === date && c.species === 'cattle');
          return found ? parseFloat(found.avg_fni) : null;
        }),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      },
      {
        label: 'Cattle AMU Risk',
        data: [...new Set(chartData.map(d => d.date))].slice(-14).map(date => {
          const found = chartData.find(c => c.date === date && c.species === 'cattle');
          return found ? parseFloat(found.avg_amu_risk) : null;
        }),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4
      },
      {
        label: 'Poultry FNI',
        data: [...new Set(chartData.map(d => d.date))].slice(-14).map(date => {
          const found = chartData.find(c => c.date === date && c.species === 'poultry');
          return found ? parseFloat(found.avg_fni) : null;
        }),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4
      },
      {
        label: 'Poultry AMU Risk',
        data: [...new Set(chartData.map(d => d.date))].slice(-14).map(date => {
          const found = chartData.find(c => c.date === date && c.species === 'poultry');
          return found ? parseFloat(found.avg_amu_risk) : null;
        }),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4
      }
    ]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthorityNavigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🌾 Feed-Nutrition Risk Analytics</h1>
          <p className="text-gray-600">
            Monitor farmer feed quality and AMU risk predictions
          </p>
        </div>

        {/* Alert Banner */}
        {highRiskAlerts > 0 && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-center">
              <span className="text-2xl mr-3">⚠️</span>
              <div>
                <div className="font-bold text-red-800">High Risk Alert!</div>
                <div className="text-red-700">
                  {highRiskAlerts} farmer(s) reported high/very high AMU risk in the last 7 days
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="text-sm text-gray-600 mb-1">Total Farmers</div>
              <div className="text-3xl font-bold text-blue-600">
                {parseInt(stats.overall?.total_farmers || 0).toLocaleString()}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="text-sm text-gray-600 mb-1">Avg Daily FNI</div>
              <div className="text-3xl font-bold text-green-600">
                {parseFloat(stats.overall?.avg_fni || 0).toFixed(3)}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
              <div className="text-sm text-gray-600 mb-1">Avg AMU Risk</div>
              <div className="text-3xl font-bold text-orange-600">
                {parseFloat(stats.overall?.avg_amu_risk || 0).toFixed(3)}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
              <div className="text-sm text-gray-600 mb-1">High Risk Farmers</div>
              <div className="text-3xl font-bold text-red-600">
                {parseInt(stats.overall?.high_risk_count || 0) + parseInt(stats.overall?.very_high_risk_count || 0)}
              </div>
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Risk Distribution Pie Chart */}
          {riskDistributionData && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">📊 Risk Distribution (Last 30 Days)</h2>
              <div style={{ height: '300px' }}>
                <Pie data={riskDistributionData} options={chartOptions} />
              </div>
            </div>
          )}

          {/* Species-wise Risk Bar Chart */}
          {speciesRiskData && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">🐄🐔 Species-Wise AMU Risk</h2>
              <div style={{ height: '300px' }}>
                <Bar data={speciesRiskData} options={chartOptions} />
              </div>
            </div>
          )}
        </div>

        {/* Feed Quality vs AMU Risk Trend */}
        {trendData && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">📈 Feed Quality vs AMU Risk Trend (Last 14 Days)</h2>
            <div style={{ height: '400px' }}>
              <Line data={trendData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🔍 Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Risk Level</label>
              <select
                value={filters.riskLevel}
                onChange={(e) => setFilters({...filters, riskLevel: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Levels</option>
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
                <option value="very_high">Very High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Species</label>
              <select
                value={filters.species}
                onChange={(e) => setFilters({...filters, species: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Species</option>
                <option value="cattle">Cattle</option>
                <option value="poultry">Poultry</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={() => setFilters({ riskLevel: '', species: '', startDate: '', endDate: '' })}
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Clear Filters
          </button>
        </div>

        {/* Top Risky Farmers */}
        {stats?.riskyFarmers && stats.riskyFarmers.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">⚠️ Top Risky Farmers</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Species</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">AMU Risk</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Level</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.riskyFarmers.map((farmer, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{farmer.farmer_name}</td>
                      <td className="px-4 py-3 capitalize">{farmer.species}</td>
                      <td className="px-4 py-3 font-bold text-red-600">
                        {parseFloat(farmer.amu_risk).toFixed(4)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRiskColor(farmer.risk_level)}`}>
                          {getRiskBadge(farmer.risk_level)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(farmer.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* All Farmers Data Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">📋 All Farmer Feed Entries</h2>
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : analytics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Species</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Daily FNI</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">AMU Risk</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Level</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.map((entry) => (
                    <tr key={entry.summary_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{entry.farmer_name}</td>
                      <td className="px-4 py-3 text-sm">{entry.farmer_phone}</td>
                      <td className="px-4 py-3 capitalize">{entry.species}</td>
                      <td className="px-4 py-3 font-semibold">{parseFloat(entry.daily_fni).toFixed(4)}</td>
                      <td className="px-4 py-3 font-semibold text-blue-600">
                        {parseFloat(entry.amu_risk).toFixed(4)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRiskColor(entry.risk_level)}`}>
                          {getRiskBadge(entry.risk_level)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No feed entries found with current filters
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedNutritionRiskAnalytics;
