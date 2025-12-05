import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const FarmList = () => {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [treatmentRequests, setTreatmentRequests] = useState({});
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchFarms();
  }, [user]);

  const fetchFarms = async () => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = user?.role === 'farmer' 
        ? `${process.env.REACT_APP_API_URL || '/api'}/farms/my-farms`
        : `${process.env.REACT_APP_API_URL || '/api'}/farms`;
      
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setFarms(response.data);
      
      // Fetch treatment requests for each farm
      const requests = {};
      for (const farm of response.data) {
        try {
          const requestResponse = await axios.get(
            `${process.env.REACT_APP_API_URL || '/api'}/treatment-requests/farm/${farm.farm_id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          requests[farm.farm_id] = requestResponse.data;
        } catch (err) {
          console.error(`Failed to fetch treatment requests for farm ${farm.farm_id}:`, err);
          requests[farm.farm_id] = [];
        }
      }
      setTreatmentRequests(requests);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch farms');
    } finally {
      setLoading(false);
    }
  };

  const getTreatmentRequestStatus = (farmId) => {
    const requests = treatmentRequests[farmId] || [];
    if (requests.length === 0) return null;
    
    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const approvedCount = requests.filter(r => r.status === 'approved').length;
    const completedCount = requests.filter(r => r.status === 'completed').length;
    const rejectedCount = requests.filter(r => r.status === 'rejected').length;
    
    return { pendingCount, approvedCount, completedCount, rejectedCount, totalCount: requests.length };
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-600 mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">Loading farms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4 w-full sm:w-auto">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2 px-3 py-2 sm:px-4 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium text-gray-700 transition-colors text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back</span>
              </button>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-xl sm:text-2xl shadow-md">
                  🏡
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900">
                  {user?.role === 'farmer' ? 'My Farms' : 'All Farms'}
                </h1>
              </div>
            </div>
            {user?.role === 'farmer' && (
              <button
                onClick={() => navigate('/add-farm')}
                className="flex items-center justify-center space-x-2 px-4 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all w-full sm:w-auto text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Farm</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">⚠️</span>
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          </div>
        </div>
      )}

      {farms.length === 0 ? (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-12 border border-white/20 text-center">
            <div className="text-6xl mb-4">🏡</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Farms Found</h3>
            <p className="text-gray-600 mb-6">Get started by adding your first farm</p>
            {user?.role === 'farmer' && (
              <button
                onClick={() => navigate('/add-farm')}
                className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Your First Farm</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {farms.map((farm) => {
              const status = getTreatmentRequestStatus(farm.farm_id);
              return (
                <div
                  key={farm.farm_id}
                  className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-white/20 group"
                >
                  {/* Farm Header */}
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-bold flex-1">{farm.farm_name}</h3>
                      <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold">
                        ID: {farm.farm_id}
                      </span>
                    </div>
                    <p className="text-green-100 text-sm">🧑‍🌾 {farm.farmer_name || 'N/A'}</p>
                  </div>

                  {/* Farm Details */}
                  <div className="p-6 space-y-4">
                    {/* Location */}
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                        📍
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</p>
                        <p className="text-sm font-medium text-gray-900 mt-0.5">
                          {farm.latitude && farm.longitude
                            ? `${farm.latitude}, ${farm.longitude}`
                            : 'Not specified'}
                        </p>
                      </div>
                    </div>

                    {/* Batches Count */}
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                        🐄
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Batches</p>
                        <p className="text-2xl font-black text-gray-900 mt-0.5">{farm.entity_count || 0}</p>
                      </div>
                    </div>

                    {/* Treatment Requests Status */}
                    {status && (
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                        <div className="flex items-center space-x-2 mb-3">
                          <span className="text-lg">💊</span>
                          <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">
                            Treatment Requests
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-2xl font-black text-purple-900">{status.totalCount}</span>
                          <span className="text-xs text-purple-600">Total Requests</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {status.pendingCount > 0 && (
                            <span className="inline-flex items-center space-x-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-bold">
                              <span>⏳</span>
                              <span>{status.pendingCount} Pending</span>
                            </span>
                          )}
                          {status.approvedCount > 0 && (
                            <span className="inline-flex items-center space-x-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">
                              <span>✅</span>
                              <span>{status.approvedCount} Approved</span>
                            </span>
                          )}
                          {status.completedCount > 0 && (
                            <span className="inline-flex items-center space-x-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">
                              <span>🏁</span>
                              <span>{status.completedCount} Done</span>
                            </span>
                          )}
                          {status.rejectedCount > 0 && (
                            <span className="inline-flex items-center space-x-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold">
                              <span>❌</span>
                              <span>{status.rejectedCount} Rejected</span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="px-6 pb-6">
                    <button
                      onClick={() => navigate(`/batches/farm/${farm.farm_id}`)}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transform group-hover:-translate-y-0.5 transition-all flex items-center justify-center space-x-2"
                    >
                      <span>View Batches</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmList;
