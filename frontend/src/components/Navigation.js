import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navigation.css';

const Navigation = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  if (!user) return null;

  return (
    <nav className="navigation">
      <div className="nav-container">
        <Link to="/" className="nav-brand">
          <span className="brand-icon">🌾</span>
          <span className="brand-name">FarmTrack</span>
        </Link>

        <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>

        <ul className={`nav-menu ${mobileMenuOpen ? 'active' : ''}`}>
          <li className="nav-item">
            <Link to="/dashboard" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
              <span className="nav-icon">📊</span>
              Dashboard
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/farms" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
              <span className="nav-icon">🏡</span>
              Farms
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/animals" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
              <span className="nav-icon">🐄</span>
              Animals
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/treatments" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
              <span className="nav-icon">💊</span>
              Treatments
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/qr-generator" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
              <span className="nav-icon">📱</span>
              QR Code
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/profile" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
              <span className="nav-icon">👤</span>
              Profile
            </Link>
          </li>
          <li className="nav-item">
            <button onClick={handleLogout} className="nav-link logout-btn">
              <span className="nav-icon">🚪</span>
              Logout
            </button>
          </li>
        </ul>

        <div className="nav-user-info">
          <span className="user-name">{user.full_name || user.username}</span>
          <span className="user-role">{user.role}</span>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
