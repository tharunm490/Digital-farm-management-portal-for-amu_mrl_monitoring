import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navigation.css';

const Navigation = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const toggleDropdown = (dropdown) => {
    setDropdownOpen(dropdownOpen === dropdown ? null : dropdown);
  };

  const closeAllMenus = () => {
    setMobileMenuOpen(false);
    setDropdownOpen(null);
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

          {/* Management Dropdown */}
          <li className="nav-item dropdown">
            <button 
              className="nav-link dropdown-toggle" 
              onClick={() => toggleDropdown('management')}
            >
              <span className="nav-icon">🏗️</span>
              Management
              <span className="dropdown-arrow">▼</span>
            </button>
            <ul className={`dropdown-menu ${dropdownOpen === 'management' ? 'show' : ''}`}>
              <li>
                <Link to="/farms" className="dropdown-item" onClick={closeAllMenus}>
                  <span className="nav-icon">🏡</span>
                  Farms
                </Link>
              </li>
              <li>
                <Link to="/animals" className="dropdown-item" onClick={closeAllMenus}>
                  <span className="nav-icon">🐄</span>
                  Animals & Batches
                </Link>
              </li>
              <li>
                <Link to="/treatments" className="dropdown-item" onClick={closeAllMenus}>
                  <span className="nav-icon">💊</span>
                  Treatments
                </Link>
              </li>
              <li>
                <Link to="/vaccinations" className="dropdown-item" onClick={closeAllMenus}>
                  <span className="nav-icon">💉</span>
                  Vaccinations
                </Link>
              </li>
              <li>
                <Link to="/amu-records" className="dropdown-item" onClick={closeAllMenus}>
                  <span className="nav-icon">📊</span>
                  AMU Records
                </Link>
              </li>
            </ul>
          </li>

          {/* Tools Dropdown */}
          <li className="nav-item dropdown">
            <button 
              className="nav-link dropdown-toggle" 
              onClick={() => toggleDropdown('tools')}
            >
              <span className="nav-icon">🛠️</span>
              Tools
              <span className="dropdown-arrow">▼</span>
            </button>
            <ul className={`dropdown-menu ${dropdownOpen === 'tools' ? 'show' : ''}`}>
              <li>
                <Link to="/qr-generator" className="dropdown-item" onClick={closeAllMenus}>
                  <span className="nav-icon">📱</span>
                  QR Code Generator
                </Link>
              </li>
            </ul>
          </li>

          {/* Account Section */}
          <li className="nav-item">
            <Link to="/notifications" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
              <span className="nav-icon">🔔</span>
              Notifications
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
