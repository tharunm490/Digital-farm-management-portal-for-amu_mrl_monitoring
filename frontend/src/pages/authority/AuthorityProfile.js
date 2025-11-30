import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './AuthorityProfile.css';

const AuthorityProfile = () => {
  const { user, logout } = useAuth();
  const [profileData, setProfileData] = useState({
    email: user?.email || '',
    phone: '',
    display_name: user?.display_name || '',
    department: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/authority/profile');
        setProfileData({
          email: response.data.email || user?.email || '',
          phone: response.data.phone || '',
          display_name: response.data.display_name || user?.display_name || '',
          department: response.data.department || ''
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setFetchLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

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