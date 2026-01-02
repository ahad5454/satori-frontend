import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { estimateSnapshotAPI } from '../services/api';
import './ProjectHeader.css';

const ProjectHeader = ({ projectName, moduleName, onProjectNameChange }) => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  const handleSaveAndClose = async () => {
    if (!projectName) return;
    
    try {
      setIsSaving(true);
      await estimateSnapshotAPI.saveAndCloseProject(projectName);
      // Clear project from localStorage
      localStorage.removeItem('currentProjectName');
      // Redirect to Home
      navigate('/');
    } catch (error) {
      console.error('Error saving and closing project:', error);
      alert('Failed to save and close project. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = async () => {
    if (!projectName) return;
    
    const confirmed = window.confirm(
      'This will permanently delete all estimates and data for this project. This action cannot be undone.\n\nAre you sure you want to discard this project?'
    );
    
    if (!confirmed) return;
    
    try {
      setIsDiscarding(true);
      await estimateSnapshotAPI.discardProject(projectName);
      // Clear project from localStorage
      localStorage.removeItem('currentProjectName');
      // Redirect to Home
      navigate('/');
    } catch (error) {
      console.error('Error discarding project:', error);
      alert('Failed to discard project. Please try again.');
    } finally {
      setIsDiscarding(false);
    }
  };

  return (
    <div className="project-header">
      {projectName && (
        <div className="project-name-banner">
          <span className="project-label">Current Project:</span>
          <span className="project-name-value">{projectName}</span>
        </div>
      )}
      {projectName && (
        <div className="project-actions">
          <button
            className="btn-save-close"
            onClick={handleSaveAndClose}
            disabled={isSaving || isDiscarding}
          >
            {isSaving ? 'Saving...' : 'Save & Close Project'}
          </button>
          <button
            className="btn-discard"
            onClick={handleDiscard}
            disabled={isSaving || isDiscarding}
          >
            {isDiscarding ? 'Discarding...' : 'Discard Project Details'}
          </button>
        </div>
      )}
      <div className="module-navigation">
        <button
          className={`nav-module-btn ${moduleName === 'hrs' ? 'active' : ''}`}
          onClick={() => navigate('/hrs-estimator')}
        >
          HRS Sample Estimator
        </button>
        <button
          className={`nav-module-btn ${moduleName === 'lab' ? 'active' : ''}`}
          onClick={() => navigate('/lab-fees')}
        >
          Lab Fee Calculator
        </button>
        <button
          className={`nav-module-btn ${moduleName === 'logistics' ? 'active' : ''}`}
          onClick={() => navigate('/logistics')}
        >
          Logistics Estimator
        </button>
        {projectName && (
          <>
            <button
              className={`nav-module-btn ${moduleName === 'summary' ? 'active' : ''}`}
              onClick={() => navigate('/project-summary')}
            >
              Project Summary
            </button>
            <button
              className={`nav-module-btn ${moduleName === 'estimates' ? 'active' : ''}`}
              onClick={() => navigate('/previous-estimates')}
            >
              Previous Estimates
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ProjectHeader;

