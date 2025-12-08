import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navigation from '../../components/Navigation';

const SampleRequests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchSampleRequests();
  }, []);

  const fetchSampleRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/lab/sample-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      } else {
        setError('Failed to load sample requests');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true;
    return req.status === filter;
  });

  const getStatusColor = (status) => {
    const colors = {
      'requested': 'bg-yellow-100 text-yellow-700',
      'approved': 'bg-blue-100 text-blue-700',
      'collected': 'bg-purple-100 text-purple-700',
      'tested': 'bg-green-100 text-green-700',
      'completed': 'bg-emerald-100 text-emerald-700',
      'rejected': 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <Navigation />
      
      <div className="mt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🧪 Sample Requests</h1>
          <p className="text-gray-600">Animals assigned to your laboratory for sample collection</p>
        </div>

        {/* Filter Buttons */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {['all', 'requested', 'approved', 'collected', 'tested'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-700">No sample requests</h3>
            <p className="text-gray-500 mt-2">When treatments are assigned, sample requests will appear here</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                    <th className="px-6 py-3 text-left text-sm font-semibold">Request ID</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Entity ID</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Species</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Farm</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Safe Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRequests.map(req => (
                    <tr key={req.sample_request_id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">#{req.sample_request_id}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">#{req.entity_id}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{req.species || 'Unknown'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{req.farm_name}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{req.safe_date}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(req.status)}`}>
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {req.status === 'requested' || req.status === 'approved' ? (
                          <button
                            onClick={() => navigate('/lab/sample-collection', { state: { requestId: req.sample_request_id } })}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Collect Sample →
                          </button>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SampleRequests;
