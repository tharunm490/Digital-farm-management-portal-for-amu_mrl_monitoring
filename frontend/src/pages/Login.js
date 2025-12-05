import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  // Farmer login state (Aadhaar + CAPTCHA)
  const [aadhaar, setAadhaar] = useState('');
  const [phone, setPhone] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaData, setCaptchaData] = useState(null);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  
  // Role selection state
  const [loginMode, setLoginMode] = useState('farmer'); // 'farmer' | 'authority' | 'veterinarian' | 'distributor'
  
  // UI state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { generateCaptcha, loginFarmer } = useAuth();

  // Check for error messages from Google callback
  useEffect(() => {
    const errorType = searchParams.get('error');
    const registeredRole = searchParams.get('registered_role');
    const attemptedRole = searchParams.get('attempted_role');
    
    if (errorType === 'role_mismatch') {
      setError(`Access Denied: This Google account is registered as "${registeredRole}". You cannot access the ${attemptedRole} dashboard.`);
    } else if (errorType === 'farmers_use_otp') {
      setError('Farmers must use Aadhaar + CAPTCHA login. Google login is only for Authority and Veterinarian.');
      setLoginMode('farmer');
    } else if (errorType === 'google_failed') {
      setError('Google login failed. Please try again.');
    } else if (errorType === 'invalid_role') {
      setError('Invalid role selected. Please select Authority or Veterinarian for Google login.');
    }
  }, [searchParams]);

  // Load CAPTCHA when farmer mode is selected
  useEffect(() => {
    if (loginMode === 'farmer') {
      loadCaptcha();
    }
  }, [loginMode]);

  // Load CAPTCHA
  const loadCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const data = await generateCaptcha();
      setCaptchaData(data);
      setCaptcha('');
    } catch (err) {
      console.error('Failed to load CAPTCHA:', err);
      setError('Failed to load CAPTCHA. Please refresh the page.');
    } finally {
      setCaptchaLoading(false);
    }
  };

  // Handle farmer login with CAPTCHA
  const handleFarmerLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!aadhaar || aadhaar.length !== 12) {
      setError('Please enter a valid 12-digit Aadhaar number');
      return;
    }
    
    if (!phone || phone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    if (!captcha || captcha.length < 6) {
      setError('Please enter the CAPTCHA code');
      return;
    }
    
    setLoading(true);
    try {
      await loginFarmer(aadhaar, phone, captchaData.captchaId, captcha);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
      // Reload CAPTCHA on error
      loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  // Handle Google login (Authority/Veterinarian only)
  const handleGoogleLogin = () => {
    if (loginMode === 'farmer') {
      setError('Farmers cannot use Google login. Please use Aadhaar + CAPTCHA.');
      return;
    }
    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    window.location.href = `${backendUrl}/auth/google?role=${loginMode}`;
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>🌾 Farm Management Portal</h1>
        <h2>AMU/MRL Monitoring System</h2>
        
        {/* Role Selection Tabs */}
        <div className="role-tabs">
          <button
            type="button"
            className={`role-tab ${loginMode === 'farmer' ? 'active' : ''}`}
            onClick={() => { setLoginMode('farmer'); setError(''); }}
          >
            🌾 Farmer
          </button>
          <button
            type="button"
            className={`role-tab ${loginMode === 'authority' ? 'active' : ''}`}
            onClick={() => { setLoginMode('authority'); setError(''); }}
          >
            👮 Authority
          </button>
          <button
            type="button"
            className={`role-tab ${loginMode === 'veterinarian' ? 'active' : ''}`}
            onClick={() => { setLoginMode('veterinarian'); setError(''); }}
          >
            🩺 Veterinarian
          </button>
          <button
            type="button"
            className={`role-tab ${loginMode === 'distributor' ? 'active' : ''}`}
            onClick={() => { setLoginMode('distributor'); setError(''); }}
          >
            🚚 Distributor
          </button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        {/* FARMER LOGIN - Aadhaar + CAPTCHA */}
        {loginMode === 'farmer' && (
          <form onSubmit={handleFarmerLogin} className="login-form">
            <div className="login-info-box">
              <span>🔐</span>
              <p>Farmers login using Aadhaar Number + CAPTCHA verification</p>
            </div>
            
            <div className="form-group">
              <label>Aadhaar Number</label>
              <input
                type="text"
                value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, '').slice(0, 12))}
                placeholder="Enter 12-digit Aadhaar number"
                maxLength="12"
              />
            </div>
            
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Enter 10-digit phone number"
                maxLength="10"
              />
            </div>
            
            <div className="form-group captcha-group">
              <label>CAPTCHA Verification</label>
              <div className="captcha-display">
                {captchaLoading ? (
                  <span className="captcha-loading">Loading...</span>
                ) : captchaData ? (
                  <span className="captcha-text">{captchaData.captchaText}</span>
                ) : (
                  <span className="captcha-error">Failed to load</span>
                )}
                <button 
                  type="button" 
                  className="btn-refresh-captcha"
                  onClick={loadCaptcha}
                  disabled={captchaLoading}
                  title="Refresh CAPTCHA"
                >
                  🔄
                </button>
              </div>
              <input
                type="text"
                value={captcha}
                onChange={(e) => setCaptcha(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="Enter CAPTCHA code"
                maxLength="6"
                style={{ marginTop: '8px' }}
              />
            </div>
            
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading || aadhaar.length !== 12 || phone.length !== 10 || captcha.length < 6}
            >
              {loading ? 'Logging in...' : '✅ Login'}
            </button>
            
            <p className="register-link">
              Don't have an account? <Link to="/register">Register here</Link>
            </p>
          </form>
        )}
        
        {/* AUTHORITY / VETERINARIAN / DISTRIBUTOR LOGIN - Google Only */}
        {(loginMode === 'authority' || loginMode === 'veterinarian' || loginMode === 'distributor') && (
          <div className="google-login-section">
            <div className="login-info-box">
              <span>🔐</span>
              <p>
                {loginMode === 'authority' 
                  ? 'Authorities login using Google Account' 
                  : loginMode === 'veterinarian'
                  ? 'Veterinarians login using Google Account'
                  : 'Distributors login using Google Account'}
              </p>
            </div>
            
            <div className="role-lock-warning">
              <span>⚠️</span>
              <p>
                <strong>Important:</strong> Your role will be locked after first login. 
                Make sure you select the correct role.
              </p>
            </div>
            
            <button onClick={handleGoogleLogin} className="btn-google">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
              Sign in with Google as {loginMode === 'authority' ? 'Authority' : loginMode === 'veterinarian' ? 'Veterinarian' : 'Distributor'}
            </button>
            
            <p className="role-note">
              {loginMode === 'authority' 
                ? '👮 For DAHD/State/District officials only' 
                : loginMode === 'veterinarian'
                ? '🩺 For registered veterinary practitioners'
                : '🚚 For bulk buyers who verify AMU compliance before purchasing'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
