import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Navigation from '../../components/Navigation';

const IncomingTreatmentCases = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assigningId, setAssigningId] = useState(null);

  useEffect(() => {
    fetchIncomingCases();
  }, []);

  const fetchIncomingCases = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/lab/incoming-cases', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCases(data);
      } else {
        setError('Failed to load incoming cases');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignLab = async (treatmentId, entityId, farmerId, safeDate) => {
    try {
      setAssigningId(treatmentId);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/lab/assign-treatment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          treatment_id: treatmentId,
          entity_id: entityId,
          farmer_id: farmerId,
          safe_date: safeDate
        })
      });

      if (response.ok) {
        setCases(cases.filter(c => c.treatment_id !== treatmentId));
        alert('Treatment assigned to lab successfully!');
      } else {
        setError('Failed to assign treatment');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <Navigation />
      
      <div className="mt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📦 Incoming Treatment Cases</h1>
          <p className="text-gray-600">Completed treatments with withdrawal predictions requiring sample collection</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Loading cases...</p>
          </div>
        ) : cases.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-700">No incoming cases</h3>
            <p className="text-gray-500 mt-2">New treatment cases will appear here once vets complete treatments</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cases.map((caseItem) => (
              <div key={caseItem.treatment_id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
                  <h3 className="text-lg font-bold text-white">Treatment #{caseItem.treatment_id}</h3>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Farm</p>
                      <p className="font-semibold text-gray-900">{caseItem.farm_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Address</p>
                      <p className="font-semibold text-gray-900">{caseItem.address}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Entity</p>
                      <p className="font-semibold text-gray-900">#{caseItem.entity_id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Medicine</p>
                      <p className="font-semibold text-gray-900">{caseItem.treatment_medicine}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Safe Date for Withdrawal</p>
                    <div className="flex items-center space-x-2">
                      <p className="font-bold text-lg text-green-600">{caseItem.safe_date}</p>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        Safe
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <button
                      onClick={() => handleAssignLab(
                        caseItem.treatment_id,
                        caseItem.entity_id,
                        caseItem.farmer_id,
                        caseItem.safe_date
                      )}
                      disabled={assigningId === caseItem.treatment_id}
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:shadow-lg transition disabled:opacity-50"
                    >
                      {assigningId === caseItem.treatment_id ? 'Assigning...' : '✅ Assign to This Lab'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default IncomingTreatmentCases;
