import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';

const Navigation = () => {
  const { user, logout, language, changeLanguage } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(null);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setDropdownOpen(null);
      }
    };
    
    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setDropdownOpen(null);
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
    <>
      {/* Full-width green navbar */}
      <nav className="w-full bg-primary-600 shadow-md fixed top-0 left-0 right-0 z-50">
        <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <Link to="/" className="flex items-center space-x-3 flex-shrink-0" onClick={closeAllMenus}>
              <span className="text-3xl">🌾</span>
              <span className="text-white text-xl font-bold hidden sm:block">FarmTrack</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1 flex-1 justify-center">
              <Link
                to="/dashboard"
                className="text-white hover:bg-primary-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <span>📊</span>
                <span>{t('dashboard')}</span>
              </Link>

              {/* Management Dropdown */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('management')}
                  className="text-white hover:bg-primary-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                  aria-expanded={dropdownOpen === 'management'}
                >
                  <span>🏗️</span>
                  <span>Management</span>
                  <span className={`text-xs transition-transform ${dropdownOpen === 'management' ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {dropdownOpen === 'management' && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-strong py-2 animate-fade-in">
                    {user?.role !== 'veterinarian' && (
                      <>
                        <Link to="/farms" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors" onClick={closeAllMenus}>
                          <span className="mr-2">🏡</span>{t('farms')}
                        </Link>
                        <Link to="/animals" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors" onClick={closeAllMenus}>
                          <span className="mr-2">🐄</span>{t('animals_batches')}
                        </Link>
                        <Link to="/crops" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors" onClick={closeAllMenus}>
                          <span className="mr-2">🌱</span>Crops
                        </Link>
                      </>
                    )}
                    <Link to="/treatments" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors" onClick={closeAllMenus}>
                      <span className="mr-2">💊</span>{t('treatments')}
                    </Link>
                    {user?.role === 'veterinarian' && (
                      <Link to="/treatment-requests" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors" onClick={closeAllMenus}>
                        <span className="mr-2">📋</span>Treatment Requests
                      </Link>
                    )}
                    <Link to="/vaccinations" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors" onClick={closeAllMenus}>
                      <span className="mr-2">💉</span>{t('vaccinations')}
                    </Link>
                    <Link to="/amu-records" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors" onClick={closeAllMenus}>
                      <span className="mr-2">📊</span>AMU Records
                    </Link>
                    {user?.role !== 'veterinarian' && (
                      <Link to="/qr-generator" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors" onClick={closeAllMenus}>
                        <span className="mr-2">📱</span>QR Code Generator
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Financial Assistance - Farmers only */}
              {user?.role === 'farmer' && (
                <div className="relative">
                  <button
                    onClick={() => toggleDropdown('finance')}
                    className="text-white hover:bg-primary-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                    aria-expanded={dropdownOpen === 'finance'}
                  >
                    <span>💰</span>
                    <span>Financial Assistance</span>
                    <span className={`text-xs transition-transform ${dropdownOpen === 'finance' ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                  {dropdownOpen === 'finance' && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-strong py-2 animate-fade-in">
                      <Link to="/apply-loan" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors" onClick={closeAllMenus}>
                        <span className="mr-2">📝</span>Apply for Loan
                      </Link>
                      <Link to="/loan-status" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors" onClick={closeAllMenus}>
                        <span className="mr-2">📋</span>Loan Status
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <Link
                to="/notifications"
                className="text-white hover:bg-primary-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <span>🔔</span>
                <span>{t('notifications')}</span>
              </Link>
            </div>

            {/* Right section - Profile & Logout */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Language Switcher - Farmers only */}
              {user?.role === 'farmer' && (
                <div className="relative">
                  <button
                    onClick={() => toggleDropdown('language')}
                    className="text-white hover:bg-primary-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                    aria-expanded={dropdownOpen === 'language'}
                  >
                    <span>🌐</span>
                    <span className={`text-xs transition-transform ${dropdownOpen === 'language' ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                  {dropdownOpen === 'language' && (
                    <div className="absolute top-full right-0 mt-2 w-40 bg-white rounded-lg shadow-strong py-2 animate-fade-in">
                      <button
                        className={`block w-full text-left px-4 py-2 text-sm transition-colors ${language === 'en' ? 'bg-gray-100 text-primary-600 font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
                        onClick={() => { changeLanguage('en'); closeAllMenus(); }}
                      >
                        {t('english')}
                      </button>
                      <button
                        className={`block w-full text-left px-4 py-2 text-sm transition-colors ${language === 'hi' ? 'bg-gray-100 text-primary-600 font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
                        onClick={() => { changeLanguage('hi'); closeAllMenus(); }}
                      >
                        {t('hindi')}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* User Info */}
              <Link
                to="/profile"
                className="flex items-center space-x-2 bg-primary-700 hover:bg-primary-800 px-4 py-2 rounded-lg transition-colors"
              >
                <span className="text-white text-sm">👤</span>
                <div className="hidden lg:block text-left">
                  <div className="text-white text-sm font-medium">{user.role === 'veterinarian' ? user.vet_name : user.display_name}</div>
                  <div className="text-primary-100 text-xs capitalize">{user.role}</div>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                className="text-white hover:bg-red-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 bg-red-500"
              >
                <span>🚪</span>
                <span>{t('logout')}</span>
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden text-white p-2 rounded-lg hover:bg-primary-700 transition-colors"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <div className="w-6 h-5 flex flex-col justify-between">
                <span className={`block h-0.5 w-full bg-white transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                <span className={`block h-0.5 w-full bg-white transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`}></span>
                <span className={`block h-0.5 w-full bg-white transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile slide-out menu */}
      <div
        className={`fixed inset-y-0 left-0 w-80 bg-white shadow-strong z-50 transform transition-transform duration-300 ease-out md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full overflow-y-auto">
          {/* Mobile menu header */}
          <div className="bg-primary-600 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">🌾</span>
                <span className="text-white text-xl font-bold">FarmTrack</span>
              </div>
              <button
                onClick={closeAllMenus}
                className="text-white p-2 hover:bg-primary-700 rounded-lg transition-colors"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
            {/* User info in mobile */}
            <div className="mt-4 pt-4 border-t border-primary-500">
              <div className="text-white text-sm font-medium">{user.role === 'veterinarian' ? user.vet_name : user.display_name}</div>
              <div className="text-primary-100 text-xs capitalize">{user.role}</div>
            </div>
          </div>

          {/* Mobile menu items */}
          <div className="p-4 space-y-2">
            <Link
              to="/dashboard"
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={closeAllMenus}
            >
              <span className="text-xl">📊</span>
              <span className="font-medium">{t('dashboard')}</span>
            </Link>

            {/* Management Section */}
            <div>
              <button
                onClick={() => toggleDropdown('management-mobile')}
                className="w-full flex items-center justify-between px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl">🏗️</span>
                  <span className="font-medium">Management</span>
                </div>
                <span className={`text-xs transition-transform ${dropdownOpen === 'management-mobile' ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {dropdownOpen === 'management-mobile' && (
                <div className="ml-8 mt-2 space-y-1">
                  {user?.role !== 'veterinarian' && (
                    <>
                      <Link to="/farms" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg" onClick={closeAllMenus}>
                        <span className="mr-2">🏡</span>{t('farms')}
                      </Link>
                      <Link to="/animals" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg" onClick={closeAllMenus}>
                        <span className="mr-2">🐄</span>{t('animals_batches')}
                      </Link>
                    </>
                  )}
                  <Link to="/treatments" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg" onClick={closeAllMenus}>
                    <span className="mr-2">💊</span>{t('treatments')}
                  </Link>
                  {user?.role === 'veterinarian' && (
                    <Link to="/treatment-requests" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg" onClick={closeAllMenus}>
                      <span className="mr-2">📋</span>Treatment Requests
                    </Link>
                  )}
                  <Link to="/vaccinations" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg" onClick={closeAllMenus}>
                    <span className="mr-2">💉</span>{t('vaccinations')}
                  </Link>
                  <Link to="/amu-records" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg" onClick={closeAllMenus}>
                    <span className="mr-2">📊</span>AMU Records
                  </Link>
                  {user?.role !== 'veterinarian' && (
                    <Link to="/qr-generator" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg" onClick={closeAllMenus}>
                      <span className="mr-2">📱</span>QR Code Generator
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Financial Assistance - Farmers only */}
            {user?.role === 'farmer' && (
              <div>
                <button
                  onClick={() => toggleDropdown('finance-mobile')}
                  className="w-full flex items-center justify-between px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">💰</span>
                    <span className="font-medium">Financial Assistance</span>
                  </div>
                  <span className={`text-xs transition-transform ${dropdownOpen === 'finance-mobile' ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {dropdownOpen === 'finance-mobile' && (
                  <div className="ml-8 mt-2 space-y-1">
                    <Link to="/apply-loan" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg" onClick={closeAllMenus}>
                      <span className="mr-2">📝</span>Apply for Loan
                    </Link>
                    <Link to="/loan-status" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg" onClick={closeAllMenus}>
                      <span className="mr-2">📋</span>Loan Status
                    </Link>
                  </div>
                )}
              </div>
            )}

            <Link
              to="/notifications"
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={closeAllMenus}
            >
              <span className="text-xl">🔔</span>
              <span className="font-medium">{t('notifications')}</span>
            </Link>

            {/* Language Switcher - Farmers only */}
            {user?.role === 'farmer' && (
              <div>
                <button
                  onClick={() => toggleDropdown('language-mobile')}
                  className="w-full flex items-center justify-between px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">🌐</span>
                    <span className="font-medium">{t('language')}</span>
                  </div>
                  <span className={`text-xs transition-transform ${dropdownOpen === 'language-mobile' ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {dropdownOpen === 'language-mobile' && (
                  <div className="ml-8 mt-2 space-y-1">
                    <button
                      className={`block w-full text-left px-4 py-2 text-sm rounded-lg ${language === 'en' ? 'bg-primary-100 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                      onClick={() => { changeLanguage('en'); closeAllMenus(); }}
                    >
                      {t('english')}
                    </button>
                    <button
                      className={`block w-full text-left px-4 py-2 text-sm rounded-lg ${language === 'hi' ? 'bg-primary-100 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                      onClick={() => { changeLanguage('hi'); closeAllMenus(); }}
                    >
                      {t('hindi')}
                    </button>
                  </div>
                )}
              </div>
            )}

            <Link
              to="/profile"
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={closeAllMenus}
            >
              <span className="text-xl">👤</span>
              <span className="font-medium">{t('profile')}</span>
            </Link>

            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors mt-4"
            >
              <span className="text-xl">🚪</span>
              <span className="font-medium">{t('logout')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden animate-fade-in"
          onClick={closeAllMenus}
          aria-hidden="true"
        ></div>
      )}

      {/* Spacer to prevent content from going under fixed navbar */}
      <div className="h-16"></div>
    </>
  );
};

export default Navigation;
