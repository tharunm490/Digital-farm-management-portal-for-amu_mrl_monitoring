import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('en');

  const API_URL = process.env.REACT_APP_API_URL || '/api';

  // Create axios instance with proper configuration
  const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 15000, // 15 second timeout
  });

  useEffect(() => {
    checkAuth();
    const savedLanguage = localStorage.getItem('language') || 'en';
    setLanguage(savedLanguage);
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await apiClient.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }
    }
    setLoading(false);
  };

  // ============================================
  // FARMER LOGIN - Aadhaar + CAPTCHA (OTP temporarily disabled)
  // ============================================
  
  // Generate CAPTCHA
  const generateCaptcha = async () => {
    try {
      console.log('Generating CAPTCHA from:', `${API_URL}/auth/captcha/generate`);
      const response = await apiClient.get('/auth/captcha/generate');
      console.log('CAPTCHA generated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('CAPTCHA generation failed:', error);
      console.error('Error details:', error.response?.data || error.message);
      throw error;
    }
  };

  // Login farmer with CAPTCHA
  const loginFarmer = async (aadhaar, phone, captchaId, captchaInput) => {
    const response = await apiClient.post('/auth/farmer/login', {
      aadhaar_number: aadhaar,
      phone,
      captchaId,
      captchaInput
    });
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    setUser(response.data.user);
    return response.data;
  };

  // Send OTP to farmer's phone - TEMPORARILY DISABLED
  const sendOTP = async (aadhaar, phone) => {
    // OTP temporarily disabled - using CAPTCHA instead
    throw new Error('OTP is temporarily disabled. Please use CAPTCHA verification.');
    /*
    const response = await axios.post(`${API_URL}/auth/farmer/send-otp`, {
      aadhaar_number: aadhaar,
      phone
    });
    return response.data;
    */
  };

  // Verify OTP and login farmer - TEMPORARILY DISABLED
  const verifyOTP = async (aadhaar, phone, otp) => {
    // OTP temporarily disabled - using CAPTCHA instead
    throw new Error('OTP is temporarily disabled. Please use CAPTCHA verification.');
    /*
    const response = await axios.post(`${API_URL}/auth/farmer/verify-otp`, {
      aadhaar_number: aadhaar,
      phone,
      otp
    });
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    setUser(response.data.user);
    return response.data;
    */
  };

  // Register new farmer
  const registerFarmer = async (farmerData) => {
    const response = await apiClient.post('/auth/farmer/register', farmerData);
    return response.data;
  };

  // ============================================
  // AUTHORITY/VET LOGIN - Email/Password (legacy)
  // ============================================
  
  const login = async (email, password) => {
    const response = await apiClient.post('/auth/login', {
      email,
      password
    });
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    setUser(response.data.user);
    return response.data;
  };

  // Register (legacy for non-farmers)
  const register = async (userData) => {
    const response = await apiClient.post('/auth/register', userData);
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    setUser(response.data.user);
    return response.data;
  };

  // ============================================
  // COMMON
  // ============================================

  const logout = async () => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${API_URL}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  // Check if a role exists for an identifier (Aadhaar or Google ID)
  const checkExistingRole = async (identifier) => {
    try {
      const response = await axios.get(`${API_URL}/auth/check-role/${identifier}`);
      return response.data;
    } catch (error) {
      return { exists: false };
    }
  };

  const value = {
    user,
    setUser,
    loading,
    // Farmer CAPTCHA methods
    generateCaptcha,
    loginFarmer,
    // Farmer OTP methods (disabled)
    sendOTP,
    verifyOTP,
    registerFarmer,
    // Legacy methods
    login,
    register,
    // Common
    logout,
    checkAuth,
    checkExistingRole,
    language,
    changeLanguage
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
