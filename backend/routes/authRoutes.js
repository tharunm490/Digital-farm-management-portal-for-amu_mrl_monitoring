const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const passport = require('passport');
const { User, Farmer } = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

// Register (Local)
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, role, phone, address, state, district } = req.body;
    
    // Check if user exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Create user
    const userId = await User.create({ 
      email, 
      password, 
      display_name: full_name, 
      role: role || 'farmer' 
    });
    
    // If farmer, create farmer profile
    if (role === 'farmer' || !role) {
      await Farmer.create({ user_id: userId, phone, address, state, district });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { user_id: userId, email, role: role || 'farmer' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { 
        user_id: userId, 
        email, 
        display_name: full_name,
        full_name: full_name,
        role: role || 'farmer' 
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login (Local)
router.post('/login', (req, res, next) => {
  passport.authenticate('local', { session: false }, async (err, user, info) => {
    if (err) {
      return res.status(500).json({ error: 'Authentication error' });
    }
    
    if (!user) {
      return res.status(401).json({ error: info.message || 'Invalid credentials' });
    }
    
    try {
      // Get farmer details if farmer
      let userData = user;
      if (user.role === 'farmer') {
        userData = await User.getUserWithFarmerDetails(user.user_id);
      }
      
      // Generate JWT
      const token = jwt.sign(
        { user_id: user.user_id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      // Log login
      await require('../config/database').query(
        'INSERT INTO login_logs (user_id) VALUES (?)',
        [user.user_id]
      );
      
      res.json({
        message: 'Login successful',
        token,
        user: {
          user_id: userData.user_id,
          email: userData.email,
          display_name: userData.display_name || userData.email?.split('@')[0],
          full_name: userData.display_name || userData.email?.split('@')[0],
          role: userData.role,
          farmer_id: userData.farmer_id,
          phone: userData.phone,
          address: userData.address,
          state: userData.state,
          district: userData.district
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  })(req, res, next);
});

// Google OAuth - Initiate
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth - Callback
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  async (req, res) => {
    try {
      // Generate JWT
      const token = jwt.sign(
        { user_id: req.user.user_id, email: req.user.email, role: req.user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      // Redirect to frontend with token
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
  }
);

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userData = await User.getUserWithFarmerDetails(req.user.user_id);
    
    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      user_id: userData.user_id,
      email: userData.email,
      display_name: userData.display_name || userData.email?.split('@')[0],
      full_name: userData.display_name || userData.email?.split('@')[0],
      role: userData.role,
      auth_provider: userData.auth_provider,
      farmer_id: userData.farmer_id,
      phone: userData.phone,
      address: userData.address,
      state: userData.state,
      district: userData.district
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update farmer profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { full_name, phone, address, state, district } = req.body;
    
    // Update user display name
    await User.update(req.user.user_id, { display_name: full_name, role: req.user.role });
    
    // Update farmer profile if exists
    if (req.user.role === 'farmer') {
      const farmer = await Farmer.getByUserId(req.user.user_id);
      if (farmer) {
        await Farmer.update(req.user.user_id, { phone, address, state, district });
      } else {
        await Farmer.create({ user_id: req.user.user_id, phone, address, state, district });
      }
    }
    
    // Get updated user data
    const userData = await User.getUserWithFarmerDetails(req.user.user_id);
    
    res.json({ 
      message: 'Profile updated successfully',
      user: {
        user_id: userData.user_id,
        email: userData.email,
        display_name: userData.display_name,
        full_name: userData.display_name,
        role: userData.role,
        auth_provider: userData.auth_provider,
        farmer_id: userData.farmer_id,
        phone: userData.phone,
        address: userData.address,
        state: userData.state,
        district: userData.district,
        created_at: userData.created_at
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // Update logout time in login_logs
    await require('../config/database').query(
      'UPDATE login_logs SET logout_time = NOW() WHERE user_id = ? AND logout_time IS NULL ORDER BY login_time DESC LIMIT 1',
      [req.user.user_id]
    );
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

module.exports = router;
