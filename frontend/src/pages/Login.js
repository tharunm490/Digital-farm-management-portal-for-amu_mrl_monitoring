import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  // Farmer login state (Aadhaar + CAPTCHA)
  const [aadhaar, setAadhaar] = useState('');
  const [phone, setPhone] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaData, setCaptchaData] = useState(null);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  
  // Role selection state
  const [loginMode, setLoginMode] = useState('farmer'); // 'farmer' | 'authority' | 'veterinarian' | 'distributor' | 'laboratory'
  
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
      const baseMsg = 'Invalid role selected. Please select Authority, Veterinarian, Distributor, or Laboratory for Google login.';
      if (attemptedRole) {
        setError(`${baseMsg} (attempted: "${attemptedRole}")`);
      } else {
        setError(baseMsg);
      }
    } else if (errorType === 'callback_error') {
      // Show backend-provided message (if any) and attempted role
      const backendMessage = searchParams.get('message');
      const decodedMsg = backendMessage ? decodeURIComponent(backendMessage) : null;
      const attempted = searchParams.get('attempted_role');
      setError(
        `Login callback failed${attempted ? ` (attempted role: "${attempted}")` : ''}${decodedMsg ? `: ${decodedMsg}` : ''}`
      );
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
    // Remove /api suffix from REACT_APP_API_URL to get base backend URL
    const apiUrl = process.env.REACT_APP_API_URL || '/api';
    const backendUrl = apiUrl.replace(/\/api$/, '');
    console.log('Redirecting to Google OAuth:', `${backendUrl}/api/auth/google?role=${loginMode}`);
    window.location.href = `${backendUrl}/api/auth/google?role=${loginMode}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl shadow-2xl mb-4 transform hover:scale-110 transition-transform">
            <span className="text-4xl">🌾</span>
          </div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-green-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Farm Management Portal
          </h1>
          <p className="text-gray-600 font-medium">AMU/MRL Monitoring System</p>
        </div>

        {/* Main Login Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* Role Selection Tabs */}
          <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-gray-100 rounded-2xl">
            <button
              type="button"
              className={`px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
                loginMode === 'farmer'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg transform scale-105'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => { setLoginMode('farmer'); setError(''); }}
            >
              <span>🌾</span>
              <span>Farmer</span>
            </button>
            <button
              type="button"
              className={`px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
                loginMode === 'authority'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => { setLoginMode('authority'); setError(''); }}
            >
              <span>👮</span>
              <span>Authority</span>
            </button>
            <button
              type="button"
              className={`px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
                loginMode === 'veterinarian'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg transform scale-105'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => { setLoginMode('veterinarian'); setError(''); }}
            >
              <span>🩺</span>
              <span>Veterinarian</span>
            </button>
            <button
              type="button"
              className={`px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
                loginMode === 'distributor'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg transform scale-105'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => { setLoginMode('distributor'); setError(''); }}
            >
              <span>🚚</span>
              <span>Distributor</span>
            </button>
            <button
              type="button"
              className={`px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
                loginMode === 'laboratory'
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg transform scale-105'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => { setLoginMode('laboratory'); setError(''); }}
            >
              <span>🔬</span>
              <span>Laboratory</span>
            </button>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg animate-shake">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">⚠️</span>
                <p className="text-red-700 font-medium text-sm">{error}</p>
              </div>
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">✅</span>
                <p className="text-green-700 font-medium text-sm">{success}</p>
              </div>
            </div>
          )}

          {/* FARMER LOGIN - Aadhaar + CAPTCHA */}
          {loginMode === 'farmer' && (
            <form onSubmit={handleFarmerLogin} className="space-y-5">
              {/* Info Box */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 flex items-start space-x-3">
                <span className="text-2xl">🔐</span>
                <p className="text-sm text-gray-700 font-medium">
                  Farmers login using Aadhaar Number + CAPTCHA verification
                </p>
              </div>

              {/* Aadhaar Number */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">Aadhaar Number</label>
                <div className="relative">
                  <input
                    type="text"
                    value={aadhaar}
                    onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    placeholder="Enter 12-digit Aadhaar number"
                    maxLength="12"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none text-lg"
                  />
                  <div className="absolute right-3 top-3 text-2xl">🆔</div>
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">Phone Number</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter 10-digit phone number"
                    maxLength="10"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none text-lg"
                  />
                  <div className="absolute right-3 top-3 text-2xl">📱</div>
                </div>
              </div>

              {/* CAPTCHA */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">CAPTCHA Verification</label>
                <div className="bg-gradient-to-r from-gray-100 to-slate-100 border-2 border-gray-300 rounded-xl p-4 flex items-center justify-between">
                  {captchaLoading ? (
                    <span className="text-gray-500 font-mono text-xl">Loading...</span>
                  ) : captchaData ? (
                    <span className="text-2xl font-black tracking-wider text-gray-800 select-none">{captchaData.captchaText}</span>
                  ) : (
                    <span className="text-red-500 font-medium">Failed to load</span>
                  )}
                  <button
                    type="button"
                    className="w-10 h-10 bg-white rounded-lg shadow-md hover:shadow-lg flex items-center justify-center text-2xl hover:rotate-180 transition-all duration-300"
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
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none text-lg uppercase font-mono tracking-widest"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transform transition-all duration-200 flex items-center justify-center space-x-2 ${
                  loading || aadhaar.length !== 12 || phone.length !== 10 || captcha.length < 6
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 hover:-translate-y-0.5 hover:shadow-xl'
                }`}
                disabled={loading || aadhaar.length !== 12 || phone.length !== 10 || captcha.length < 6}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Logging in...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">✅</span>
                    <span>Login</span>
                  </>
                )}
              </button>

              {/* Register Link */}
              <p className="text-center text-sm text-gray-600">
                Don't have an account?{' '}
                <Link to="/register" className="text-green-600 font-bold hover:text-green-700 hover:underline">
                  Register here
                </Link>
              </p>
            </form>
          )}

          {/* AUTHORITY / VETERINARIAN / DISTRIBUTOR LOGIN - Google Only */}
          {(loginMode === 'authority' || loginMode === 'veterinarian' || loginMode === 'distributor' || loginMode === 'laboratory') && (
            <div className="space-y-5">
              {/* Info Box */}
              <div className={`bg-gradient-to-r ${
                loginMode === 'authority' ? 'from-indigo-50 to-purple-50 border-indigo-200' :
                loginMode === 'veterinarian' ? 'from-blue-50 to-cyan-50 border-blue-200' :
                'from-orange-50 to-amber-50 border-orange-200'
              } border rounded-xl p-4 flex items-start space-x-3`}>
                <span className="text-2xl">🔐</span>
                <p className="text-sm text-gray-700 font-medium">
                  {loginMode === 'authority'
                    ? 'Authorities login using Google Account'
                    : loginMode === 'veterinarian'
                    ? 'Veterinarians login using Google Account'
                    : loginMode === 'distributor'
                    ? 'Distributors login using Google Account'
                    : 'Laboratories login using Google Account'}
                </p>
              </div>

              {/* Role Lock Warning */}
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 flex items-start space-x-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="text-sm font-bold text-yellow-900 mb-1">Important</p>
                  <p className="text-xs text-yellow-800">
                    Your role will be locked after first login. Make sure you select the correct role.
                  </p>
                </div>
              </div>

              {/* Google Sign In Button */}
              <button
                onClick={handleGoogleLogin}
                className={`w-full bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 py-4 px-6 rounded-xl font-bold text-gray-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center space-x-3`}
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  className="w-6 h-6"
                />
                <span>
                  Sign in with Google as{' '}
                  {loginMode === 'authority' ? 'Authority' : loginMode === 'veterinarian' ? 'Veterinarian' : 'Distributor'}
                </span>
              </button>

              {/* Role Note */}
              <div className={`text-center text-sm font-medium ${
                loginMode === 'authority' ? 'text-indigo-700' :
                loginMode === 'veterinarian' ? 'text-blue-700' :
                loginMode === 'distributor' ? 'text-orange-700' : 'text-teal-700'
              }`}>
                {loginMode === 'authority'
                  ? '👮 For DAHD/State/District officials only'
                  : loginMode === 'veterinarian'
                  ? '🩺 For registered veterinary practitioners'
                  : loginMode === 'distributor'
                  ? '🚚 For bulk buyers who verify AMU compliance before purchasing'
                  : '🔬 For accredited laboratories and lab personnel'}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Powered by Digital Farm Management System</p>
          <p className="text-xs mt-1">Antimicrobial Usage & MRL Monitoring</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
