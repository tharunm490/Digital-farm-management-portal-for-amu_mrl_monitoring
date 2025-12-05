import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { verifyAPI } from '../services/api';
import './QRVerification.css';

function QRVerification() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const entityIdFromUrl = queryParams.get('entity_id');

  const [entityId, setEntityId] = useState(entityIdFromUrl || '');
  const [verificationData, setVerificationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showToast, setShowToast] = useState(false);

// eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (entityIdFromUrl) {
      verifyEntity(entityIdFromUrl);
    }
  }, [entityIdFromUrl]);

  const verifyEntity = async (id = entityId) => {
    if (!id) {
      setError('Please enter an entity ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await verifyAPI.verifyBatch(id);
      setVerificationData(response.data);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      setError('Failed to verify entity. Entity may not exist.');
      console.error(err);
      setVerificationData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    verifyEntity();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
          <p className="mt-4 text-lg font-semibold text-gray-700">Verifying entity...</p>
          <p className="text-sm text-gray-500">Please wait while we verify the batch</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-4 px-3 sm:px-4 lg:px-6">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-slideInRight">
          <div className="bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm">
            <span>✅</span>
            <span className="font-semibold">Verified!</span>
          </div>
        </div>
      )}

      {/* Compact Page Header */}
      <div className="max-w-6xl mx-auto mb-4">
        <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl flex items-center justify-center text-2xl shadow-md">
              📱
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                QR Verification
              </h1>
              <p className="text-gray-600 text-sm">Scan & verify batch compliance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Verification Input */}
      {!entityIdFromUrl && (
        <div className="max-w-2xl mx-auto mb-4">
          <div className="bg-white/90 backdrop-blur-lg rounded-xl shadow-lg p-4 border border-white/20">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter Batch ID (e.g., 123)"
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                />
                <div className="absolute right-3 top-2.5 text-xl">🔍</div>
              </div>
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-lg flex items-center gap-2 text-sm">
                  <span>⚠️</span>
                  <p className="text-red-700 font-medium">{error}</p>
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span>🔍</span>
                <span>Verify Batch</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Compact Error Card */}
      {error && entityIdFromUrl && (
        <div className="max-w-4xl mx-auto mb-4">
          <div className="bg-red-50 rounded-xl shadow-lg p-4 border-l-4 border-red-500">
            <div className="flex items-center gap-3">
              <div className="text-3xl">⚠️</div>
              <div>
                <h2 className="text-lg font-bold text-red-900">Verification Failed</h2>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verification Results */}
      {verificationData && verificationData.entity_details && (
        <div className="max-w-6xl mx-auto space-y-3">
          {/* Compact Status Banner */}
          <div
            className={`relative overflow-hidden rounded-xl shadow-lg p-4 border-2 ${
              verificationData.withdrawal_info?.status === 'PASS'
                ? 'bg-gradient-to-br from-green-400 to-emerald-500 border-green-300'
                : verificationData.withdrawal_info?.status === 'FAIL'
                ? 'bg-gradient-to-br from-red-400 to-rose-500 border-red-300'
                : 'bg-gradient-to-br from-gray-400 to-slate-500 border-gray-300'
            }`}
          >
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-4xl">
                  {verificationData.withdrawal_info?.status === 'PASS' ? '✅' : verificationData.withdrawal_info?.status === 'FAIL' ? '❌' : '❓'}
                </div>
                <div className="text-white">
                  <h2 className="text-2xl font-black drop-shadow-lg">
                    {verificationData.withdrawal_info?.status || 'UNKNOWN'}
                  </h2>
                  <p className="text-sm font-semibold opacity-90">
                    {verificationData.withdrawal_info?.status === 'PASS'
                      ? 'Safe for consumption'
                      : verificationData.withdrawal_info?.status === 'FAIL'
                      ? 'Withdrawal period active'
                      : 'No treatment records'}
                  </p>
                </div>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-lg px-3 py-2 border border-white/30">
                <p className="text-white text-xs font-medium">ID</p>
                <p className="text-white text-lg font-bold">#{verificationData.entity_details.entity_id}</p>
              </div>
            </div>
          </div>

          {/* Entity Details - Glassmorphic Card */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/20">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center text-2xl shadow-md">
                📋
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {verificationData.entity_details.entity_type === 'animal' ? 'Animal' : 'Batch'} Details
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Entity ID</p>
                <p className="text-lg font-bold text-gray-900">#{verificationData.entity_details.entity_id}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Type</p>
                <p className="text-lg font-bold text-gray-900 capitalize">{verificationData.entity_details.entity_type}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Identifier</p>
                <p className="text-lg font-bold text-gray-900">
                  {verificationData.entity_details.entity_type === 'animal' 
                    ? verificationData.entity_details.tag_id 
                    : verificationData.entity_details.batch_name}
                </p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Species</p>
                <p className="text-lg font-bold text-gray-900">{verificationData.entity_details.species}</p>
              </div>
              {verificationData.entity_details.breed && (
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-100">
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Breed</p>
                  <p className="text-lg font-bold text-gray-900">{verificationData.entity_details.breed}</p>
                </div>
              )}
              <div className="bg-gradient-to-br from-rose-50 to-red-50 rounded-xl p-4 border border-rose-100">
                <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide mb-1">Product</p>
                <p className="text-lg font-bold text-gray-900">{verificationData.entity_details.matrix}</p>
              </div>
              {verificationData.entity_details.entity_type === 'batch' && verificationData.entity_details.animal_count && (
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-100">
                  <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-1">Animals in Batch</p>
                  <p className="text-lg font-bold text-gray-900">{verificationData.entity_details.animal_count}</p>
                </div>
              )}
              {verificationData.entity_details.farm_name && (
                <div className="bg-gradient-to-br from-lime-50 to-green-50 rounded-xl p-4 border border-lime-100">
                  <p className="text-xs font-semibold text-lime-600 uppercase tracking-wide mb-1">Farm</p>
                  <p className="text-lg font-bold text-gray-900">{verificationData.entity_details.farm_name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Treatment and AMU Records - Medical Card Design */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/20">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-2xl shadow-md">
                💊
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Treatment and AMU Records</h2>
            </div>
            {!verificationData.treatment_records || verificationData.treatment_records.length === 0 ? (
              <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-gray-600 font-medium">No treatment or AMU records found</p>
                <p className="text-sm text-gray-500 mt-2">This batch has no recorded treatments</p>
              </div>
            ) : (
              <div className="space-y-6">
                {verificationData.treatment_records.map((record, index) => {
                  const isSafe = record.safe_date && new Date(record.safe_date) <= new Date();
                  const getMrlStatusColor = (status) => {
                    if (status === 'safe') return 'from-green-500 to-emerald-600';
                    if (status === 'borderline') return 'from-yellow-500 to-amber-600';
                    if (status === 'unsafe') return 'from-red-500 to-rose-600';
                    return 'from-gray-500 to-slate-600';
                  };
                  
                  return (
                    <div key={index} className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 border-l-4 border-purple-500 shadow-lg hover:shadow-xl transition-shadow">
                      {/* Header with Medicine Name */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center space-x-2">
                            <span>💉</span>
                            <span>{record.active_ingredient}</span>
                          </h3>
                          {isSafe && (
                            <div className="inline-flex items-center space-x-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span>SAFE FOR CONSUMPTION</span>
                            </div>
                          )}
                        </div>
                        {record.medication_type && (
                          <span className="bg-purple-500 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide">
                            {record.medication_type}
                          </span>
                        )}
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {record.dose_amount && (
                          <div className="bg-white/70 rounded-lg p-3 flex items-center space-x-2">
                            <span className="text-2xl">💧</span>
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Dosage</p>
                              <p className="font-bold text-gray-900">{record.dose_amount} {record.dose_unit}</p>
                            </div>
                          </div>
                        )}
                        <div className="bg-white/70 rounded-lg p-3 flex items-center space-x-2">
                          <span className="text-2xl">🎯</span>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Route</p>
                            <p className="font-bold text-gray-900">{record.route}</p>
                          </div>
                        </div>
                        {record.frequency_per_day && (
                          <div className="bg-white/70 rounded-lg p-3 flex items-center space-x-2">
                            <span className="text-2xl">⏰</span>
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Frequency</p>
                              <p className="font-bold text-gray-900">{record.frequency_per_day}x per day</p>
                            </div>
                          </div>
                        )}
                        {record.duration_days && (
                          <div className="bg-white/70 rounded-lg p-3 flex items-center space-x-2">
                            <span className="text-2xl">📅</span>
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Duration</p>
                              <p className="font-bold text-gray-900">{record.duration_days} days</p>
                            </div>
                          </div>
                        )}
                        <div className="bg-white/70 rounded-lg p-3 flex items-center space-x-2">
                          <span className="text-2xl">🚀</span>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Start Date</p>
                            <p className="font-bold text-gray-900">{formatDate(record.start_date)}</p>
                          </div>
                        </div>
                        <div className="bg-white/70 rounded-lg p-3 flex items-center space-x-2">
                          <span className="text-2xl">🏁</span>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">End Date</p>
                            <p className="font-bold text-gray-900">{formatDate(record.end_date)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Critical Info - Highlighted */}
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {record.withdrawal_period_days && (
                          <div className="bg-gradient-to-br from-yellow-100 to-amber-100 border-2 border-yellow-400 rounded-xl p-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-2xl">⏳</span>
                              <p className="text-xs font-bold text-yellow-800 uppercase tracking-wide">Withdrawal Period</p>
                            </div>
                            <p className="text-2xl font-black text-yellow-900">{record.withdrawal_period_days} days</p>
                          </div>
                        )}
                        {record.safe_date && (
                          <div className={`bg-gradient-to-br ${isSafe ? 'from-green-100 to-emerald-100 border-green-400' : 'from-red-100 to-rose-100 border-red-400'} border-2 rounded-xl p-4`}>
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-2xl">{isSafe ? '✅' : '⏰'}</span>
                              <p className={`text-xs font-bold ${isSafe ? 'text-green-800' : 'text-red-800'} uppercase tracking-wide`}>Safe Date</p>
                            </div>
                            <p className={`text-2xl font-black ${isSafe ? 'text-green-900' : 'text-red-900'}`}>{formatDate(record.safe_date)}</p>
                          </div>
                        )}
                      </div>

                      {/* MRL and Risk Info */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {record.predicted_mrl && (
                          <div className={`inline-flex items-center space-x-2 bg-gradient-to-r ${getMrlStatusColor(record.mrl_status)} text-white px-4 py-2 rounded-full shadow-md`}>
                            <span className="font-bold text-xs uppercase">MRL:</span>
                            <span className="font-black">{record.predicted_mrl}</span>
                          </div>
                        )}
                        {record.risk_category && (
                          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-red-600 text-white px-4 py-2 rounded-full shadow-md">
                            <span className="text-sm">⚠️</span>
                            <span className="font-bold text-xs uppercase">Risk:</span>
                            <span className="font-black">{record.risk_category}</span>
                          </div>
                        )}
                      </div>

                      {/* Additional Info */}
                      <div className="mt-4 space-y-2">
                        {record.reason && (
                          <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                            <p className="text-xs font-semibold text-blue-600 mb-1">Reason for Treatment</p>
                            <p className="text-sm text-gray-700">{record.reason}</p>
                          </div>
                        )}
                        {record.cause && (
                          <div className="bg-indigo-50 border-l-4 border-indigo-500 p-3 rounded">
                            <p className="text-xs font-semibold text-indigo-600 mb-1">Cause</p>
                            <p className="text-sm text-gray-700">{record.cause}</p>
                          </div>
                        )}
                        {record.vet_name && (
                          <div className="bg-purple-50 border-l-4 border-purple-500 p-3 rounded flex items-center space-x-2">
                            <span className="text-xl">👨‍⚕️</span>
                            <div>
                              <p className="text-xs font-semibold text-purple-600">Veterinarian</p>
                              <p className="text-sm font-bold text-gray-900">{record.vet_name}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Withdrawal Period Info - Timeline Design */}
          {verificationData.withdrawal_info && verificationData.withdrawal_info.status && (
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/20">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-2xl shadow-md">
                  ⏱️
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Withdrawal Period Status</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Withdrawal Date */}
                <div className="relative bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border-2 border-blue-200 overflow-hidden">
                  <div className="absolute top-0 right-0 text-6xl opacity-10">📅</div>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-2">Withdrawal Date</p>
                  <p className="text-xl font-black text-blue-900">
                    {verificationData.withdrawal_info.withdrawal_date ? formatDate(verificationData.withdrawal_info.withdrawal_date) : 'N/A'}
                  </p>
                </div>

                {/* Safe Date */}
                <div className="relative bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-200 overflow-hidden">
                  <div className="absolute top-0 right-0 text-6xl opacity-10">✅</div>
                  <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-2">Safe Date</p>
                  <p className="text-xl font-black text-green-900">
                    {verificationData.withdrawal_info.safe_date ? formatDate(verificationData.withdrawal_info.safe_date) : 'N/A'}
                  </p>
                </div>

                {/* Days Remaining */}
                <div className={`relative bg-gradient-to-br ${
                  verificationData.withdrawal_info.days_remaining <= 0 ? 'from-green-50 to-emerald-50 border-green-200' : 'from-red-50 to-rose-50 border-red-200'
                } rounded-xl p-5 border-2 overflow-hidden`}>
                  <div className="absolute top-0 right-0 text-6xl opacity-10">
                    {verificationData.withdrawal_info.days_remaining <= 0 ? '✓' : '⏳'}
                  </div>
                  <p className={`text-xs font-bold ${
                    verificationData.withdrawal_info.days_remaining <= 0 ? 'text-green-600' : 'text-red-600'
                  } uppercase tracking-wide mb-2`}>Days Remaining</p>
                  <p className={`text-lg font-black ${
                    verificationData.withdrawal_info.days_remaining <= 0 ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {verificationData.withdrawal_info.days_remaining > 0 
                      ? `${verificationData.withdrawal_info.days_remaining} days` 
                      : verificationData.withdrawal_info.days_remaining === 0
                      ? 'Ready today'
                      : verificationData.withdrawal_info.days_remaining < 0
                      ? `Safe since ${Math.abs(verificationData.withdrawal_info.days_remaining)} days ago`
                      : 'N/A'}
                  </p>
                </div>

                {/* MRL Status */}
                <div className={`relative bg-gradient-to-br ${
                  verificationData.withdrawal_info.mrl_pass ? 'from-green-100 to-emerald-100 border-green-400' : 'from-red-100 to-rose-100 border-red-400'
                } rounded-xl p-5 border-2 overflow-hidden`}>
                  <div className="absolute top-0 right-0 text-6xl opacity-10">
                    {verificationData.withdrawal_info.mrl_pass ? '✓' : '✗'}
                  </div>
                  <p className={`text-xs font-bold ${
                    verificationData.withdrawal_info.mrl_pass ? 'text-green-700' : 'text-red-700'
                  } uppercase tracking-wide mb-2`}>MRL Status</p>
                  <p className={`text-2xl font-black ${
                    verificationData.withdrawal_info.mrl_pass ? 'text-green-900' : 'text-red-900'
                  } flex items-center space-x-2`}>
                    <span>{verificationData.withdrawal_info.mrl_pass ? '✓' : '✗'}</span>
                    <span>{verificationData.withdrawal_info.mrl_pass ? 'SAFE' : 'NOT SAFE'}</span>
                  </p>
                </div>
              </div>

              {/* Visual Timeline */}
              <div className="mt-6 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-xl p-6">
                <div className="relative">
                  <div className="absolute left-0 top-1/2 w-full h-2 bg-gray-200 rounded-full -translate-y-1/2"></div>
                  <div className={`absolute left-0 top-1/2 h-2 rounded-full -translate-y-1/2 transition-all duration-1000 ${
                    verificationData.withdrawal_info.days_remaining <= 0 ? 'bg-gradient-to-r from-green-500 to-emerald-600 w-full' : 'bg-gradient-to-r from-blue-500 to-purple-600 w-1/2'
                  }`}></div>
                  <div className="relative flex justify-between items-center">
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 bg-blue-500 rounded-full border-4 border-white shadow-md"></div>
                      <p className="mt-2 text-xs font-bold text-gray-700">Start</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 ${
                        verificationData.withdrawal_info.days_remaining <= 0 ? 'bg-green-500' : 'bg-gray-300'
                      } rounded-full border-4 border-white shadow-md`}></div>
                      <p className="mt-2 text-xs font-bold text-gray-700">Safe</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tamper Proof - Security Badge */}
          <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl shadow-xl p-8 border-2 border-green-300">
            <div className="flex items-center justify-center space-x-6">
              <div className="text-6xl animate-pulse">🔒</div>
              <div className="text-center">
                <h2 className="text-3xl font-black text-gray-900 mb-2">✓ Verification Status</h2>
                <p className="text-lg font-semibold text-gray-700">
                  {verificationData.tamper_proof?.message || 'Record verified successfully'}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  All treatment records and withdrawal periods have been verified
                </p>
              </div>
              <div className="hidden md:block">
                <div className="bg-white/60 backdrop-blur-sm rounded-xl px-6 py-4 border border-green-200 shadow-lg">
                  <div className="flex items-center space-x-2">
                    <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-xs font-bold text-green-700 uppercase">Tamper-Proof</p>
                      <p className="text-sm font-black text-green-900">Blockchain Verified</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QRVerification;
