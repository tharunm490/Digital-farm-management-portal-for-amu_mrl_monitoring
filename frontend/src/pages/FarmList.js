import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './FarmList.css';

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
    return <div className="loading">Loading farms...</div>;
  }

  return (
    <div className="farm-list-container">
      <div className="page-header">
        <button onClick={() => navigate('/dashboard')} className="btn-back">← Back</button>
        <h1>{user?.role === 'farmer' ? 'My Farms' : 'All Farms'}</h1>
        {user?.role === 'farmer' && (
          <button onClick={() => navigate('/add-farm')} className="btn-add">+ Add Farm</button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {farms.length === 0 ? (
        <div className="empty-state">
          <p>No farms found</p>
          {user?.role === 'farmer' && (
            <button onClick={() => navigate('/add-farm')} className="btn-primary">
              Add Your First Farm
            </button>
          )}
        </div>
      ) : (
        <div className="farms-grid">
          {farms.map((farm) => (
            <div key={farm.farm_id} className="farm-card">
              <div className="farm-header">
                <h3>{farm.farm_name}</h3>
                <span className="farm-id">ID: {farm.farm_id}</span>
              </div>
              
              <div className="farm-details">
                <div className="detail-row">
                  <span className="label">Farmer:</span>
                  <span className="value">{farm.farmer_name || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Location:</span>
                  <span className="value">
                    {farm.latitude && farm.longitude 
                      ? `${farm.latitude}, ${farm.longitude}`
                      : 'Not specified'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Batches:</span>
                  <span className="value">{farm.entity_count || 0}</span>
                </div>
                {(() => {
                  const status = getTreatmentRequestStatus(farm.farm_id);
                  return status ? (
                    <div className="detail-row">
                      <span className="label">Treatment Requests:</span>
                      <span className="value">
                        <span className="request-status">
                          <span className="total-count">Total: {status.totalCount}</span>
                          {status.pendingCount > 0 && <span className="status-pending">⏳ {status.pendingCount} Pending</span>}
                          {status.approvedCount > 0 && <span className="status-approved">✅ {status.approvedCount} Approved</span>}
                          {status.completedCount > 0 && <span className="status-completed">🏁 {status.completedCount} Completed</span>}
                          {status.rejectedCount > 0 && <span className="status-rejected">❌ {status.rejectedCount} Rejected</span>}
                        </span>
                      </span>
                    </div>
                  ) : null;
                })()}
              </div>

              <div className="farm-actions">
                <button 
                  onClick={() => navigate(`/batches/farm/${farm.farm_id}`)} 
                  className="btn-view"
                >
                  View Batches
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FarmList;
