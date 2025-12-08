import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navigation from '../../components/Navigation';

const SampleCollection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingSamples, setPendingSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSample, setSelectedSample] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    sample_type: 'milk',
    collected_date: new Date().toISOString().split('T')[0],
    remarks: ''
  });

  useEffect(() => {
    fetchPendingSamples();
  }, []);

  const fetchPendingSamples = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/lab/pending-samples', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPendingSamples(data);
      } else {
        setError('Failed to load pending samples');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSample) {
      setError('Please select a sample');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/lab/collect-sample', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          sample_request_id: selectedSample.sample_request_id,
          sample_type: formData.sample_type,
          collected_date: formData.collected_date,
          remarks: formData.remarks
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Sample #${data.sample_id} collected successfully!`);
        setSelectedSample(null);
        setFormData({
          sample_type: 'milk',
          collected_date: new Date().toISOString().split('T')[0],
          remarks: ''
        });
        fetchPendingSamples();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to collect sample');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <Navigation />
      
      <div className="mt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🧿 Sample Collection</h1>
          <p className="text-gray-600">Collect samples from animals on safe date for withdrawal</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Pending Samples List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-4">
                <h2 className="text-lg font-bold">📋 Pending Samples</h2>
              </div>
              
              {loading ? (
                <div className="p-6 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : pendingSamples.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <p>No samples ready for collection</p>
                </div>
              ) : (
                <div className="divide-y max-h-96 overflow-y-auto">
                  {pendingSamples.map(sample => (
                    <button
                      key={sample.sample_request_id}
                      onClick={() => setSelectedSample(sample)}
                      className={`w-full text-left px-6 py-4 hover:bg-gray-50 transition ${
                        selectedSample?.sample_request_id === sample.sample_request_id
                          ? 'bg-blue-50 border-l-4 border-blue-600'
                          : ''
                      }`}
                    >
                      <div className="font-semibold text-gray-900">Entity #{sample.entity_id}</div>
                      <div className="text-sm text-gray-600">{sample.species}</div>
                      <div className="text-xs text-gray-500 mt-1">Safe: {sample.safe_date}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Collection Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4">
                <h2 className="text-lg font-bold">🧪 Collection Form</h2>
              </div>

              {selectedSample ? (
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  {/* Sample Details */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Sample Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Entity ID</p>
                        <p className="font-semibold text-gray-900">#{selectedSample.entity_id}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Species</p>
                        <p className="font-semibold text-gray-900">{selectedSample.species}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Farm</p>
                        <p className="font-semibold text-gray-900">{selectedSample.farm_name}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Safe Date</p>
                        <p className="font-semibold text-green-600">{selectedSample.safe_date}</p>
                      </div>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Sample Type *
                    </label>
                    <select
                      value={formData.sample_type}
                      onChange={(e) => setFormData({ ...formData, sample_type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                    >
                      <option value="milk">🥛 Milk</option>
                      <option value="meat">🍖 Meat</option>
                      <option value="egg">🥚 Egg</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Collection Date *
                    </label>
                    <input
                      type="date"
                      value={formData.collected_date}
                      onChange={(e) => setFormData({ ...formData, collected_date: e.target.value })}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Remarks
                    </label>
                    <textarea
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      placeholder="Add any notes about the sample..."
                      rows="4"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-3 px-4 rounded-lg hover:shadow-lg transition disabled:opacity-50"
                  >
                    {submitting ? '🔄 Submitting...' : '✅ Submit Sample Collection'}
                  </button>
                </form>
              ) : (
                <div className="p-12 text-center">
                  <div className="text-5xl mb-4">👈</div>
                  <p className="text-gray-600">Select a sample from the list to begin collection</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SampleCollection;
