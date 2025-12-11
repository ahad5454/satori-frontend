import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ProjectHeader.css';

const ProjectHeader = ({ projectName, moduleName, onProjectNameChange }) => {
  const navigate = useNavigate();

  return (
    <div className="project-header">
      {projectName && (
        <div className="project-name-banner">
          <span className="project-label">Current Project:</span>
          <span className="project-name-value">{projectName}</span>
        </div>
      )}
      <div className="module-navigation">
        <button
          className={`nav-module-btn ${moduleName === 'hrs' ? 'active' : ''}`}
          onClick={() => navigate('/hrs-estimator')}
        >
          📊 HRS Sample Estimator
        </button>
        <button
          className={`nav-module-btn ${moduleName === 'lab' ? 'active' : ''}`}
          onClick={() => navigate('/lab-fees')}
        >
          🧪 Lab Fee Calculator
        </button>
        <button
          className={`nav-module-btn ${moduleName === 'logistics' ? 'active' : ''}`}
          onClick={() => navigate('/logistics')}
        >
          🚚 Logistics Estimator
        </button>
      </div>
    </div>
  );
};

export default ProjectHeader;

