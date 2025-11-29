import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser, checkAuth } = useAuth();
  const token = searchParams.get('token');

  useEffect(() => {
    const handleCallback = async () => {
      if (!token) {
        navigate('/login?error=no_token');
        return;
      }

      try {
        // Store token
        localStorage.setItem('token', token);

        // Get user details
        const response = await axios.get(`${process.env.REACT_APP_API_URL || '/api'}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const userData = response.data;

        // Check if user has completed profile (for Google OAuth users)
        if (userData.auth_provider === 'google') {
          if (userData.role === 'farmer' && !userData.farmer_id) {
            // Redirect to role selection for farmer details
            navigate(`/role-selection?token=${token}`);
          } else if (userData.role === 'veterinarian' && !userData.vet_id) {
            // Redirect to role selection for vet details
            navigate(`/role-selection?token=${token}`);
          } else {
            // User has complete profile, go to dashboard
            await checkAuth();
            navigate('/dashboard');
          }
        } else {
          // Local auth user, go to dashboard
          await checkAuth();
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        localStorage.removeItem('token');
        navigate('/login?error=auth_failed');
      }
    };

    handleCallback();
  }, [token, navigate, checkAuth]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div style={{ fontSize: '48px' }}>🔄</div>
      <div style={{ fontSize: '18px', color: '#666' }}>Authenticating...</div>
    </div>
  );
};

export default AuthCallback;
