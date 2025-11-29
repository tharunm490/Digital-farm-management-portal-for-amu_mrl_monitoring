import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import Navigation from '../components/Navigation';
import Chatbot from '../components/Chatbot';
import Weather from '../components/Weather';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const getWeatherLocation = () => {
    if (user?.state && user?.district) {
      return `${user.district}, ${user.state}`;
    }
    return 'Delhi, India'; // Default location
  };

  return (
    <div className={`dashboard-container ${user?.role === 'veterinarian' ? 'vet-theme' : ''}`}>
      <Navigation />

      <div className="dashboard-content">
        <div className="welcome-section">
          <h2>{t('welcome_name').replace('{name}', user?.role === 'veterinarian' ? user?.vet_name : user?.display_name)}</h2>
          <p>{user?.role === 'veterinarian' ? t('manage_treatment_requests') : t('manage_farms_animals')}</p>
        </div>

        <div className="dashboard-grid">
          {user?.role === 'farmer' && (
            <>
              <div className="dashboard-card" onClick={() => navigate('/farms')}>
                <div className="card-icon">🏡</div>
                <h3>{t('my_farms')}</h3>
                <p>{t('view_manage_farms')}</p>
              </div>

              <div className="dashboard-card" onClick={() => navigate('/add-farm')}>
                <div className="card-icon">➕</div>
                <h3>{t('add_farm')}</h3>
                <p>{t('register_new_farm')}</p>
              </div>

              <div className="dashboard-card" onClick={() => navigate('/animals')}>
                <div className="card-icon">🐄</div>
                <h3>{t('animals')}</h3>
                <p>{t('manage_animal_records')}</p>
              </div>

              <div className="dashboard-card" onClick={() => navigate('/treatments')}>
                <div className="card-icon">💊</div>
                <h3>{t('treatments')}</h3>
                <p>{t('record_track_treatments')}</p>
              </div>

              <div className="dashboard-card" onClick={() => navigate('/qr-generator')}>
                <div className="card-icon">📱</div>
                <h3>{t('qr_codes')}</h3>
                <p>{t('generate_traceability_qr')}</p>
              </div>

              <div className="dashboard-card" onClick={() => navigate('/profile')}>
                <div className="card-icon">👤</div>
                <h3>{t('profile')}</h3>
                <p>{t('update_information')}</p>
              </div>

              <Weather location={getWeatherLocation()} />
            </>
          )}

          {user?.role === 'authority' && (
            <>
              <div className="dashboard-card" onClick={() => navigate('/dashboard')}>
                <div className="card-icon">📊</div>
                <h3>Dashboard</h3>
                <p>View main dashboard</p>
              </div>

              <div className="dashboard-card" onClick={() => navigate('/amu-analytics')}>
                <div className="card-icon">📈</div>
                <h3>AMU Analytics</h3>
                <p>Analyze antimicrobial usage data</p>
              </div>

              <div className="dashboard-card" onClick={() => navigate('/heat-map')}>
                <div className="card-icon">🌡️</div>
                <h3>Heat Map</h3>
                <p>View usage heat maps</p>
              </div>

              <div className="dashboard-card" onClick={() => navigate('/india-map')}>
                <div className="card-icon">🗺️</div>
                <h3>India Map</h3>
                <p>Geographic data visualization</p>
              </div>

              <div className="dashboard-card" onClick={() => navigate('/complaints-alerts')}>
                <div className="card-icon">🚨</div>
                <h3>Complaints & Alerts</h3>
                <p>Manage complaints and alerts</p>
              </div>

              <div className="dashboard-card" onClick={() => navigate('/reports')}>
                <div className="card-icon">📋</div>
                <h3>Reports</h3>
                <p>Generate compliance reports</p>
              </div>

              <div className="dashboard-card" onClick={() => navigate('/notifications')}>
                <div className="card-icon">🔔</div>
                <h3>Notifications</h3>
                <p>View system notifications</p>
              </div>

              <div className="dashboard-card" onClick={() => navigate('/profile')}>
                <div className="card-icon">👤</div>
                <h3>Profile</h3>
                <p>Update your information</p>
              </div>

              <Weather location={getWeatherLocation()} />
            </>
          )}

          {user?.role === 'veterinarian' && (
            <>
              <div className="dashboard-card" onClick={() => navigate('/treatment-requests')}>
                <div className="card-icon">📋</div>
                <h3>Treatment Requests</h3>
                <p>Review and approve treatment requests</p>
              </div>

              <div className="dashboard-card" onClick={() => navigate('/treatments')}>
                <div className="card-icon">💊</div>
                <h3>Treatments</h3>
                <p>Record and track treatments</p>
              </div>

              <div className="dashboard-card" onClick={() => navigate('/vaccinations')}>
                <div className="card-icon">💉</div>
                <h3>Vaccinations</h3>
                <p>Manage vaccination schedules</p>
              </div>

              <div className="dashboard-card" onClick={() => navigate('/profile')}>
                <div className="card-icon">👤</div>
                <h3>Profile</h3>
                <p>Update your information</p>
              </div>

              <Weather location={getWeatherLocation()} />
            </>
          )}
        </div>
      </div>

      <Chatbot />
    </div>
  );
};

export default Dashboard;
