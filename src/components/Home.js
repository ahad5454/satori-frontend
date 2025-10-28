import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  return (
    <div className="home-container">
      <div className="home-hero">
        <div className="hero-content">
          <h1>Satori ERP Running!</h1>
          <p className="hero-subtitle">
            Lab Services Module has been implemented successfully
          </p>
          <div className="hero-features">
            <div className="feature-card">
              <div className="feature-icon">🔬</div>
              <h3>Professional Testing</h3>
              <p>State-of-the-art laboratory equipment and certified technicians</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Fast Turnaround</h3>
              <p>Multiple turnaround options from 3 hours to 2 weeks</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h3>Competitive Pricing</h3>
              <p>Transparent pricing with quantity discounts available</p>
            </div>
          </div>
          <div className="hero-actions">
            <Link to="/lab-fees" className="cta-button primary">
              View Lab Services
            </Link>
            <Link to="/lab-fees" className="cta-button secondary">
              Get Quote
            </Link>
          </div>
        </div>
      </div>

      <div className="home-services">
        <div className="services-content">
          <h2>Our Laboratory Services</h2>
          <div className="services-grid">
            <div className="service-card">
              <h3>🔬 Air Analysis</h3>
              <p>PCM and TEM air analysis services for asbestos detection</p>
            </div>
            <div className="service-card">
              <h3>🏗️ Building Materials</h3>
              <p>PLM analysis of bulk building materials and problem matrices</p>
            </div>
            <div className="service-card">
              <h3>🧪 Lead Testing</h3>
              <p>Comprehensive lead laboratory services including TCLP analysis</p>
            </div>
            <div className="service-card">
              <h3>🦠 Mold Analysis</h3>
              <p>Professional mold testing and spore trap analysis</p>
            </div>
            <div className="service-card">
              <h3>🌍 Environmental Chemistry</h3>
              <p>PCB and environmental contaminant testing services</p>
            </div>
            <div className="service-card">
              <h3>🌱 Soil & Rock Analysis</h3>
              <p>Specialized testing for soil, rock, and vermiculite samples</p>
            </div>
          </div>
        </div>
      </div>

      <div className="home-footer">
        <div className="footer-content">
          <h3>Ready to Get Started?</h3>
          <p>Contact our team for personalized service and competitive quotes</p>
          <Link to="/lab-fees" className="cta-button primary">
            Explore Our Services
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
