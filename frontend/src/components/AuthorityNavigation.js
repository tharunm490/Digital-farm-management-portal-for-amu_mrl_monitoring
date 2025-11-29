import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthorityNavigation.css';

const AuthorityNavigation = () => {
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

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  if (!user || user.role !== 'authority') return null;

  return (
    <nav className={`authority-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
      <div className="authority-nav-container">
        <div className="authority-nav-brand">
          <span className="authority-icon">🏛️</span>
          <span className="authority-title">Authority Dashboard</span>
        </div>

        <button
          className={`authority-mobile-toggle ${mobileMenuOpen ? 'open' : ''}`}
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation menu"
        >
          <span className="authority-hamburger-line"></span>
          <span className="authority-hamburger-line"></span>
          <span className="authority-hamburger-line"></span>
        </button>

        <ul className={`authority-nav-menu ${mobileMenuOpen ? 'active' : ''}`}>
          <li className="authority-nav-item">
            <Link to="/authority/dashboard" className="authority-nav-link" onClick={closeMobileMenu}>
              <span className="authority-nav-icon">📊</span>
              <span className="authority-nav-text">Dashboard</span>
            </Link>
          </li>

          <li className="authority-nav-item">
            <Link to="/authority/amu-analytics" className="authority-nav-link" onClick={closeMobileMenu}>
              <span className="authority-nav-icon">📈</span>
              <span className="authority-nav-text">AMU Analytics</span>
            </Link>
          </li>

          <li className="authority-nav-item">
            <Link to="/authority/heat-map" className="authority-nav-link" onClick={closeMobileMenu}>
              <span className="authority-nav-icon">🌡️</span>
              <span className="authority-nav-text">Heat Map</span>
            </Link>
          </li>

          <li className="authority-nav-item">
            <Link to="/authority/map-view" className="authority-nav-link" onClick={closeMobileMenu}>
              <span className="authority-nav-icon">🗺️</span>
              <span className="authority-nav-text">India Map</span>
            </Link>
          </li>

          <li className="authority-nav-item">
            <Link to="/authority/complaints" className="authority-nav-link" onClick={closeMobileMenu}>
              <span className="authority-nav-icon">🚨</span>
              <span className="authority-nav-text">Complaints & Alerts</span>
            </Link>
          </li>

          <li className="authority-nav-item">
            <Link to="/authority/reports" className="authority-nav-link" onClick={closeMobileMenu}>
              <span className="authority-nav-icon">📋</span>
              <span className="authority-nav-text">Reports</span>
            </Link>
          </li>

          <li className="authority-nav-item">
            <Link to="/authority/notifications" className="authority-nav-link" onClick={closeMobileMenu}>
              <span className="authority-nav-icon">🔔</span>
              <span className="authority-nav-text">Notifications</span>
            </Link>
          </li>

          <li className="authority-nav-item">
            <Link to="/authority/profile" className="authority-nav-link" onClick={closeMobileMenu}>
              <span className="authority-nav-icon">👤</span>
              <span className="authority-nav-text">Profile</span>
            </Link>
          </li>

          <li className="authority-nav-item">
            <button onClick={handleLogout} className="authority-nav-link authority-logout-btn">
              <span className="authority-nav-icon">🚪</span>
              <span className="authority-nav-text">Logout</span>
            </button>
          </li>
        </ul>

        <div className="authority-user-info">
          <span className="authority-user-name">{user.display_name || user.email}</span>
          <span className="authority-user-role">Authority</span>
        </div>
      </div>

      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div className="authority-mobile-backdrop" onClick={closeMobileMenu}></div>
      )}
    </nav>
  );
};

export default AuthorityNavigation;