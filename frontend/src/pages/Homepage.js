import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Homepage.css';

const Homepage = () => {
  const navigate = useNavigate();

  return (
    <div className="homepage">
      <header className="hero">
        <div className="hero-overlay"></div>
        <nav className="navbar">
          <div className="nav-brand">
            <span className="brand-icon">🌾</span>
            <h1>FarmTrack</h1>
          </div>
          <div className="nav-links">
            <button onClick={() => navigate('/login')} className="nav-btn">Login</button>
            <button onClick={() => navigate('/register')} className="nav-btn-primary">Get Started</button>
          </div>
        </nav>
        
        <div className="hero-content">
          <h1 className="hero-title">Smart Farm Management System</h1>
          <p className="hero-subtitle">
            Track your livestock, manage treatments, ensure food safety compliance
          </p>
          <div className="hero-buttons">
            <button onClick={() => navigate('/register')} className="btn-hero-primary">
              Start Free Trial
            </button>
            <button onClick={() => navigate('/verify')} className="btn-hero-secondary">
              Verify QR Code
            </button>
          </div>
          
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">10,000+</span>
              <span className="stat-label">Farmers</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">50,000+</span>
              <span className="stat-label">Animals Tracked</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">100%</span>
              <span className="stat-label">MRL Compliance</span>
            </div>
          </div>
        </div>
      </header>

      <section className="features">
        <h2 className="section-title">Comprehensive Farm Management</h2>
        <p className="section-subtitle">Everything you need to manage your livestock farm efficiently</p>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🐄</div>
            <h3>Animal Tracking</h3>
            <p>Track individual animals or batches with unique IDs, breeding records, and health history</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">💊</div>
            <h3>Treatment Records</h3>
            <p>Maintain complete medical history, vaccination schedules, and antibiotic usage logs</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🔬</div>
            <h3>MRL Compliance</h3>
            <p>Automatic maximum residue limit checking to ensure food safety standards</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3>QR Code System</h3>
            <p>Generate and verify QR codes for product traceability and authentication</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>FarmTrack</h3>
            <p>Empowering farmers with digital solutions for sustainable livestock management and food safety compliance</p>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2025 FarmTrack. Built for Farmers, by Innovation.</p>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
