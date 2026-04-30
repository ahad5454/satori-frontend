import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { authAPI } from '../services/api';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const { clearProject } = useProject();

  // Clear project context when Home page loads (project-agnostic)
  useEffect(() => {
    clearProject();
  }, [clearProject]);

  const handleModuleClick = (modulePath) => {
    // Always redirect to project selection with intended destination
    navigate('/select-project', { state: { from: modulePath } });
  };

  return (
    <div className="home-container">
      <div className="home-hero">
        <div className="hero-content">
          <h1>Satori Group ERP</h1>
          <p className="hero-subtitle">
            Internal Enterprise Resource Planning System
          </p>

          {/* User Info & Logout */}
          <div className="user-info-bar">
            <span className="user-email">{localStorage.getItem('user_email') || 'User'}</span>
            <span className="user-role-badge">{localStorage.getItem('user_role') || 'user'}</span>
            <button
              onClick={() => {
                authAPI.logout();
                navigate('/login', { replace: true });
              }}
              className="logout-button"
            >
              Sign Out
            </button>
          </div>

          {/* Dashboard Actions - Replaces Marketing Features */}
          <div className="hero-actions dashboard-grid">
            {/* Main Action - Full Width or Prominent */}
            <div className="action-group primary">
              <button
                onClick={() => navigate('/select-project', { state: { mode: 'create' } })}
                className="cta-button primary-large"
              >
                <div className="icon-container-primary">
                  <span className="material-icon">+</span>
                </div>
                <div className="btn-content">
                  <span className="btn-title">Create New Project</span>
                  <span className="btn-desc">Start a new estimation or lab order</span>
                </div>
              </button>
            </div>

            {/* Modules Grid - Left Aligned, Professional Cards */}
            <div className="action-group modules">
              <button
                onClick={() => handleModuleClick('/hrs-estimator')}
                className="module-card"
              >
                <div className="module-icon-container hrs-theme">
                  <span className="module-initial">H</span>
                </div>
                <div className="module-content">
                  <h3>HRS Estimator</h3>
                  <p>Sample quantities & hours</p>
                </div>
              </button>

              <button
                onClick={() => handleModuleClick('/lab-fees')}
                className="module-card"
              >
                <div className="module-icon-container lab-theme">
                  <span className="module-initial">L</span>
                </div>
                <div className="module-content">
                  <h3>Lab Fees</h3>
                  <p>Calculate lab costs</p>
                </div>
              </button>

              <button
                onClick={() => handleModuleClick('/logistics')}
                className="module-card"
              >
                <div className="module-icon-container logistics-theme">
                  <span className="module-initial">T</span>
                </div>
                <div className="module-content">
                  <h3>Logistics</h3>
                  <p>Field logistics estimator</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/previous-estimates')}
                className="module-card history-theme"
              >
                <div className="module-icon-container history-icon">
                  <span className="module-initial">↩</span>
                </div>
                <div className="module-content">
                  <h3>Previous Estimates</h3>
                  <p>View project history</p>
                </div>
              </button>

              {/* Admin Dashboard - Only visible to admins */}
              {localStorage.getItem('user_role') === 'admin' && (
                <button
                  onClick={() => navigate('/admin')}
                  className="module-card admin-theme"
                >
                  <div className="module-icon-container admin-icon">
                    <span className="module-initial">⚙</span>
                  </div>
                  <div className="module-content">
                    <h3>Admin Dashboard</h3>
                    <p>Manage users & roles</p>
                  </div>
                </button>
              )}
            </div>
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
            <button
              onClick={() => navigate('/select-project', { state: { mode: 'create' } })}
              className="cta-button primary"
            >
              Create New Project
            </button>
            <button
              onClick={() => handleModuleClick('/hrs-estimator')}
              className="cta-button primary"
            >
              HRS Sample Estimator
            </button>
            <button
              onClick={() => handleModuleClick('/lab-fees')}
              className="cta-button primary"
            >
              Lab Fee Calculator
            </button>
            <button
              onClick={() => handleModuleClick('/logistics')}
              className="cta-button primary"
            >
              Logistics Estimator
            </button>
            <button
              onClick={() => navigate('/previous-estimates')}
              className="cta-button primary"
            >
              View Previous Estimates
            </button>
          </div>
          <div className="footer-info">
            <p className="footer-company">
              <strong>Satori Group, Inc.</strong> - Women-Owned Small Business<br />
              Specializing in environmental services, hazardous materials surveys, remediation, and health and safety training
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
