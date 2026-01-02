import React, { useState, useEffect } from 'react';
import { projectSummaryAPI } from '../services/api';
import ProjectHeader from './ProjectHeader';
import './ProjectEstimateSummary.css';

const ProjectEstimateSummary = () => {
  const [projectName, setProjectName] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load project name from localStorage on mount
  useEffect(() => {
    const savedProjectName = localStorage.getItem('currentProjectName');
    if (savedProjectName) {
      setProjectName(savedProjectName);
      fetchSummary(savedProjectName);
    } else {
      setLoading(false);
      setError('No project selected. Please select a project from one of the modules.');
    }
  }, []);

  const fetchSummary = async (name) => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectSummaryAPI.getEstimateSummary(name);
      setSummary(data);
    } catch (err) {
      console.error('Error fetching summary:', err);
      setError('Failed to load project estimate summary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) {
      return 'Not generated yet';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getModuleDisplayName = (moduleName) => {
    const names = {
      'hrs_estimator': 'HRS Estimator',
      'lab': 'Lab Fees',
      'logistics': 'Logistics'
    };
    return names[moduleName] || moduleName;
  };

  if (loading) {
    return (
      <div className="summary-container">
        <ProjectHeader projectName={projectName} moduleName="summary" />
        <div className="summary-content">
          <div className="loading-message">Loading project estimate summary...</div>
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="summary-container">
        <ProjectHeader projectName={projectName} moduleName="summary" />
        <div className="summary-content">
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="summary-container">
      <ProjectHeader projectName={projectName} moduleName="summary" />
      <div className="summary-content">
        <div className="summary-header">
          <h1>Project Estimate Summary</h1>
          <p className="summary-subtitle">
            Read-only summary of all module estimates for this project.
            Estimates are automatically updated when generated in each module.
          </p>
        </div>

        {summary && (
          <div className="summary-card">
            <div className="summary-project-name">
              <span className="project-label">Project:</span>
              <span className="project-name-value">{summary.project_name}</span>
            </div>

            <div className="modules-list">
              <div className="module-item">
                <div className="module-name">{getModuleDisplayName('hrs_estimator')}</div>
                <div className={`module-value ${summary.modules.hrs_estimator === null ? 'not-generated' : ''}`}>
                  {formatCurrency(summary.modules.hrs_estimator)}
                </div>
              </div>

              <div className="module-item">
                <div className="module-name">{getModuleDisplayName('lab')}</div>
                <div className={`module-value ${summary.modules.lab === null ? 'not-generated' : ''}`}>
                  {formatCurrency(summary.modules.lab)}
                </div>
              </div>

              <div className="module-item">
                <div className="module-name">{getModuleDisplayName('logistics')}</div>
                <div className={`module-value ${summary.modules.logistics === null ? 'not-generated' : ''}`}>
                  {formatCurrency(summary.modules.logistics)}
                </div>
              </div>
            </div>

            <div className="grand-total-section">
              <div className="grand-total-label">Grand Total</div>
              <div className="grand-total-value">
                {formatCurrency(summary.grand_total)}
              </div>
            </div>

            <div className="summary-note">
              <p>
                <strong>Note:</strong> This is a read-only summary. 
                To generate or update estimates, use the individual module pages.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectEstimateSummary;

