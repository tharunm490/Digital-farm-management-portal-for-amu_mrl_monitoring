import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import './Navigation.css';
import './Navigation.overrides.css';

const Navigation = () => {
  const { user, logout, language, changeLanguage } = useAuth();
  const { t } = useTranslation();
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
    <nav className={`navigation ${user?.role === 'veterinarian' ? 'vet-theme' : ''}`}>
      <div className="nav-container">
        <Link to="/" className="nav-brand" onClick={closeAllMenus}>
          <span className="brand-icon">🌾</span>
          <span className="brand-name">FarmTrack</span>
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
            <Link to="/dashboard" className="nav-link" onClick={closeAllMenus}>
              <span className="nav-icon">📊</span>
              <span className="nav-text">{t('dashboard')}</span>
            </Link>
          </li>

          {/* Management Dropdown */}
          <li className="nav-item dropdown">
            <button 
              className="nav-link dropdown-toggle" 
              onClick={() => toggleDropdown('management')}
              aria-expanded={dropdownOpen === 'management'}
            >
              <span className="nav-icon">🏗️</span>
              <span className="nav-text">Management</span>
              <span className="dropdown-arrow">▼</span>
            </button>
            <ul className={`dropdown-menu ${dropdownOpen === 'management' ? 'show' : ''}`}>
              {user?.role !== 'veterinarian' && (
                <li>
                  <Link to="/farms" className="dropdown-item" onClick={closeAllMenus}>
                    <span className="nav-icon">🏡</span>
                    <span className="nav-text">{t('farms')}</span>
                  </Link>
                </li>
              )}
              {user?.role !== 'veterinarian' && (
                <li>
                  <Link to="/animals" className="dropdown-item" onClick={closeAllMenus}>
                    <span className="nav-icon">🐄</span>
                    <span className="nav-text">{t('animals_batches')}</span>
                  </Link>
                </li>
              )}
              <li>
                <Link to="/treatments" className="dropdown-item" onClick={closeAllMenus}>
                  <span className="nav-icon">💊</span>
                  <span className="nav-text">{t('treatments')}</span>
                </Link>
              </li>
              {user?.role === 'veterinarian' && (
                <li>
                  <Link to="/treatment-requests" className="dropdown-item" onClick={closeAllMenus}>
                    <span className="nav-icon">📋</span>
                    <span className="nav-text">Treatment Requests</span>
                  </Link>
                </li>
              )}
              <li>
                <Link to="/vaccinations" className="dropdown-item" onClick={closeAllMenus}>
                  <span className="nav-icon">💉</span>
                  <span className="nav-text">{t('vaccinations')}</span>
                </Link>
              </li>
              <li>
                <Link to="/amu-records" className="dropdown-item" onClick={closeAllMenus}>
                  <span className="nav-icon">📊</span>
                  <span className="nav-text">AMU Records</span>
                </Link>
              </li>
            </ul>
          </li>

          {/* Tools Dropdown */}
          {user?.role !== 'veterinarian' && (
            <li className="nav-item dropdown">
              <button 
                className="nav-link dropdown-toggle" 
                onClick={() => toggleDropdown('tools')}
                aria-expanded={dropdownOpen === 'tools'}
              >
                <span className="nav-icon">🛠️</span>
                <span className="nav-text">Tools</span>
                <span className="dropdown-arrow">▼</span>
              </button>
              <ul className={`dropdown-menu ${dropdownOpen === 'tools' ? 'show' : ''}`}>
                {user?.role !== 'veterinarian' && (
                  <li>
                    <Link to="/qr-generator" className="dropdown-item" onClick={closeAllMenus}>
                      <span className="nav-icon">📱</span>
                      <span className="nav-text">QR Code Generator</span>
                    </Link>
                  </li>
                )}
              </ul>
            </li>
          )}

          {/* Account Section */}
          <li className="nav-item">
            <Link to="/notifications" className="nav-link" onClick={closeAllMenus}>
              <span className="nav-icon">🔔</span>
              <span className="nav-text">{t('notifications')}</span>
            </Link>
          </li>
          {user?.role === 'farmer' && (
            <li className="nav-item dropdown">
              <button 
                className="nav-link dropdown-toggle" 
                onClick={() => toggleDropdown('language')}
                aria-expanded={dropdownOpen === 'language'}
              >
                <span className="nav-icon">🌐</span>
                <span className="nav-text">{t('language')}</span>
                <span className="dropdown-arrow">▼</span>
              </button>
              <ul className={`dropdown-menu ${dropdownOpen === 'language' ? 'show' : ''}`}>
                <li>
                  <button 
                    className={`dropdown-item ${language === 'en' ? 'active' : ''}`} 
                    onClick={() => { changeLanguage('en'); closeAllMenus(); }}
                  >
                    <span className="nav-text">{t('english')}</span>
                  </button>
                </li>
                <li>
                  <button 
                    className={`dropdown-item ${language === 'hi' ? 'active' : ''}`} 
                    onClick={() => { changeLanguage('hi'); closeAllMenus(); }}
                  >
                    <span className="nav-text">{t('hindi')}</span>
                  </button>
                </li>
              </ul>
            </li>
          )}
          <li className="nav-item">
            <Link to="/profile" className="nav-link" onClick={closeAllMenus}>
              <span className="nav-icon">👤</span>
              <span className="nav-text">{t('profile')}</span>
            </Link>
          </li>
          <li className="nav-item">
            <button onClick={handleLogout} className="nav-link logout-btn">
              <span className="nav-icon">🚪</span>
              <span className="nav-text">{t('logout')}</span>
            </button>
          </li>
        </ul>

        <div className="nav-user-info">
          <span className="user-name">{user.role === 'veterinarian' ? user.vet_name : user.display_name}</span>
          <span className="user-role">{user.role}</span>
        </div>
      </div>

      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && <div className={`mobile-backdrop ${mobileMenuOpen ? 'active' : ''}`} onClick={closeAllMenus}></div>}
    </nav>
  );
};

export default Navigation;
