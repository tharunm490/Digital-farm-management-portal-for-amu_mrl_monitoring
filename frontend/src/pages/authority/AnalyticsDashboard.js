import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navigation from '../../components/Navigation';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const AnalyticsDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [categoryUsage, setCategoryUsage] = useState([]);
  const [speciesUsage, setSpeciesUsage] = useState([]);
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL || '/api';
      const headers = { Authorization: `Bearer ${token}` };

      const [overviewRes, categoryRes, speciesRes, trendsRes, reportsRes, insightsRes] = await Promise.all([
        fetch(`${API_URL}/analytics/overview`, { headers }),
        fetch(`${API_URL}/analytics/category-usage`, { headers }),
        fetch(`${API_URL}/analytics/species-usage`, { headers }),
        fetch(`${API_URL}/analytics/monthly-trends`, { headers }),
        fetch(`${API_URL}/analytics/lab-reports-status`, { headers }),
        fetch(`${API_URL}/analytics/insights`, { headers })
      ]);

      const overviewData = await overviewRes.json();
      const categoryData = await categoryRes.json();
      const speciesData = await speciesRes.json();
      const trendsData = await trendsRes.json();
      const reportsData = await reportsRes.json();
      const insightsData = await insightsRes.json();

      setOverview(overviewData);
      setCategoryUsage(categoryData);
      setSpeciesUsage(speciesData);
      setMonthlyTrends(trendsData.reverse());
      setLabReports(reportsData);
      setInsights(insightsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setLoading(false);
    }
  };

  const categoryChartData = {
    labels: categoryUsage.map(item => item.category || 'Unknown'),
    datasets: [{
      label: 'Usage Count',
      data: categoryUsage.map(item => item.usage_count),
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(251, 191, 36, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(139, 92, 246, 0.8)',
      ],
      borderColor: [
        'rgb(59, 130, 246)',
        'rgb(16, 185, 129)',
        'rgb(251, 191, 36)',
        'rgb(239, 68, 68)',
        'rgb(139, 92, 246)',
      ],
      borderWidth: 2,
    }]
  };

  const speciesChartData = {
    labels: speciesUsage.map(item => item.species),
    datasets: [{
      label: 'Treatment Count',
      data: speciesUsage.map(item => item.treatment_count),
      backgroundColor: [
        'rgba(239, 68, 68, 0.7)',
        'rgba(34, 197, 94, 0.7)',
        'rgba(59, 130, 246, 0.7)',
        'rgba(251, 191, 36, 0.7)',
        'rgba(168, 85, 247, 0.7)',
      ],
    }]
  };

  const monthlyTrendsData = {
    labels: monthlyTrends.map(item => item.month),
    datasets: [{
      label: 'AMU Records',
      data: monthlyTrends.map(item => item.count),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
      fill: true,
    }]
  };

  const labReportsData = {
    labels: labReports.map(item => item.final_status || 'Unknown'),
    datasets: [{
      data: labReports.map(item => item.total),
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(251, 191, 36, 0.8)',
        'rgba(239, 68, 68, 0.8)',
      ],
      borderColor: [
        'rgb(34, 197, 94)',
        'rgb(251, 191, 36)',
        'rgb(239, 68, 68)',
      ],
      borderWidth: 2,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  const getInsightStyle = (type) => {
    const styles = {
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      danger: 'bg-red-50 border-red-200 text-red-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800',
    };
    return styles[type] || 'bg-gray-50 border-gray-200 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navigation />
        <div className="mt-20 flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading Analytics...</p>
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📊 Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive antimicrobial usage and compliance monitoring</p>
        </div>

        {/* Quick Stats */}
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total AMU Records</p>
                  <p className="text-3xl font-bold text-gray-900">{overview.total_amu_records}</p>
                </div>
                <div className="text-4xl">💊</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Farms</p>
                  <p className="text-3xl font-bold text-gray-900">{overview.total_farms}</p>
                </div>
                <div className="text-4xl">🏡</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Lab Reports</p>
                  <p className="text-3xl font-bold text-gray-900">{overview.total_lab_reports}</p>
                </div>
                <div className="text-4xl">🧪</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Unsafe Reports</p>
                  <p className="text-3xl font-bold text-red-600">{overview.unsafe_reports}</p>
                </div>
                <div className="text-4xl">⚠️</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending Samples</p>
                  <p className="text-3xl font-bold text-gray-900">{overview.pending_samples}</p>
                </div>
                <div className="text-4xl">⏳</div>
              </div>
            </div>
          </div>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🔍 Automated Insights</h2>
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <div key={index} className={`p-4 rounded-lg border-2 ${getInsightStyle(insight.type)}`}>
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">{insight.icon}</span>
                    <p className="font-medium">{insight.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Category Usage Bar Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📊 Antibiotic Category Usage</h3>
            <div className="h-80">
              <Bar data={categoryChartData} options={chartOptions} />
            </div>
          </div>

          {/* Species Usage Pie Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🥧 Species-Wise Treatment</h3>
            <div className="h-80 flex items-center justify-center">
              <Pie data={speciesChartData} options={chartOptions} />
            </div>
          </div>

          {/* Monthly Trends Line Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📈 Monthly AMU Trends</h3>
            <div className="h-80">
              <Line data={monthlyTrendsData} options={chartOptions} />
            </div>
          </div>

          {/* Lab Reports Status Doughnut */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🧪 Lab Report Status</h3>
            <div className="h-80 flex items-center justify-center">
              <Doughnut data={labReportsData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to="/authority/analytics/withdrawal-compliance" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="flex items-center space-x-4">
              <div className="text-4xl">📅</div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Withdrawal Compliance</h3>
                <p className="text-sm text-gray-600">Track safe date adherence</p>
              </div>
            </div>
          </Link>

          <Link to="/authority/analytics/state-heatmap" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="flex items-center space-x-4">
              <div className="text-4xl">🗺️</div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">State Heat Map</h3>
                <p className="text-sm text-gray-600">Regional AMU distribution</p>
              </div>
            </div>
          </Link>

          <Link to="/authority/analytics/risky-farms" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="flex items-center space-x-4">
              <div className="text-4xl">⚠️</div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Risky Farms</h3>
                <p className="text-sm text-gray-600">High-risk farm analysis</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
