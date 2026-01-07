import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { estimateSnapshotAPI } from '../services/api';
import './ProjectHeader.css';

const ProjectHeader = ({ projectName, moduleName, onProjectNameChange }) => {
  const navigate = useNavigate();
  const { project, clearProject } = useProject();
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  // Use project from context if available, fallback to prop
  const currentProjectName = project?.name || projectName;

  const handleSaveAndClose = async () => {
    if (!currentProjectName) return;

    try {
      setIsSaving(true);
      await estimateSnapshotAPI.saveAndCloseProject(currentProjectName);
      // Navigate to Home - Home page will handle clearing the project context
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error saving and closing project:', error);
      alert('Failed to save and close project. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = async () => {
    if (!currentProjectName) return;

    const confirmed = window.confirm(
      'This will permanently delete all estimates and data for this project. This action cannot be undone.\n\nAre you sure you want to discard this project?'
    );

    if (!confirmed) return;

    try {
      setIsDiscarding(true);
      await estimateSnapshotAPI.discardProject(currentProjectName);
      // Navigate to Home - Home page will handle clearing the project context
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error discarding project:', error);
      alert('Failed to discard project. Please try again.');
    } finally {
      setIsDiscarding(false);
    }
  };

  return (
    <div className="project-header">
      {currentProjectName && (
        <div className="project-name-banner">
          <span className="project-label">Current Project:</span>
          <span className="project-name-value">{currentProjectName}</span>
        </div>
      )}
      {currentProjectName && (
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
        {currentProjectName && (
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

