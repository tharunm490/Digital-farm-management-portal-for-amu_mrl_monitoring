import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Navigation from '../../components/Navigation';
import { getStates, getDistricts, getTaluks } from '../../utils/locations';

const LaboratoryProfile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    lab_name: '',
    license_number: '',
    phone: '',
    email: '',
    state: '',
    district: '',
    taluk: '',
    address: ''
  });

  useEffect(() => {
    fetchLabProfile();
  }, []);

  const fetchLabProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/labs/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Response is not JSON:', contentType);
        setError('Server returned invalid response. Please try again.');
        return;
      }

      const data = await response.json();
      setFormData({
        lab_name: data.lab_name || '',
        license_number: data.license_number || '',
        phone: data.phone || '',
        email: data.email || '',
        state: data.state || '',
        district: data.district || '',
        taluk: data.taluk || '',
        address: data.address || ''
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/labs/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        setFormData({
          lab_name: result.lab.lab_name || '',
          license_number: result.lab.license_number || '',
          phone: result.lab.phone || '',
          email: result.lab.email || '',
          state: result.lab.state || '',
          district: result.lab.district || '',
          taluk: result.lab.taluk || '',
          address: result.lab.address || ''
        });
        setSuccess('Profile updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <Navigation />
      
      <div className="mt-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">👤 Laboratory Profile</h1>
          <p className="text-gray-600">Manage your laboratory details and registration information</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              <p className="mt-4 text-gray-600">Loading profile...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Header Information */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Laboratory Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Lab Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Laboratory Name *
                    </label>
                    <input
                      type="text"
                      name="lab_name"
                      value={formData.lab_name}
                      onChange={handleChange}
                      required
                      placeholder="e.g., ABC Veterinary Lab"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                    />
                  </div>

                  {/* License Number */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      License Number *
                    </label>
                    <input
                      type="text"
                      name="license_number"
                      value={formData.license_number}
                      onChange={handleChange}
                      required
                      placeholder="e.g., LIC-2024-001"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="lab@example.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      placeholder="10-digit number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Location Information */}
              <div className="border-t pt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Location Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* State */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      State *
                    </label>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={(e) => {
                        setFormData({ ...formData, state: e.target.value, district: '', taluk: '' });
                      }}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                    >
                      <option value="">-- Select State --</option>
                      {getStates().map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>

                  {/* District */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      District *
                    </label>
                    <select
                      name="district"
                      value={formData.district}
                      onChange={(e) => {
                        setFormData({ ...formData, district: e.target.value, taluk: '' });
                      }}
                      required
                      disabled={!formData.state}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                    >
                      <option value="">-- Select District --</option>
                      {formData.state && getDistricts(formData.state).map(district => (
                        <option key={district} value={district}>{district}</option>
                      ))}
                    </select>
                  </div>

                  {/* Taluk */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Taluk
                    </label>
                    <select
                      name="taluk"
                      value={formData.taluk}
                      onChange={(e) => {
                        setFormData({ ...formData, taluk: e.target.value });
                      }}
                      disabled={!formData.district}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                    >
                      <option value="">-- Select Taluk --</option>
                      {formData.district && getTaluks(formData.state, formData.district).map(taluk => (
                        <option key={taluk} value={taluk}>{taluk}</option>
                      ))}
                    </select>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Street address"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="border-t pt-8 flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-3 px-4 rounded-lg hover:shadow-lg transition disabled:opacity-50"
                >
                  {saving ? '💾 Saving...' : '✅ Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={fetchLabProfile}
                  className="flex-1 bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg hover:shadow-lg transition"
                >
                  🔄 Reset
                </button>
              </div>
            </form>
          )}
        </div>

        {/* User Account Info */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600">User Display Name</p>
              <p className="font-semibold text-gray-900">{user?.display_name}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-semibold text-gray-900">{user?.email}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600">Role</p>
              <p className="font-semibold text-gray-900 capitalize">{user?.role}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600">User ID</p>
              <p className="font-semibold text-gray-900">#{user?.user_id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaboratoryProfile;
