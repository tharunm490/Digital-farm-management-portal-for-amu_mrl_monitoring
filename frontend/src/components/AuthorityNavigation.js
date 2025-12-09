import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthorityNavigation = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
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
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  if (!user || user.role !== 'authority') return null;

  return (
    <>
      {/* Full-width green navbar */}
      <nav className="w-full bg-primary-600 shadow-md fixed top-0 left-0 right-0 z-50">
        <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <Link to="/authority/dashboard" className="flex items-center space-x-3 flex-shrink-0" onClick={closeMobileMenu}>
              <span className="text-3xl">🏛️</span>
              <span className="text-white text-xl font-bold hidden sm:block">Authority Portal</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1 flex-1 justify-center">
              <Link
                to="/authority/dashboard"
                className="text-white hover:bg-primary-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <span>📊</span>
                <span>Dashboard</span>
              </Link>

              {/* Analytics Dropdown */}
              <div className="relative group">
                <Link
                  to="/authority/enhanced-analytics"
                  className="text-white hover:bg-primary-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                >
                  <span>📈</span>
                  <span>Analytics Dashboard</span>
                  <span className="text-xs">▼</span>
                </Link>
                
                {/* Dropdown Menu */}
                <div className="absolute left-0 mt-1 w-64 bg-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-2">
                    <Link to="/authority/enhanced-analytics" className="flex items-center px-4 py-2 text-gray-700 hover:bg-blue-50 transition">
                      <span className="mr-2">📊</span>
                      <span>Overview</span>
                    </Link>
                    <Link to="/authority/analytics/antibiotic-usage" className="flex items-center px-4 py-2 text-gray-700 hover:bg-blue-50 transition">
                      <span className="mr-2">💊</span>
                      <span>Antibiotic Usage Trends</span>
                    </Link>
                    <Link to="/authority/analytics/withdrawal-compliance" className="flex items-center px-4 py-2 text-gray-700 hover:bg-blue-50 transition">
                      <span className="mr-2">📅</span>
                      <span>Withdrawal Compliance</span>
                    </Link>
                    <Link to="/authority/analytics/lab-reports" className="flex items-center px-4 py-2 text-gray-700 hover:bg-blue-50 transition">
                      <span className="mr-2">🧪</span>
                      <span>Laboratory Reports</span>
                    </Link>
                    <Link to="/authority/india-map-heatmap" className="flex items-center px-4 py-2 text-gray-700 hover:bg-blue-50 transition">
                      <span className="mr-2">🗺️</span>
                      <span>AMU State Heat Map</span>
                    </Link>
                    <Link to="/authority/analytics/risky-farms" className="flex items-center px-4 py-2 text-gray-700 hover:bg-blue-50 transition">
                      <span className="mr-2">🏡</span>
                      <span>Farm-Level Insights</span>
                    </Link>
                    <Link to="/authority/biomass-analytics" className="flex items-center px-4 py-2 text-gray-700 hover:bg-blue-50 transition">
                      <span className="mr-2">⚖️</span>
                      <span>Biomass-Based AMU Usage</span>
                    </Link>
                    <Link to="/authority/feed-nutrition-analytics" className="flex items-center px-4 py-2 text-gray-700 hover:bg-blue-50 transition">
                      <span className="mr-2">🌾</span>
                      <span>Feed-Nutrition Risk Analytics</span>
                    </Link>
                  </div>
                </div>
              </div>

              <Link
                to="/authority/map-view"
                className="text-white hover:bg-primary-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <span>🗺️</span>
                <span>Maps</span>
              </Link>

              <Link
                to="/authority/complaints"
                className="text-white hover:bg-primary-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <span>🚨</span>
                <span>Alerts</span>
              </Link>

              <Link
                to="/authority/loan-applications"
                className="text-white hover:bg-primary-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <span>💼</span>
                <span>Loan Applications</span>
              </Link>

              <Link
                to="/authority/treatment-reports"
                className="text-white hover:bg-primary-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <span>📄</span>
                <span>Treatment Reports</span>
              </Link>
            </div>

            {/* Right section - Profile & Logout */}
            <div className="hidden md:flex items-center space-x-4">
              <Link
                to="/authority/profile"
                className="flex items-center space-x-2 bg-primary-700 hover:bg-primary-800 px-4 py-2 rounded-lg transition-colors"
              >
                <span className="text-white text-sm">👤</span>
                <div className="hidden lg:block text-left">
                  <div className="text-white text-sm font-medium">{user.display_name || user.email}</div>
                  <div className="text-primary-100 text-xs">Authority</div>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                className="text-white hover:bg-red-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 bg-red-500"
              >
                <span>🚪</span>
                <span>Logout</span>
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
          <div className="bg-primary-600 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">🏛️</span>
                <span className="text-white text-xl font-bold">Authority Portal</span>
              </div>
              <button
                onClick={closeMobileMenu}
                className="text-white p-2 hover:bg-primary-700 rounded-lg transition-colors"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-primary-500">
              <div className="text-white text-sm font-medium">{user.display_name || user.email}</div>
              <div className="text-primary-100 text-xs">Authority</div>
            </div>
          </div>

          <div className="p-4 space-y-2">
            <Link
              to="/authority/dashboard"
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={closeMobileMenu}
            >
              <span className="text-xl">📊</span>
              <span className="font-medium">Dashboard</span>
            </Link>

            {/* Analytics Section */}
            <div className="px-2 py-2">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Analytics Dashboard</p>
              <div className="space-y-1">
                <Link
                  to="/authority/enhanced-analytics"
                  className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
                  onClick={closeMobileMenu}
                >
                  <span className="text-lg">📊</span>
                  <span className="text-sm">Overview</span>
                </Link>
                <Link
                  to="/authority/analytics/antibiotic-usage"
                  className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
                  onClick={closeMobileMenu}
                >
                  <span className="text-lg">💊</span>
                  <span className="text-sm">Antibiotic Usage</span>
                </Link>
                <Link
                  to="/authority/analytics/withdrawal-compliance"
                  className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
                  onClick={closeMobileMenu}
                >
                  <span className="text-lg">📅</span>
                  <span className="text-sm">Withdrawal Compliance</span>
                </Link>
                <Link
                  to="/authority/analytics/lab-reports"
                  className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
                  onClick={closeMobileMenu}
                >
                  <span className="text-lg">🧪</span>
                  <span className="text-sm">Lab Reports</span>
                </Link>
                <Link
                  to="/authority/india-map-heatmap"
                  className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
                  onClick={closeMobileMenu}
                >
                  <span className="text-lg">🗺️</span>
                  <span className="text-sm">India Heat Map</span>
                </Link>
                <Link
                  to="/authority/analytics/risky-farms"
                  className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
                  onClick={closeMobileMenu}
                >
                  <span className="text-lg">🏡</span>
                  <span className="text-sm">Farm Insights</span>
                </Link>
                <Link
                  to="/authority/biomass-analytics"
                  className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
                  onClick={closeMobileMenu}
                >
                  <span className="text-lg">⚖️</span>
                  <span className="text-sm">Biomass-Based AMU</span>
                </Link>
                <Link
                  to="/authority/feed-nutrition-analytics"
                  className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
                  onClick={closeMobileMenu}
                >
                  <span className="text-lg">🌾</span>
                  <span className="text-sm">Feed-Nutrition Risk</span>
                </Link>
              </div>
            </div>

            <Link
              to="/authority/map-view"
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={closeMobileMenu}
            >
              <span className="text-xl">🗺️</span>
              <span className="font-medium">Maps</span>
            </Link>

            <Link
              to="/authority/complaints"
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={closeMobileMenu}
            >
              <span className="text-xl">🚨</span>
              <span className="font-medium">Alerts</span>
            </Link>

            <Link
              to="/authority/loan-applications"
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={closeMobileMenu}
            >
              <span className="text-xl">💼</span>
              <span className="font-medium">Loan Applications</span>
            </Link>

            <Link
              to="/authority/treatment-reports"
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={closeMobileMenu}
            >
              <span className="text-xl">📄</span>
              <span className="font-medium">Treatment Reports</span>
            </Link>

            <Link
              to="/authority/profile"
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={closeMobileMenu}
            >
              <span className="text-xl">👤</span>
              <span className="font-medium">Profile</span>
            </Link>

            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors mt-4"
            >
              <span className="text-xl">🚪</span>
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden animate-fade-in"
          onClick={closeMobileMenu}
          aria-hidden="true"
        ></div>
      )}

      {/* Spacer */}
      <div className="h-16"></div>
    </>
  );
};

export default AuthorityNavigation;
