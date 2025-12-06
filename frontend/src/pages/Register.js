import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllStates, getDistrictsByState } from '../data/statesDistricts';
import { getTaluksByDistrict } from '../data/taluks';
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    aadhaar_number: '',
    phone: '',
    email: '',
    state: '',
    district: '',
    taluk: '',
    address: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { registerFarmer } = useAuth();

  const states = getAllStates();
  const districts = formData.state ? getDistrictsByState(formData.state) : [];
  const taluks = (formData.state && formData.district) ? getTaluksByDistrict(formData.state, formData.district) : [];

  // Check for error messages from Google callback
  useEffect(() => {
    const errorType = searchParams.get('error');
    if (errorType === 'farmers_use_otp') {
      setError('Farmers must register using Aadhaar + Phone. Google registration is not available for farmers.');
    }
  }, [searchParams]);



  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Reset district and taluk if state changes
    if (name === 'state') {
      setFormData({ ...formData, state: value, district: '', taluk: '' });
    } else if (name === 'district') {
      // Reset taluk if district changes
      setFormData({ ...formData, district: value, taluk: '' });
    } else if (name === 'aadhaar_number') {
      // Only allow digits, max 12
      setFormData({ ...formData, [name]: value.replace(/\D/g, '').slice(0, 12) });
    } else if (name === 'phone') {
      // Only allow digits, max 10
      setFormData({ ...formData, [name]: value.replace(/\D/g, '').slice(0, 10) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Step 1: Register farmer (creates account but not logged in yet)
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate required fields
    if (!formData.full_name || !formData.aadhaar_number || !formData.phone || !formData.state || !formData.district) {
      setError('Full Name, Aadhaar Number, Phone, State, and District are required');
      return;
    }

    if (formData.aadhaar_number.length !== 12) {
      setError('Aadhaar number must be exactly 12 digits');
      return;
    }

    if (formData.phone.length !== 10) {
      setError('Phone number must be exactly 10 digits');
      return;
    }

    setLoading(true);
    try {
      await registerFarmer({
        display_name: formData.full_name,
        aadhaar_number: formData.aadhaar_number,
        phone: formData.phone,
        email: formData.email || null,
        state: formData.state,
        district: formData.district,
        taluk: formData.taluk || null,
        address: formData.address || null
      });
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => {
        navigate('/login?registered=true');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };



  return (
    <div className="register-container">
      <div className="register-box">
        <h1>🌾 Farm Management Portal</h1>
        <h2>Farmer Registration</h2>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        {
          <form onSubmit={handleRegister}>
            <div className="info-box">
              <span>ℹ️</span>
              <div>
                <strong>Farmer Registration</strong>
                <p>Register using your Aadhaar number and phone. You will receive an OTP for verification.</p>
              </div>
            </div>
            
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                placeholder="Enter your full name"
              />
            </div>
            
            <div className="form-group">
              <label>Aadhaar Number *</label>
              <input
                type="text"
                name="aadhaar_number"
                value={formData.aadhaar_number}
                onChange={handleChange}
                required
                placeholder="Enter 12-digit Aadhaar number"
                maxLength="12"
              />
              <span className="input-hint">{formData.aadhaar_number.length}/12 digits</span>
            </div>
            
            <div className="form-group">
              <label>Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="Enter 10-digit phone number"
                maxLength="10"
              />
              <span className="input-hint">{formData.phone.length}/10 digits</span>
            </div>
            
            <div className="form-group">
              <label>Email (Optional)</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email (optional)"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>State *</label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select State</option>
                  {states.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>District *</label>
                <select
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  disabled={!formData.state}
                  required
                >
                  <option value="">Select District</option>
                  {districts.map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label>Taluk/Tehsil</label>
              {taluks.length > 0 ? (
                <select
                  name="taluk"
                  value={formData.taluk}
                  onChange={handleChange}
                  disabled={!formData.district}
                >
                  <option value="">Select Taluk/Tehsil</option>
                  {taluks.map(taluk => (
                    <option key={taluk} value={taluk}>{taluk}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="taluk"
                  value={formData.taluk}
                  onChange={handleChange}
                  placeholder={formData.district ? "Enter your taluk/tehsil" : "Select district first"}
                  disabled={!formData.district}
                />
              )}
            </div>
            
            <div className="form-group">
              <label>Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter your full address"
                rows="2"
              />
            </div>
            
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading || formData.aadhaar_number.length !== 12 || formData.phone.length !== 10 || !formData.full_name || !formData.state || !formData.district}
            >
              {loading ? 'Registering...' : '📝 Register as Farmer'}
            </button>
          </form>
        }
        
        <div className="role-info-section">
          <h3>Not a Farmer?</h3>
          <p>Authorities and Veterinarians register using Google Sign-In on the login page.</p>
          <Link to="/login" className="btn-link-alt">Go to Login →</Link>
        </div>
        
        <p className="login-link">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
