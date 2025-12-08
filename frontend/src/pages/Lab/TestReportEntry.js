import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Navigation from '../../components/Navigation';

const TestReportEntry = () => {
  const { user } = useAuth();
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSample, setSelectedSample] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [certificateFile, setCertificateFile] = useState(null);
  const [formData, setFormData] = useState({
    detected_residue: '',
    mrl_limit: '',
    withdrawal_days_remaining: '',
    final_status: 'safe',
    tested_on: new Date().toISOString().split('T')[0],
    remarks: ''
  });

  useEffect(() => {
    fetchUntestaSamples();
  }, []);

  const fetchUntestaSamples = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/lab/untested-samples', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSamples(data);
      } else {
        setError('Failed to load untested samples');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setCertificateFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSample) {
      setError('Please select a sample');
      return;
    }

    // Validate required fields
    if (!formData.detected_residue || !formData.mrl_limit) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();
      formDataToSend.append('sample_id', selectedSample.sample_id);
      formDataToSend.append('detected_residue', formData.detected_residue);
      formDataToSend.append('mrl_limit', formData.mrl_limit);
      formDataToSend.append('withdrawal_days_remaining', formData.withdrawal_days_remaining);
      formDataToSend.append('final_status', formData.final_status);
      formDataToSend.append('tested_on', formData.tested_on);
      formDataToSend.append('remarks', formData.remarks);
      
      if (certificateFile) {
        formDataToSend.append('certificate', certificateFile);
      }

      const response = await fetch('http://localhost:5000/api/lab/upload-report', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Report #${data.report_id} submitted successfully!`);
        setSelectedSample(null);
        setCertificateFile(null);
        setFormData({
          detected_residue: '',
          mrl_limit: '',
          withdrawal_days_remaining: '',
          final_status: 'safe',
          tested_on: new Date().toISOString().split('T')[0],
          remarks: ''
        });
        fetchUntestaSamples();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to submit report');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'safe': 'bg-green-100 text-green-700',
      'borderline': 'bg-yellow-100 text-yellow-700',
      'unsafe': 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <Navigation />
      
      <div className="mt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📝 Test Report Entry</h1>
          <p className="text-gray-600">Submit lab test results and residue analysis</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Untested Samples List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-4">
                <h2 className="text-lg font-bold">🧫 Collected Samples</h2>
              </div>
              
              {loading ? (
                <div className="p-6 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : samples.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <p>No samples ready for testing</p>
                </div>
              ) : (
                <div className="divide-y max-h-96 overflow-y-auto">
                  {samples.map(sample => (
                    <button
                      key={sample.sample_id}
                      onClick={() => setSelectedSample(sample)}
                      className={`w-full text-left px-6 py-4 hover:bg-gray-50 transition ${
                        selectedSample?.sample_id === sample.sample_id
                          ? 'bg-purple-50 border-l-4 border-purple-600'
                          : ''
                      }`}
                    >
                      <div className="font-semibold text-gray-900">Sample #{sample.sample_id}</div>
                      <div className="text-sm text-gray-600">Entity #{sample.entity_id}</div>
                      <div className="text-xs text-gray-500 mt-1">Type: {sample.sample_type}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Test Report Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4">
                <h2 className="text-lg font-bold">🔬 Report Form</h2>
              </div>

              {selectedSample ? (
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  {/* Sample Details */}
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Sample Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Sample ID</p>
                        <p className="font-semibold text-gray-900">#{selectedSample.sample_id}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Entity ID</p>
                        <p className="font-semibold text-gray-900">#{selectedSample.entity_id}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Sample Type</p>
                        <p className="font-semibold text-gray-900">{selectedSample.sample_type}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Collected Date</p>
                        <p className="font-semibold text-gray-900">{selectedSample.collected_date}</p>
                      </div>
                    </div>
                  </div>

                  {/* Test Results */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Detected Residue (μg/kg) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.detected_residue}
                        onChange={(e) => setFormData({ ...formData, detected_residue: e.target.value })}
                        placeholder="e.g., 0.05"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        MRL Limit (μg/kg) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.mrl_limit}
                        onChange={(e) => setFormData({ ...formData, mrl_limit: e.target.value })}
                        placeholder="e.g. 0.1"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Withdrawal Days Remaining
                      </label>
                      <input
                        type="number"
                        value={formData.withdrawal_days_remaining}
                        onChange={(e) => setFormData({ ...formData, withdrawal_days_remaining: e.target.value })}
                        placeholder="e.g., 0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Final Status *
                      </label>
                      <select
                        value={formData.final_status}
                        onChange={(e) => setFormData({ ...formData, final_status: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                      >
                        <option value="safe">✅ Safe</option>
                        <option value="borderline">⚠️ Borderline</option>
                        <option value="unsafe">❌ Unsafe</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Tested On *
                    </label>
                    <input
                      type="date"
                      value={formData.tested_on}
                      onChange={(e) => setFormData({ ...formData, tested_on: e.target.value })}
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
                      placeholder="Any additional notes about the test..."
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Certificate PDF (Optional)
                    </label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                    />
                    {certificateFile && (
                      <p className="text-sm text-green-600 mt-2">✅ {certificateFile.name}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-3 px-4 rounded-lg hover:shadow-lg transition disabled:opacity-50"
                  >
                    {submitting ? '🔄 Submitting...' : '✅ Submit Test Report'}
                  </button>
                </form>
              ) : (
                <div className="p-12 text-center">
                  <div className="text-5xl mb-4">👈</div>
                  <p className="text-gray-600">Select a sample from the list to enter test results</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestReportEntry;
