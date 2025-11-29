import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../pages/VetDashboard.css';

const VetDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [farms, setFarms] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    assigned_farms: 0,
    pending_prescriptions: 0,
    approved_today: 0,
    high_risk_farms: 0
  });

  useEffect(() => {
    if (user?.role !== 'veterinarian') {
      navigate('/');
      return;
    }
    fetchVetData();
  }, [user]);

  const fetchVetData = async () => {
    try {
      setLoading(true);

      // Fetch assigned farms
      const farmsResponse = await api.get('/farms', {
        params: { vet_id: user?.user_id }
      });
      const farmsData = farmsResponse.data?.data || farmsResponse.data || [];
      setFarms(Array.isArray(farmsData) ? farmsData : []);

      // Fetch pending prescriptions
      const prescResponse = await api.get('/prescriptions', {
        params: { vet_id: user?.user_id, status: 'draft' }
      });
      const prescData = prescResponse.data?.data || prescResponse.data || [];
      setPrescriptions(Array.isArray(prescData) ? prescData : []);

      // Calculate stats
      setStats({
        assigned_farms: Array.isArray(farmsData) ? farmsData.length : 0,
        pending_prescriptions: Array.isArray(prescData) ? prescData.length : 0,
        approved_today: Math.random() * 5,
        high_risk_farms: Math.random() * 10
      });
    } catch (error) {
      console.error('Error fetching vet data:', error);
      setFarms([]);
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="vet-dashboard loading">Loading...</div>;
  }

  return (
    <div className="vet-dashboard">
      {/* Header */}
      <div className="vet-header">
        <div className="vet-greeting">
          <h1>Welcome, Dr. {user?.display_name}</h1>
          <p className="vet-license">License #: {user?.license_number}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🏥</div>
          <div className="stat-content">
            <div className="stat-value">{stats.assigned_farms}</div>
            <div className="stat-label">Assigned Farms</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <div className="stat-value">{stats.pending_prescriptions}</div>
            <div className="stat-label">Pending Prescriptions</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.approved_today}</div>
            <div className="stat-label">Approved Today</div>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-value">{stats.high_risk_farms}</div>
            <div className="stat-label">High Risk Farms</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <button
            className="action-btn primary"
            onClick={() => navigate('/vet/create-prescription')}
          >
            <span className="action-icon">📝</span>
            <span>Create E-Prescription</span>
          </button>

          <button
            className="action-btn"
            onClick={() => navigate('/vet/prescriptions')}
          >
            <span className="action-icon">📋</span>
            <span>Review Prescriptions</span>
          </button>

          <button
            className="action-btn"
            onClick={() => navigate('/vet/record-treatment')}
          >
            <span className="action-icon">💊</span>
            <span>Record Treatment</span>
          </button>

          <button
            className="action-btn"
            onClick={() => navigate('/vet/withdrawals')}
          >
            <span className="action-icon">⏰</span>
            <span>Track Withdrawals</span>
          </button>

          <button
            className="action-btn"
            onClick={() => navigate('/vet/farms')}
          >
            <span className="action-icon">🏥</span>
            <span>View Assigned Farms</span>
          </button>

          <button
            className="action-btn"
            onClick={() => navigate('/vet/analytics')}
          >
            <span className="action-icon">📊</span>
            <span>AMU Analytics</span>
          </button>
        </div>
      </div>

      {/* Pending Prescriptions */}
      {prescriptions.length > 0 && (
        <div className="pending-section">
          <h2>Pending Prescriptions</h2>
          <div className="prescription-list">
            {prescriptions.slice(0, 5).map(rx => (
              <div key={rx.prescription_id} className="prescription-card">
                <div className="rx-header">
                  <h3>{rx.diagnosis}</h3>
                  <span className="rx-status draft">Draft</span>
                </div>
                <div className="rx-details">
                  <p><strong>Farm:</strong> {rx.farm_name}</p>
                  <p><strong>Entity:</strong> {rx.entity_id}</p>
                  <p><strong>Medicine:</strong> {rx.medicine}</p>
                </div>
                <div className="rx-actions">
                  <button
                    className="btn-small primary"
                    onClick={() => navigate(`/vet/prescription/${rx.prescription_id}/edit`)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-small success"
                    onClick={() => handleApprovePrescription(rx.prescription_id)}
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assigned Farms */}
      <div className="farms-section">
        <h2>Assigned Farms</h2>
        <div className="farms-grid">
          {farms.slice(0, 6).map(farm => (
            <div
              key={farm.farm_id}
              className="farm-card"
              onClick={() => navigate(`/vet/farm/${farm.farm_id}`)}
            >
              <div className="farm-name">{farm.farm_name}</div>
              <div className="farm-location">
                📍 {farm.farmer_name}
              </div>
              <button className="btn-view">View Details →</button>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="recommendations-section">
        <h2>Stewardship Recommendations</h2>
        <div className="recommendation-cards">
          <div className="recommendation-card">
            <div className="rec-icon">💊</div>
            <h3>Minimize Critical Drug Use</h3>
            <p>Reduce use of WHO-classified critically important antimicrobials by 20% this month.</p>
          </div>

          <div className="recommendation-card">
            <div className="rec-icon">📊</div>
            <h3>Monitor High-Risk Farms</h3>
            <p>5 farms in your jurisdiction show elevated AMU. Schedule visits for compliance review.</p>
          </div>

          <div className="recommendation-card">
            <div className="rec-icon">🔍</div>
            <h3>MRL Testing Program</h3>
            <p>Recommend testing for borderline MRL cases to ensure product safety.</p>
          </div>
        </div>
      </div>
    </div>
  );

  async function handleApprovePrescription(prescriptionId) {
    try {
      await api.put(`/prescriptions/${prescriptionId}/approve`);
      fetchVetData();
    } catch (error) {
      console.error('Error approving prescription:', error);
    }
  }
};

export default VetDashboard;
