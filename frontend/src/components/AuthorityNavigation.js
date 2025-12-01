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
          <span className="authority-title">Authority Portal</span>
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
              <span className="authority-nav-text">Analytics</span>
            </Link>
          </li>

          <li className="authority-nav-item">
            <Link to="/authority/map-view" className="authority-nav-link" onClick={closeMobileMenu}>
              <span className="authority-nav-icon">🗺️</span>
              <span className="authority-nav-text">Maps</span>
            </Link>
          </li>

          <li className="authority-nav-item">
            <Link to="/authority/complaints" className="authority-nav-link" onClick={closeMobileMenu}>
              <span className="authority-nav-icon">🚨</span>
              <span className="authority-nav-text">Alerts</span>
            </Link>
          </li>

          <li className="authority-nav-item">
            <Link to="/authority/loan-applications" className="authority-nav-link" onClick={closeMobileMenu}>
              <span className="authority-nav-icon">💼</span>
              <span className="authority-nav-text">Loan Applications</span>
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