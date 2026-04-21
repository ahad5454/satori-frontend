import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import ProjectHeader from './ProjectHeader';
import './Equipment.css';

const Equipment = () => {
  const navigate = useNavigate();
  const { project } = useProject();

  return (
    <div className="equipment-container">
      <nav className="app-top-nav">
        <button onClick={() => navigate('/')} className="nav-action-btn">
          Home
        </button>
        <div className="nav-title">
          <h1>Equipment Estimator</h1>
        </div>
        <div style={{ width: '150px' }}></div> {/* Spacer to match layout */}
      </nav>

      <ProjectHeader projectName={project?.name} moduleName="equipment" />

      <div className="equipment-content">
        <div className="equipment-hero">
          <div className="equipment-icon-ring">
            <span className="equipment-icon">🔧</span>
          </div>
          <h1>Equipment Estimator</h1>
          <p className="equipment-subtitle">
            Field equipment costs and rental estimates for your project
          </p>
        </div>

        <div className="equipment-coming-soon-card">
          <div className="coming-soon-badge">Coming Soon</div>
          <h2>Equipment Module Under Development</h2>
          <p>
            This module will allow you to estimate costs for field equipment,
            tools, and specialty gear required for each project. The equipment
            list is being finalized and will be available shortly.
          </p>
          <div className="coming-soon-features">
            <div className="feature-item">
              <span className="feature-icon">📋</span>
              <span>Equipment catalog with pricing</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <span>Per-day and per-project rental costs</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">💰</span>
              <span>Equipment subtotal included in project summary</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Equipment;
