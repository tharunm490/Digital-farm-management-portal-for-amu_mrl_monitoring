import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navigation.css';
import './Navigation.overrides.css';

const DistributorNavigation = () => {
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

  const closeAllMenus = () => {
    setMobileMenuOpen(false);
  };

  if (!user) return null;

  return (
    <nav className="navigation distributor-theme">
      <div className="nav-container">
        <Link to="/distributor/dashboard" className="nav-brand" onClick={closeAllMenus}>
          <span className="brand-icon">🚚</span>
          <span className="brand-name">FarmTrack Distributor</span>
        </Link>

        <button 
          className={`mobile-menu-toggle ${mobileMenuOpen ? 'open' : ''}`} 
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation menu"
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>

        <ul className={`nav-menu ${mobileMenuOpen ? 'active' : ''}`}>
          <li className="nav-item">
            <Link to="/distributor/dashboard" className="nav-link" onClick={closeAllMenus}>
              <span className="nav-icon">📊</span>
              <span className="nav-text">Dashboard</span>
            </Link>
          </li>

          <li className="nav-item">
            <Link to="/distributor/verify-product" className="nav-link" onClick={closeAllMenus}>
              <span className="nav-icon">📱</span>
              <span className="nav-text">Scan QR</span>
            </Link>
          </li>

          <li className="nav-item">
            <Link to="/distributor/verifications" className="nav-link" onClick={closeAllMenus}>
              <span className="nav-icon">📋</span>
              <span className="nav-text">Verification History</span>
            </Link>
          </li>

          <li className="nav-item">
            <Link to="/distributor/profile" className="nav-link" onClick={closeAllMenus}>
              <span className="nav-icon">👤</span>
              <span className="nav-text">Profile</span>
            </Link>
          </li>

          <li className="nav-item">
            <button onClick={handleLogout} className="nav-link logout-btn">
              <span className="nav-icon">🚪</span>
              <span className="nav-text">Logout</span>
            </button>
          </li>
        </ul>

        <div className="nav-user-info">
          <span className="user-name">{user.distributor_name || user.display_name}</span>
          <span className="user-role">Distributor</span>
        </div>
      </div>

      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && <div className={`mobile-backdrop ${mobileMenuOpen ? 'active' : ''}`} onClick={closeAllMenus}></div>}
    </nav>
  );
};

export default DistributorNavigation;
