import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './RoleSelection.css';

const RoleSelection = () => {
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState('farmer');
  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    state: '',
    district: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update profile with role
      await axios.put(
        `${process.env.REACT_APP_API_URL || '/api'}/auth/profile`,
        {
          ...formData,
          role
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Store token
      localStorage.setItem('token', token);
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Role selection error:', error);
      alert('Failed to set role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="role-selection-container">
        <div className="error-box">
          <h2>Invalid Access</h2>
          <p>Please login again</p>
          <button onClick={() => navigate('/login')}>Go to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="role-selection-container">
      <div className="role-selection-box">
        <h1>Complete Your Profile</h1>
        <p>Please select your role to continue</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>I am a *</label>
            <div className="role-buttons">
              <button
                type="button"
                className={`role-btn ${role === 'farmer' ? 'active' : ''}`}
                onClick={() => setRole('farmer')}
              >
                🌾 Farmer
              </button>
              <button
                type="button"
                className={`role-btn ${role === 'authority' ? 'active' : ''}`}
                onClick={() => setRole('authority')}
              >
                👮 Authority
              </button>
            </div>
          </div>

          {role === 'farmer' && (
            <>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter your phone number"
                />
              </div>

              <div className="form-group">
                <label>Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter your address"
                  rows="2"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="State"
                  />
                </div>

                <div className="form-group">
                  <label>District</label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    placeholder="District"
                  />
                </div>
              </div>
            </>
          )}

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Setting up...' : 'Continue to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RoleSelection;
