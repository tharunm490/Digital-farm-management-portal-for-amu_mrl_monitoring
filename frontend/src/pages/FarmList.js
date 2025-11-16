import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './FarmList.css';

const FarmList = () => {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchFarms();
  }, [user]);

  const fetchFarms = async () => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = user?.role === 'farmer' 
        ? `${process.env.REACT_APP_API_URL}/farms/my-farms`
        : `${process.env.REACT_APP_API_URL}/farms`;
      
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setFarms(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch farms');
    } finally {
      setLoading(false);
    }
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
                  <span className="value">{farm.batch_count || 0}</span>
                </div>
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
