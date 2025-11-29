import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [role, setRole] = useState('farmer');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    }
  };

  const handleGoogleLogin = () => {
    // Redirect to backend Google auth endpoint with role
    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    window.location.href = `${backendUrl}/auth/google?role=${role}`;
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Farm Management Portal</h1>
        <h2>Login</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>
          
          <button type="submit" className="btn-primary">Login</button>
        </form>
        
        <div className="divider">OR</div>
        
        <div className="role-selection">
          <p>Select your role for Google sign-in:</p>
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
        
        <button onClick={handleGoogleLogin} className="btn-google">
          <span>🔐</span> Sign in with Google
        </button>
        
        <p className="register-link">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
