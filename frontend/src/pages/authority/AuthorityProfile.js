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
  const [stats, setStats] = useState({
    totalFarms: 0,
    totalTreatments: 0,
    totalAntibiotics: 0,
    unsafeMRLCases: 0,
    highRiskFarms: 0,
    activeVets: 0
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    fetchProfileData();
    fetchProfileStats();
  }, [user]);

  const fetchProfileData = async () => {
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

  const fetchProfileStats = async () => {
    try {
      const [farmsRes, treatmentsRes, amuRes, alertsRes, vetsRes] = await Promise.all([
        api.get('/authority/stats/farms'),
        api.get('/authority/stats/treatments'),
        api.get('/authority/stats/amu'),
        api.get('/authority/stats/alerts'),
        api.get('/authority/stats/veterinarians')
      ]);

      setStats({
        totalFarms: farmsRes.data.totalFarms || 0,
        totalTreatments: treatmentsRes.data.totalTreatments || 0,
        totalAntibiotics: amuRes.data.totalAntibiotics || 0,
        unsafeMRLCases: alertsRes.data.unsafeMRLCases || 0,
        highRiskFarms: alertsRes.data.highRiskFarms || 0,
        activeVets: vetsRes.data.activeVets || 0
      });
    } catch (error) {
      console.error('Error fetching profile stats:', error);
    }
  };

  const getDistricts = () => {
    if (profileData.state && indiaData[profileData.state]) {
      return Object.keys(indiaData[profileData.state]);
    }
    return [];
  };

  const getTaluks = () => {
    if (profileData.state && profileData.district && 
        indiaData[profileData.state] && 
        indiaData[profileData.state][profileData.district]) {
      return indiaData[profileData.state][profileData.district];
    }
    return [];
  };

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
      fetchProfileData();
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
      alert('New password and confirm password do not match!');
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
      alert(error.response?.data?.error || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="authority-profile">
        <div className="profile-loading">
          <div className="spinner-icon">⏳</div>
          <p>Loading profile data...</p>
        </div>
      </div>
    );
  }

  if (fetchLoading) {
    return (
      <div className="authority-profile">
        <div className="profile-loading">
          <div className="spinner-icon">⏳</div>
          <p>Loading profile data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="authority-profile">
      <div className="profile-header">
        <div className="profile-header-content">
          <div className="profile-avatar">
            <div className="avatar-icon">👤</div>
            <div className="avatar-badge">🏛️</div>
          </div>
          <div className="profile-header-info">
            <h1>{profileData.display_name || 'Authority User'}</h1>
            <p className="profile-role">Authority Officer</p>
          </div>
        </div>
      </div>

      {/* Stats Flash Cards */}
      <div className="profile-stats-grid">
        <div className="profile-stat-card">
          <div className="stat-card-icon">🏡</div>
          <div className="stat-card-content">
            <div className="stat-card-value">{stats.totalFarms.toLocaleString()}</div>
            <div className="stat-card-label">Registered Farms</div>
          </div>
        </div>

        <div className="profile-stat-card">
          <div className="stat-card-icon">💊</div>
          <div className="stat-card-content">
            <div className="stat-card-value">{stats.totalTreatments.toLocaleString()}</div>
            <div className="stat-card-label">Total Treatments</div>
          </div>
        </div>

        <div className="profile-stat-card">
          <div className="stat-card-icon">🧪</div>
          <div className="stat-card-content">
            <div className="stat-card-value">{stats.totalAntibiotics.toLocaleString()}</div>
            <div className="stat-card-label">Antibiotics Used</div>
          </div>
        </div>

        <div className="profile-stat-card">
          <div className="stat-card-icon">⚠️</div>
          <div className="stat-card-content">
            <div className="stat-card-value">{stats.unsafeMRLCases.toLocaleString()}</div>
            <div className="stat-card-label">Unsafe MRL Cases</div>
          </div>
        </div>

        <div className="profile-stat-card">
          <div className="stat-card-icon">🚨</div>
          <div className="stat-card-content">
            <div className="stat-card-value">{stats.highRiskFarms.toLocaleString()}</div>
            <div className="stat-card-label">High Risk Farms</div>
          </div>
        </div>

        <div className="profile-stat-card">
          <div className="stat-card-icon">👨‍⚕️</div>
          <div className="stat-card-content">
            <div className="stat-card-value">{stats.activeVets.toLocaleString()}</div>
            <div className="stat-card-label">Active Veterinarians</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="profile-tabs">
        <button 
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <span className="tab-icon">📝</span>
          Profile Information
        </button>
        <button 
          className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <span className="tab-icon">🔒</span>
          Security Settings
        </button>
      </div>

      {/* Profile Content */}
      <div className="profile-content">
        {activeTab === 'profile' ? (
          <div className="profile-form-card">
            <div className="form-card-header">
              <h2>👤 Personal Information</h2>
              <p>Manage your profile details and jurisdiction</p>
            </div>
            <form onSubmit={handleProfileUpdate} className="profile-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>📧 Email Address</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    disabled
                    className="input-disabled"
                  />
                  <small className="form-hint">Email cannot be changed</small>
                </div>

                <div className="form-group">
                  <label>📱 Phone Number</label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    placeholder="Enter phone number"
                    pattern="[0-9]{10}"
                  />
                </div>

                <div className="form-group">
                  <label>👤 Display Name</label>
                  <input
                    type="text"
                    value={profileData.display_name}
                    onChange={(e) => setProfileData({ ...profileData, display_name: e.target.value })}
                    placeholder="Enter display name"
                  />
                </div>

                <div className="form-group">
                  <label>🏛️ Department</label>
                  <input
                    type="text"
                    value={profileData.department}
                    onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                    placeholder="e.g., Animal Husbandry Department"
                  />
                </div>

                <div className="form-group">
                  <label>💼 Designation</label>
                  <select
                    value={profileData.designation}
                    onChange={(e) => setProfileData({ ...profileData, designation: e.target.value })}
                  >
                    <option value="">Select Designation</option>
                    <option value="District Veterinary Officer">District Veterinary Officer</option>
                    <option value="Deputy Director">Deputy Director</option>
                    <option value="Joint Director">Joint Director</option>
                    <option value="Director">Director</option>
                    <option value="Commissioner">Commissioner</option>
                    <option value="Inspector">Inspector</option>
                    <option value="Compliance Officer">Compliance Officer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>📍 State</label>
                  <select
                    value={profileData.state}
                    onChange={handleStateChange}
                  >
                    <option value="">Select State</option>
                    {Object.keys(indiaData).map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>🏙️ District</label>
                  <select
                    value={profileData.district}
                    onChange={handleDistrictChange}
                    disabled={!profileData.state}
                  >
                    <option value="">Select District</option>
                    {getDistricts().map(district => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>🏘️ Taluk</label>
                  <select
                    value={profileData.taluk}
                    onChange={(e) => setProfileData({ ...profileData, taluk: e.target.value })}
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
                <button 
                  type="submit" 
                  className="btn-save" 
                  disabled={loading}
                >
                  {loading ? '⏳ Updating...' : '💾 Save Changes'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="profile-form-card">
            <div className="form-card-header">
              <h2>🔒 Change Password</h2>
              <p>Update your password to keep your account secure</p>
            </div>
            <form onSubmit={handlePasswordChange} className="profile-form">
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>🔑 Current Password</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>🔐 New Password</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Enter new password"
                    required
                    minLength="8"
                  />
                  <small className="form-hint">Minimum 8 characters</small>
                </div>

                <div className="form-group">
                  <label>✅ Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn-save" 
                  disabled={loading}
                >
                  {loading ? '⏳ Updating...' : '🔒 Change Password'}
                </button>
              </div>
            </form>

            <div className="security-tips">
              <h3>🛡️ Security Tips</h3>
              <ul>
                <li>Use a strong password with a mix of letters, numbers, and symbols</li>
                <li>Never share your password with anyone</li>
                <li>Change your password regularly</li>
                <li>Use different passwords for different accounts</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthorityProfile;