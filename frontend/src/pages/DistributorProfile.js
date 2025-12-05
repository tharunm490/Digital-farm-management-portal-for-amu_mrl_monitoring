import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getAllStates, getDistrictsByState } from '../data/statesDistricts';
import './DistributorProfile.css';

const DistributorProfile = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [formData, setFormData] = useState({
    distributor_name: '',
    company_name: '',
    phone: '',
    email: '',
    license_number: '',
    gst_number: '',
    address: '',
    state: '',
    district: '',
    taluk: ''
  });

  const states = getAllStates();
  const districts = formData.state ? getDistrictsByState(formData.state) : [];

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/distributor/profile');
      const profile = response.data;
      
      setFormData({
        distributor_name: profile.distributor_name || user?.display_name || '',
        company_name: profile.company_name === 'To be updated' ? '' : (profile.company_name || ''),
        phone: profile.phone === 'To be updated' ? '' : (profile.phone || ''),
        email: profile.email || user?.email || '',
        license_number: profile.license_number || '',
        gst_number: profile.gst_number || '',
        address: profile.address || '',
        state: profile.state || '',
        district: profile.district || '',
        taluk: profile.taluk || ''
      });
    } catch (err) {
      // Profile might not exist yet
      setFormData(prev => ({
        ...prev,
        distributor_name: user?.display_name || '',
        email: user?.email || ''
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'state') {
      setFormData({ ...formData, state: value, district: '', taluk: '' });
    } else if (name === 'district') {
      setFormData({ ...formData, district: value, taluk: '' });
    } else if (name === 'phone') {
      // Only allow digits, max 10
      setFormData({ ...formData, [name]: value.replace(/\D/g, '').slice(0, 10) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    
    // Validate required fields
    if (!formData.distributor_name || !formData.company_name || !formData.phone) {
      setMessage({ type: 'error', text: 'Distributor name, company name, and phone are required.' });
      return;
    }
    
    if (formData.phone.length !== 10) {
      setMessage({ type: 'error', text: 'Phone number must be 10 digits.' });
      return;
    }

    setSaving(true);
    try {
      const response = await api.put('/distributor/profile', formData);
      
      // Update user context with new info
      if (response.data.distributor) {
        const updatedUser = { 
          ...user, 
          ...response.data.distributor,
          display_name: formData.distributor_name 
        };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // Redirect to dashboard after short delay
      setTimeout(() => {
        navigate('/distributor');
      }, 1500);
      
    } catch (err) {
      console.error('Failed to update profile:', err);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="distributor-profile-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  const isNewProfile = !formData.company_name || formData.company_name === 'To be updated';

  return (
    <div className="distributor-profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <button onClick={() => navigate('/distributor')} className="btn-back">
            ← Back to Dashboard
          </button>
          <h1>{isNewProfile ? '🚚 Complete Your Profile' : '👤 Edit Profile'}</h1>
          <p>{isNewProfile 
            ? 'Please fill in your distributor details to start verifying products' 
            : 'Update your distributor information'}
          </p>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="profile-form">
          {/* Required Section */}
          <div className="form-section">
            <h3>Required Information</h3>
            
            <div className="form-group">
              <label>Distributor Name *</label>
              <input
                type="text"
                name="distributor_name"
                value={formData.distributor_name}
                onChange={handleChange}
                placeholder="Your full name"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Company Name *</label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                placeholder="e.g., ABC Dairy Products Pvt Ltd"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                maxLength="10"
                required
              />
              <span className="input-hint">{formData.phone.length}/10 digits</span>
            </div>
          </div>

          {/* Business Details */}
          <div className="form-section">
            <h3>Business Details</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>License Number</label>
                <input
                  type="text"
                  name="license_number"
                  value={formData.license_number}
                  onChange={handleChange}
                  placeholder="Business license number (optional)"
                />
              </div>
              
              <div className="form-group">
                <label>GST Number</label>
                <input
                  type="text"
                  name="gst_number"
                  value={formData.gst_number}
                  onChange={handleChange}
                  placeholder="e.g., 22AAAAA0000A1Z5"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="business@example.com"
              />
            </div>
          </div>

          {/* Address Section */}
          <div className="form-section">
            <h3>Address</h3>
            
            <div className="form-group">
              <label>Full Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Street address, building, landmark..."
                rows={3}
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
            
            <div className="form-group">
              <label>Taluk / Tehsil</label>
              <input
                type="text"
                name="taluk"
                value={formData.taluk}
                onChange={handleChange}
                placeholder="Enter taluk/tehsil"
                disabled={!formData.district}
              />
            </div>
          </div>

          {/* Role Info */}
          <div className="role-info-box">
            <span className="role-icon">🔒</span>
            <div>
              <strong>Role: Distributor</strong>
              <p>Your role is locked and cannot be changed after registration.</p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="form-actions">
            <button 
              type="submit" 
              className="btn-save"
              disabled={saving}
            >
              {saving ? 'Saving...' : (isNewProfile ? 'Complete Profile' : 'Save Changes')}
            </button>
            
            <button 
              type="button" 
              onClick={() => navigate('/distributor')}
              className="btn-cancel"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DistributorProfile;
