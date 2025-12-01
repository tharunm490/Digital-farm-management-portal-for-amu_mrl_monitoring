import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import indiaData from '../../data/indiaLocations';
import './AuthorityProfile.css';

const AuthorityProfile = () => {
  const { user, logout } = useAuth();
  const [profileData, setProfileData] = useState({
    email: user?.email || '',
    phone: '',
    display_name: user?.display_name || '',
    department: '',
    designation: '',
    state: '',
    district: '',
    taluk: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  // Get available districts based on selected state
  const getDistricts = () => {
    if (profileData.state && indiaData[profileData.state]) {
      return Object.keys(indiaData[profileData.state]);
    }
    return [];
  };

  // Get available taluks based on selected district
  const getTaluks = () => {
    if (profileData.state && profileData.district && 
        indiaData[profileData.state] && 
        indiaData[profileData.state][profileData.district]) {
      return indiaData[profileData.state][profileData.district];
    }
    return [];
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/authority/profile');
        setProfileData({
          email: response.data.email || user?.email || '',
          phone: response.data.phone || '',
          display_name: response.data.display_name || user?.display_name || '',
          department: response.data.department || '',
          designation: response.data.designation || '',
          state: response.data.state || '',
          district: response.data.district || '',
          taluk: response.data.taluk || ''
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setFetchLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // Handle state change - reset district and taluk
  const handleStateChange = (e) => {
    setProfileData(prev => ({
      ...prev,
      state: e.target.value,
      district: '',
      taluk: ''
    }));
  };

  // Handle district change - reset taluk
  const handleDistrictChange = (e) => {
    setProfileData(prev => ({
      ...prev,
      district: e.target.value,
      taluk: ''
    }));
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/authority/profile', profileData);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }

    setLoading(true);
    try {
      await api.put('/authority/profile/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      alert('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Failed to change password. Please check your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authority-profile">
      <div className="profile-header">
        <h1>👤 Authority Profile</h1>
        <p>Manage your account settings and preferences</p>
      </div>

      <div className="profile-content">
        {fetchLoading ? (
          <div className="loading-spinner">Loading profile...</div>
        ) : (
          <>
            <div className="profile-sidebar">
              <div className="profile-avatar">
                <div className="avatar-circle">
                  <span className="avatar-initials">
                    {profileData.display_name ? profileData.display_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'A'}
                  </span>
                </div>
                <h3>{profileData.display_name || 'Authority User'}</h3>
              </div>

              <div className="profile-info">
                <h3>Profile Information</h3>
                <div className="info-item">
                  <span className="info-label">Email</span>
                  <span className="info-value">{profileData.email}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Phone</span>
                  <span className="info-value">{profileData.phone || 'Not provided'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Department</span>
                  <span className="info-value">{profileData.department || 'Not specified'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Designation</span>
                  <span className="info-value">{profileData.designation || 'Not specified'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Location</span>
                  <span className="info-value">
                    {[profileData.state, profileData.district, profileData.taluk]
                      .filter(Boolean).join(' → ') || 'Not specified'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Role</span>
                  <span className="info-value">Authority</span>
                </div>
              </div>
            </div>

            <div className="profile-main">
              <div className="profile-section">
                <div className="section-header">
                  <h2>Edit Profile</h2>
                </div>
                <form onSubmit={handleProfileUpdate} className="profile-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="display_name">Full Name</label>
                      <input
                        type="text"
                        id="display_name"
                        value={profileData.display_name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, display_name: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="email">Email Address</label>
                      <input
                        type="email"
                        id="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="phone">Phone Number</label>
                      <input
                        type="tel"
                        id="phone"
                        value={profileData.phone}
                        onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="department">Department</label>
                      <input
                        type="text"
                        id="department"
                        value={profileData.department}
                        onChange={(e) => setProfileData(prev => ({ ...prev, department: e.target.value }))}
                        placeholder="e.g., Animal Husbandry, Agriculture"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="designation">Designation</label>
                      <input
                        type="text"
                        id="designation"
                        value={profileData.designation}
                        onChange={(e) => setProfileData(prev => ({ ...prev, designation: e.target.value }))}
                        placeholder="e.g., District Officer, Veterinary Inspector"
                      />
                    </div>
                  </div>

                  <div className="form-section-divider">
                    <h3>📍 Jurisdiction Location</h3>
                    <p className="section-hint">Select your area of authority/jurisdiction</p>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="state">State *</label>
                      <select
                        id="state"
                        value={profileData.state}
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
                      <label htmlFor="district">District *</label>
                      <select
                        id="district"
                        value={profileData.district}
                        onChange={handleDistrictChange}
                        required
                        disabled={!profileData.state}
                      >
                        <option value="">Select District</option>
                        {getDistricts().map(district => (
                          <option key={district} value={district}>{district}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="taluk">Taluk *</label>
                      <select
                        id="taluk"
                        value={profileData.taluk}
                        onChange={(e) => setProfileData(prev => ({ ...prev, taluk: e.target.value }))}
                        required
                        disabled={!profileData.district}
                      >
                        <option value="">Select Taluk</option>
                        {getTaluks().map(taluk => (
                          <option key={taluk} value={taluk}>{taluk}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="save-button" disabled={loading}>
                      {loading ? 'Updating...' : 'Update Profile'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="profile-section">
                <div className="section-header">
                  <h2>Change Password</h2>
                </div>
                <form onSubmit={handlePasswordChange} className="password-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="currentPassword">Current Password</label>
                      <input
                        type="password"
                        id="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="newPassword">New Password</label>
                      <input
                        type="password"
                        id="newPassword"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        required
                        minLength="6"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="confirmPassword">Confirm New Password</label>
                      <input
                        type="password"
                        id="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        required
                        minLength="6"
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="save-button" disabled={loading}>
                      {loading ? 'Changing...' : 'Change Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthorityProfile;