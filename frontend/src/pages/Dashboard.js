import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navigation from '../components/Navigation';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="dashboard-container">
      <Navigation />

      <div className="dashboard-content">
        <div className="welcome-section">
          <h2>Welcome, {user?.full_name}!</h2>
          <p>Manage your farms, animals, and treatment records</p>
        </div>

        <div className="dashboard-grid">
          {user?.role === 'farmer' && (
            <>
              <div className="dashboard-card" onClick={() => navigate('/farms')}>
                <div className="card-icon">🏡</div>
                <h3>My Farms</h3>
                <p>View and manage your farms</p>
              </div>

              <div className="dashboard-card" onClick={() => navigate('/add-farm')}>
                <div className="card-icon">➕</div>
                <h3>Add Farm</h3>
                <p>Register a new farm</p>
              </div>

              <div className="dashboard-card" onClick={() => navigate('/animals')}>
                <div className="card-icon">🐄</div>
                <h3>Animals</h3>
                <p>Manage animal records</p>
              </div>

              <div className="dashboard-card" onClick={() => navigate('/treatments')}>
                <div className="card-icon">💊</div>
                <h3>Treatments</h3>
                <p>Record and track treatments</p>
              </div>

              <div className="dashboard-card" onClick={() => navigate('/qr-generator')}>
                <div className="card-icon">📱</div>
                <h3>QR Codes</h3>
                <p>Generate traceability QR codes</p>
              </div>

              <div className="dashboard-card" onClick={() => navigate('/profile')}>
                <div className="card-icon">👤</div>
                <h3>Profile</h3>
                <p>Update your information</p>
              </div>
            </>
          )}

          {user?.role === 'authority' && (
            <>
              <div className="dashboard-card" onClick={() => navigate('/farms')}>
                <div className="card-icon">🏡</div>
                <h3>All Farms</h3>
                <p>View all registered farms</p>
              </div>

              <div className="dashboard-card" onClick={() => navigate('/animals')}>
                <div className="card-icon">🐄</div>
                <h3>All Animals</h3>
                <p>Monitor all animal records</p>
              </div>

              <div className="dashboard-card" onClick={() => navigate('/treatments')}>
                <div className="card-icon">💊</div>
                <h3>Treatments</h3>
                <p>Review treatment records</p>
              </div>

              <div className="dashboard-card" onClick={() => navigate('/verify')}>
                <div className="card-icon">🔍</div>
                <h3>QR Verification</h3>
                <p>Verify traceability codes</p>
              </div>

              <div className="dashboard-card">
                <div className="card-icon">📊</div>
                <h3>Reports</h3>
                <p>Generate compliance reports</p>
              </div>

              <div className="dashboard-card" onClick={() => navigate('/profile')}>
                <div className="card-icon">👤</div>
                <h3>Profile</h3>
                <p>Update your information</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
