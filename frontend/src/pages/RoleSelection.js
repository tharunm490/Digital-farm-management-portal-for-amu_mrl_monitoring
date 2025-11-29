import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import indiaData from '../data/indiaLocations';
import './RoleSelection.css';

const RoleSelection = () => {
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState('farmer');
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    state: '',
    district: '',
    vet_name: '',
    license_number: '',
    taluk: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const handleStateChange = (e) => {
    const state = e.target.value;
    setSelectedState(state);
    setSelectedDistrict('');
    setFormData({ ...formData, state, district: '', taluk: '' });
  };

  const handleDistrictChange = (e) => {
    const district = e.target.value;
    setSelectedDistrict(district);
    setFormData({ ...formData, district, taluk: '' });
  };

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
              <button
                type="button"
                className={`role-btn ${role === 'veterinarian' ? 'active' : ''}`}
                onClick={() => setRole('veterinarian')}
              >
                🩺 Veterinarian
              </button>
            </div>
          </div>

          {(role === 'farmer' || role === 'veterinarian') && (
            <>
              {role === 'veterinarian' && (
                <>
                  <div className="form-group">
                    <label>Veterinarian Name</label>
                    <input
                      type="text"
                      value={formData.vet_name}
                      onChange={(e) => setFormData({ ...formData, vet_name: e.target.value })}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>License Number</label>
                    <input
                      type="text"
                      value={formData.license_number}
                      onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                      placeholder="Enter your veterinary license number"
                      required
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter your phone number"
                  required
                />
              </div>

              <div className="form-group">
                <label>Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter your address"
                  rows="2"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>State</label>
                  <select
                    value={selectedState}
                    onChange={handleStateChange}
                    required
                  >
                    <option value="">Select State</option>
                    {Object.keys(indiaData).map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>District</label>
                  <select
                    value={selectedDistrict}
                    onChange={handleDistrictChange}
                    required
                    disabled={!selectedState}
                  >
                    <option value="">Select District</option>
                    {selectedState && indiaData[selectedState] && Object.keys(indiaData[selectedState]).map(district => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                </div>
              </div>

              {role === 'veterinarian' && (
                <div className="form-group">
                  <label>Taluk</label>
                  <select
                    value={formData.taluk}
                    onChange={(e) => setFormData({ ...formData, taluk: e.target.value })}
                    required
                    disabled={!selectedDistrict}
                  >
                    <option value="">Select Taluk</option>
                    {selectedState && selectedDistrict && indiaData[selectedState][selectedDistrict] && indiaData[selectedState][selectedDistrict].map(taluk => (
                      <option key={taluk} value={taluk}>{taluk}</option>
                    ))}
                  </select>
                </div>
              )}
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
