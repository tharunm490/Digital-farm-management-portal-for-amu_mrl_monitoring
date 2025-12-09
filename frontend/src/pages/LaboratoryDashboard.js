import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navigation from '../components/Navigation';

const LaboratoryDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pending: 0,
    collected: 0,
    tested: 0,
    completed: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/labs/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <Navigation />
      
      {/* Main Content - with offset for navbar */}
      <div className="mt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🧪 Laboratory Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome, <span className="font-semibold">{user?.display_name || 'Lab Manager'}</span>
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Pending Requests */}
          <div 
            className="relative overflow-hidden bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer border border-yellow-200 p-6 group"
            onClick={() => navigate('/lab/pending-requests')}
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/10 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform"></div>
            <div className="relative">
              <div className="text-4xl mb-2">⏳</div>
              <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
              <div className="text-sm text-gray-600">Pending Requests</div>
            </div>
          </div>

          {/* Collected Samples */}
          <div 
            className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer border border-blue-200 p-6 group"
            onClick={() => navigate('/lab/collected-samples')}
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform"></div>
            <div className="relative">
              <div className="text-4xl mb-2">🧫</div>
              <div className="text-2xl font-bold text-gray-900">{stats.collected}</div>
              <div className="text-sm text-gray-600">Samples Collected</div>
            </div>
          </div>

          {/* Under Testing */}
          <div 
            className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer border border-purple-200 p-6 group"
            onClick={() => navigate('/lab/testing')}
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform"></div>
            <div className="relative">
              <div className="text-4xl mb-2">🔬</div>
              <div className="text-2xl font-bold text-gray-900">{stats.tested}</div>
              <div className="text-sm text-gray-600">Under Testing</div>
            </div>
          </div>

          {/* Completed Reports */}
          <div 
            className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer border border-green-200 p-6 group"
            onClick={() => navigate('/lab/reports')}
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform"></div>
            <div className="relative">
              <div className="text-4xl mb-2">✅</div>
              <div className="text-2xl font-bold text-gray-900">{stats.completed}</div>
              <div className="text-sm text-gray-600">Reports Completed</div>
            </div>
          </div>
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* View Pending Requests */}
          <div 
            className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group border border-blue-200 p-8"
            onClick={() => navigate('/lab/pending-requests')}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                📋
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Pending Requests</h3>
              <p className="text-gray-600 text-sm">View and collect samples for pending requests</p>
            </div>
          </div>

          {/* Submit Test Report */}
          <div 
            className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group border border-green-200 p-8"
            onClick={() => navigate('/lab/upload-report')}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                📄
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Upload Report</h3>
              <p className="text-gray-600 text-sm">Submit lab test results and residue analysis</p>
            </div>
          </div>

          {/* View All Reports */}
          <div 
            className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group border border-purple-200 p-8"
            onClick={() => navigate('/lab/reports')}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                📊
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">All Reports</h3>
              <p className="text-gray-600 text-sm">View history of all submitted reports</p>
            </div>
          </div>
        </div>

        {/* Additional Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Lab Profile */}
          <div 
            className="relative overflow-hidden bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group border border-indigo-200 p-8"
            onClick={() => navigate('/lab/profile')}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                🏥
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Lab Profile</h3>
              <p className="text-gray-600 text-sm">View and update laboratory details</p>
            </div>
          </div>

          {/* Notifications */}
          <div 
            className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group border border-orange-200 p-8"
            onClick={() => navigate('/notifications')}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                🔔
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Notifications</h3>
              <p className="text-gray-600 text-sm">Check alerts and important messages</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaboratoryDashboard;
