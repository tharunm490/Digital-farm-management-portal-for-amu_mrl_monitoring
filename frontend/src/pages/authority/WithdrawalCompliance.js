import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../../components/Navigation';

const WithdrawalCompliance = () => {
  const navigate = useNavigate();
  const [complianceData, setComplianceData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const fetchComplianceData = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL || '/api';
      const response = await fetch(`${API_URL}/analytics/withdrawal-compliance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setComplianceData(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching compliance:', error);
      setLoading(false);
    }
  };

  const getComplianceColor = (rate) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getComplianceGrade = (rate) => {
    if (rate >= 90) return { grade: 'A', status: 'Excellent', color: 'bg-green-500' };
    if (rate >= 70) return { grade: 'B', status: 'Good', color: 'bg-yellow-500' };
    if (rate >= 50) return { grade: 'C', status: 'Fair', color: 'bg-orange-500' };
    return { grade: 'D', status: 'Poor', color: 'bg-red-500' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navigation />
        <div className="mt-20 flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading Compliance Data...</p>
          </div>
        </div>
      </div>
    );
  }

  const compliance = complianceData || { compliance_rate: 0, compliant_count: 0, non_compliant_count: 0, total_treatments: 0 };
  const { grade, status, color } = getComplianceGrade(compliance.compliance_rate);

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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">✅ Withdrawal Period Compliance</h1>
          <p className="text-gray-600">Monitor adherence to antimicrobial withdrawal guidelines</p>
        </div>

        {/* Main Compliance Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Gauge Visual */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-64 h-64">
                <svg viewBox="0 0 200 200" className="transform -rotate-90">
                  {/* Background Circle */}
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="20"
                  />
                  {/* Progress Circle */}
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke={color.replace('bg-', '#')}
                    strokeWidth="20"
                    strokeDasharray={`${(compliance.compliance_rate / 100) * 502.65} 502.65`}
                    strokeLinecap="round"
                    className={`transition-all duration-1000 ${
                      compliance.compliance_rate >= 90 ? 'stroke-green-500' :
                      compliance.compliance_rate >= 70 ? 'stroke-yellow-500' :
                      'stroke-red-500'
                    }`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className={`text-5xl font-bold ${getComplianceColor(compliance.compliance_rate)}`}>
                    {compliance.compliance_rate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600 mt-2">Compliance Rate</p>
                </div>
              </div>
              <div className="mt-6 flex items-center space-x-3">
                <div className={`w-16 h-16 ${color} rounded-full flex items-center justify-center text-white text-2xl font-bold`}>
                  {grade}
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{status}</p>
                  <p className="text-sm text-gray-600">Overall Grade</p>
                </div>
              </div>
            </div>

            {/* Stats Breakdown */}
            <div className="space-y-6">
              <div className="bg-green-50 rounded-lg p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-800 font-medium">✅ Compliant Treatments</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{compliance.compliant_count}</p>
                  </div>
                  <div className="text-4xl">✅</div>
                </div>
              </div>

              <div className="bg-red-50 rounded-lg p-6 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-800 font-medium">❌ Non-Compliant Treatments</p>
                    <p className="text-3xl font-bold text-red-600 mt-1">{compliance.non_compliant_count}</p>
                  </div>
                  <div className="text-4xl">❌</div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-800 font-medium">📊 Total Treatments Analyzed</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">{compliance.total_treatments}</p>
                  </div>
                  <div className="text-4xl">💊</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Guidelines & Recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* What is Withdrawal Period */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📖 What is Withdrawal Period?</h3>
            <div className="space-y-4 text-gray-700">
              <p>
                The <strong>withdrawal period</strong> is the time between the last administration of 
                an antimicrobial drug and when it is safe to use the animal or its products for human consumption.
              </p>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-2">Why It Matters:</p>
                <ul className="list-disc list-inside text-sm space-y-1 text-blue-800">
                  <li>Prevents antimicrobial residues in food</li>
                  <li>Protects consumer health</li>
                  <li>Reduces antimicrobial resistance</li>
                  <li>Ensures regulatory compliance</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Compliance Criteria */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📋 Compliance Criteria</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">✅</div>
                <div>
                  <p className="font-semibold text-gray-900">Compliant Treatment</p>
                  <p className="text-sm text-gray-600">
                    Withdrawal period is ≥ 7 days (standard guideline for most antimicrobials)
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="text-2xl">❌</div>
                <div>
                  <p className="font-semibold text-gray-900">Non-Compliant Treatment</p>
                  <p className="text-sm text-gray-600">
                    Withdrawal period is &lt; 7 days or not specified
                  </p>
                </div>
              </div>
              <div className="mt-4 bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <p className="text-sm text-yellow-900">
                  <strong>⚠️ Note:</strong> Actual withdrawal periods vary by drug, species, and route of administration. 
                  Always consult veterinary guidelines.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Recommendations */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">💡 Recommendations Based on Current Compliance</h3>
          <div className="space-y-4">
            {compliance.compliance_rate >= 90 ? (
              <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                <p className="font-semibold text-green-900">🎉 Excellent Compliance!</p>
                <p className="text-sm text-green-800 mt-1">
                  Your region maintains outstanding withdrawal period compliance. Continue monitoring and 
                  share best practices with other regions.
                </p>
              </div>
            ) : compliance.compliance_rate >= 70 ? (
              <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
                <p className="font-semibold text-yellow-900">⚠️ Good, But Room for Improvement</p>
                <p className="text-sm text-yellow-800 mt-1">
                  Consider targeted awareness campaigns for farms with non-compliant treatments. 
                  Review veterinary prescribing practices.
                </p>
              </div>
            ) : (
              <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
                <p className="font-semibold text-red-900">🚨 Action Required</p>
                <p className="text-sm text-red-800 mt-1">
                  Compliance is below acceptable levels. Immediate interventions needed: mandatory training, 
                  regulatory audits, and stricter monitoring protocols.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <button className="bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition">
                📥 Download Report
              </button>
              <button className="bg-gray-200 text-gray-900 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition">
                📧 Email to Stakeholders
              </button>
              <button className="bg-gray-200 text-gray-900 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition">
                🔔 Set Alert Threshold
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WithdrawalCompliance;
