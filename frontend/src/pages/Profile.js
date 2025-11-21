import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navigation from '../components/Navigation';
import api from '../services/api';
import { getAllStates, getDistrictsByState } from '../data/statesDistricts';
import './Profile.css';

const Profile = () => {
  const { user, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    state: '',
    district: ''
  });

  const states = getAllStates();
  const districts = formData.state ? getDistrictsByState(formData.state) : [];

  // Format date as DD/MM/YYYY
  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        state: user.state || '',
        district: user.district || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'state') {
      setFormData({ ...formData, state: value, district: '' });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await api.put('/auth/profile', formData);
      
      // Update user context
      if (response.data.user) {
        setUser(response.data.user);
        
        // Also update localStorage to persist changes
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = { ...currentUser, ...response.data.user };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      setMessage('Profile updated successfully!');
      setEditing(false);
    } catch (error) {
      console.error('Profile update error:', error);
      setMessage(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <Navigation />
      
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar">
            <span className="avatar-icon">👤</span>
          </div>
          <div className="profile-info">
            <h1>{user?.full_name}</h1>
            <p className="role-badge">{user?.role}</p>
          </div>
        </div>

        {message && (
          <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <div className="profile-content">
          <div className="profile-card">
            <div className="card-header">
              <h2>Personal Information</h2>
              {!editing && (
                <button onClick={() => setEditing(true)} className="btn-edit">
                  Edit Profile
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSubmit} className="profile-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled
                  />
                </div>

                {user?.role === 'farmer' && (
                  <>
                    <div className="form-group">
                      <label>Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Address</label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        rows="3"
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>State</label>
                        <select
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                        >
                          <option value="">Select State</option>
                          {states.map(state => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>District</label>
                        <select
                          name="district"
                          value={formData.district}
                          onChange={handleChange}
                          disabled={!formData.state}
                        >
                          <option value="">Select District</option>
                          {districts.map(district => (
                            <option key={district} value={district}>{district}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <div className="form-actions">
                  <button type="submit" className="btn-save" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="btn-cancel"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-details">
                <div className="detail-item">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{user?.email}</span>
                </div>

                {user?.role === 'farmer' && (
                  <>
                    <div className="detail-item">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">{user?.phone || 'Not provided'}</span>
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Address:</span>
                      <span className="detail-value">{user?.address || 'Not provided'}</span>
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Location:</span>
                      <span className="detail-value">
                        {user?.district && user?.state 
                          ? `${user.district}, ${user.state}` 
                          : 'Not provided'}
                      </span>
                    </div>
                  </>
                )}

                <div className="detail-item">
                  <span className="detail-label">Account Type:</span>
                  <span className="detail-value">{user?.auth_provider || 'Local'}</span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Member Since:</span>
                  <span className="detail-value">
                    {user?.created_at ? formatDate(user.created_at) : 'N/A'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
