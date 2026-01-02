import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  return (
    <div className="home-container">
      <div className="home-hero">
        <div className="hero-content">
          <h1>Satori Group ERP</h1>
          <p className="hero-subtitle">
            Comprehensive environmental services & solutions since 2001. 
            SBA-certified woman-owned small business delivering expert environmental consulting, 
            hazardous materials remediation, and safety training.
          </p>
          <div className="hero-features">
            <div className="feature-card">
              <div className="feature-icon">🏆</div>
              <h3>20+ Years Experience</h3>
              <p>Two decades of industry expertise and proven track record</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🌍</div>
              <h3>National & International</h3>
              <p>From remote Alaskan villages to metropolitan areas</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">✅</div>
              <h3>Certified Professionals</h3>
              <p>Committed to safety and regulatory compliance</p>
            </div>
          </div>
          <div className="hero-actions">
            <Link to="/hrs-estimator" className="cta-button primary">
              HRS Sample Estimator
            </Link>
            <Link to="/lab-fees" className="cta-button secondary">
              Lab Fee Calculator
            </Link>
            <Link to="/logistics" className="cta-button secondary">
              Logistics Estimator
            </Link>
            <Link to="/project-summary" className="cta-button secondary">
              Project Estimate Summary
            </Link>
            <Link to="/previous-estimates" className="cta-button secondary">
              Previous Estimates
            </Link>
          </div>
        </div>
      </div>

      <div className="home-services">
        <div className="services-content">
          <h2>Our Core Services</h2>
          <div className="services-grid">
            <div className="service-card">
              <h3>🔬 Environmental Consulting & Assessment</h3>
              <p>Hazardous building materials surveys, Phase I & II environmental site assessments, 
                 industrial hygiene services, groundwater investigations, soil remediation, and AHERA school inspections</p>
            </div>
            <div className="service-card">
              <h3>🛡️ Professional Abatement Services</h3>
              <p>Asbestos removal and management, lead-based paint remediation, mold detection and removal, 
                 with full-service project management from inspection to clearance</p>
            </div>
            <div className="service-card">
              <h3>🏗️ Specialized Demolition</h3>
              <p>Total building demolition, selective interior dismantling, tank and silo removal, 
                 emergency response services, and commercial tenant improvements</p>
            </div>
            <div className="service-card">
              <h3>📚 Training & Certification</h3>
              <p>Asbestos courses, HAZWOPER training, lead-based paint courses, and general construction safety training</p>
            </div>
            <div className="service-card">
              <h3>🧪 Laboratory Services</h3>
              <p>Comprehensive laboratory testing including PCM/TEM air analysis, PLM bulk materials analysis, 
                 lead testing, mold analysis, and environmental chemistry services</p>
            </div>
            <div className="service-card">
              <h3>📊 Project Management</h3>
              <p>Full-service project management with responsive communication and reliable execution 
                 from initial assessment through final clearance</p>
            </div>
          </div>
        </div>
      </div>

      <div className="home-why-choose">
        <div className="why-choose-content">
          <h2>Why Choose Satori Group?</h2>
          <div className="why-choose-grid">
            <div className="why-item">
              <div className="why-icon">✓</div>
              <h4>20+ Years of Industry Experience</h4>
            </div>
            <div className="why-item">
              <div className="why-icon">✓</div>
              <h4>Certified Professionals with Extensive Expertise</h4>
            </div>
            <div className="why-item">
              <div className="why-icon">✓</div>
              <h4>National and International Project Capabilities</h4>
            </div>
            <div className="why-item">
              <div className="why-icon">✓</div>
              <h4>Commitment to Safety and Regulatory Compliance</h4>
            </div>
            <div className="why-item">
              <div className="why-icon">✓</div>
              <h4>Proven Track Record of Successful Projects</h4>
            </div>
            <div className="why-item">
              <div className="why-icon">✓</div>
              <h4>Responsive Communication and Reliable Project Management</h4>
            </div>
          </div>
        </div>
      </div>

      <div className="home-footer">
        <div className="footer-content">
          <h3>Ready to Get Started?</h3>
          <p>Access our ERP tools to manage lab fees and estimate field hours for your environmental projects</p>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/hrs-estimator" className="cta-button primary">
              HRS Sample Estimator
            </Link>
            <Link to="/lab-fees" className="cta-button primary">
              Lab Fee Calculator
            </Link>
            <Link to="/logistics" className="cta-button primary">
              Logistics Estimator
            </Link>
          </div>
          <div className="footer-info">
            <p className="footer-company">
              <strong>Satori Group, Inc.</strong> - Women-Owned Small Business<br/>
              Specializing in environmental services, hazardous materials surveys, remediation, and health and safety training
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
