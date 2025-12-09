import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Navigation from '../../components/Navigation';

const AllReports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL || '/api';
      const response = await fetch(`${API_URL}/labs/all-reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      } else {
        setError('Failed to load reports');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(report => {
    if (filter === 'all') return true;
    return report.final_status === filter;
  });

  const getStatusColor = (status) => {
    const colors = {
      'safe': { bg: 'bg-green-100', text: 'text-green-700', icon: 'tick' },
      'borderline': { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: 'warn' },
      'unsafe': { bg: 'bg-red-100', text: 'text-red-700', icon: 'x' }
    };
    return colors[status] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: 'dot' };
  };

  const downloadReport = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL || '/api';
      const response = await fetch(`${API_URL}/lab/report/${reportId}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${reportId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      alert('Failed to download report: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <Navigation />
      
      <div className="mt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📁 All Lab Reports</h1>
          <p className="text-gray-600">History of all submitted test reports</p>
        </div>

        {/* Filter Buttons */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {['all', 'safe', 'borderline', 'unsafe'].map(status => (
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
            <p className="mt-4 text-gray-600">Loading reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-700">No reports found</h3>
            <p className="text-gray-500 mt-2">Reports will appear here once you submit test results</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredReports.map(report => {
              const statusColor = getStatusColor(report.final_status);
              return (
                <div
                  key={report.report_id}
                  className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition cursor-pointer"
                  onClick={() => setSelectedReport(selectedReport?.report_id === report.report_id ? null : report)}
                >
                  <div className={`${statusColor.bg} ${statusColor.text} px-6 py-4`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold">Report #{report.report_id}</h3>
                      <span className="text-2xl">{statusColor.icon === 'tick' ? '✓' : statusColor.icon === 'warn' ? '!' : statusColor.icon === 'x' ? 'X' : '•'}</span>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Sample ID</p>
                        <p className="font-semibold text-gray-900">#{report.sample_id || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Species</p>
                        <p className="font-semibold text-gray-900">{report.species || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Sample Type</p>
                        <p className="font-semibold text-gray-900">{report.sample_type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Tested On</p>
                        <p className="font-semibold text-gray-900">{report.tested_on}</p>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-gray-600">Detected</p>
                          <p className="font-bold text-gray-900">{report.detected_residue} μg/kg</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">MRL Limit</p>
                          <p className="font-bold text-gray-900">{report.mrl_limit} μg/kg</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Status</p>
                          <p className={`font-bold ${statusColor.text}`}>{report.final_status.toUpperCase()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Expanded View */}
                    {selectedReport?.report_id === report.report_id && (
                      <div className="mt-4 pt-4 border-t space-y-3 bg-gray-50 -mx-6 -mb-6 px-6 py-4">
                        {report.remarks && (
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Remarks</p>
                            <p className="text-sm text-gray-700">{report.remarks}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Withdrawal Days Remaining</p>
                          <p className="text-sm text-gray-700">{report.withdrawal_days_remaining} days</p>
                        </div>
                        {report.certificate_url && (
                          <button
                            onClick={() => downloadReport(report.report_id)}
                            className="w-full mt-3 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
                          >
                            📥 Download Certificate
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllReports;
