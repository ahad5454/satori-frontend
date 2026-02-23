import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { projectSummaryAPI, estimateSnapshotAPI, labFeesAPI } from '../services/api';
import ProjectHeader from './ProjectHeader';
import HRSBreakdownDetails from './HRSBreakdownDetails';
import LabFeesBreakdownDetails from './LabFeesBreakdownDetails';
import LogisticsBreakdownDetails from './LogisticsBreakdownDetails';
import './ProjectEstimateSummary.css';

const ProjectEstimateSummary = () => {
  const navigate = useNavigate();
  const { project, handleProjectNotFound } = useProject();
  const [summary, setSummary] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedModules, setExpandedModules] = useState({
    hrs_estimator: false,
    lab: false,
    logistics: false
  });

  const fetchSummary = useCallback(async (name) => {
    try {
      setLoading(true);
      setError(null);
      const [summaryData, snapshotData] = await Promise.all([
        projectSummaryAPI.getEstimateSummary(name),
        estimateSnapshotAPI.getLatestSnapshot(name).catch(() => null) // Snapshot is optional
      ]);
      setSummary(summaryData);
      setSnapshot(snapshotData);

      // Fetch categories for Lab Fees breakdown from ALL labs
      if (snapshotData?.lab_fees_data) {
        try {
          const labs = await labFeesAPI.getLabs();
          const allCategories = [];
          for (const lab of labs) {
            const labCategories = await labFeesAPI.getCategoriesForLab(lab.id);
            // Tag each category with its lab name for attribution
            labCategories.forEach(cat => {
              cat.labName = lab.name;
              cat.labId = lab.id;
            });
            allCategories.push(...labCategories);
          }
          setCategories(allCategories);
        } catch (err) {
          console.warn('Could not fetch categories for breakdown:', err);
        }
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
      if (err.response?.status === 404) {
        handleProjectNotFound();
      } else {
        setError('Failed to load project estimate summary. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [handleProjectNotFound]);

  const toggleModule = (moduleName) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleName]: !prev[moduleName]
    }));
  };

  // Fetch summary when project is available
  useEffect(() => {
    if (project && project.name) {
      fetchSummary(project.name);
    } else {
      setLoading(false);
      setError('No project selected. Please select a project to view summary.');
    }
  }, [project, fetchSummary]);

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
        <ProjectHeader projectName={project?.name} moduleName="summary" />
        <div className="summary-content">
          <div className="loading-message">Loading project estimate summary...</div>
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="summary-container">
        <ProjectHeader projectName={project?.name} moduleName="summary" />
        <div className="summary-content">
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="summary-container">
      <nav className="app-top-nav">
        <a href="/" onClick={(e) => { e.preventDefault(); import('react-router-dom').then(m => window.location.href = '/'); /* Fallback usage if Link not imported */ }} className="nav-link" style={{ display: 'none' }}>Home</a>
        {/* React Router Link would be better but I'll use the existing import linkage */}
        <button onClick={() => window.location.href = '/'} className="nav-action-btn">
          Home
        </button>
        <div className="nav-title">
          <h1>Project Estimate Summary</h1>
        </div>
        <button
          className="nav-action-btn"
          onClick={() => window.location.href = '/previous-estimates'}
        >
          View Previous Estimates
        </button>
      </nav>

      <ProjectHeader projectName={project?.name} moduleName="summary" />
      <div className="summary-content">
        <div className="summary-header">
          <p className="summary-subtitle">
            Read-only summary of all module estimates for this project.
            Estimates are automatically updated when generated in each module.
          </p>
        </div>

        {/* Project Details Section */}
        {project && (
          <div className="project-details-card">
            <h2>Project Details</h2>
            <div className="project-details-content">
              <div className="project-detail-item">
                <span className="project-detail-label">Project Name:</span>
                <span className="project-detail-value">{project.name}</span>
              </div>
              {project.address && (
                <div className="project-detail-item">
                  <span className="project-detail-label">Address:</span>
                  <span className="project-detail-value">{project.address}</span>
                </div>
              )}
              {project.description && (
                <div className="project-detail-item">
                  <span className="project-detail-label">Description:</span>
                  <span className="project-detail-value">{project.description}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {summary && (
          <div className="summary-card">
            <div className="summary-project-name">
              <span className="project-label">Project:</span>
              <span className="project-name-value">{summary.project_name}</span>
            </div>

            <div className="modules-list">
              {/* HRS Estimator Module */}
              <div className="module-item-expandable">
                <div
                  className="module-item-header"
                  onClick={() => summary.modules.hrs_estimator !== null && toggleModule('hrs_estimator')}
                  style={{ cursor: summary.modules.hrs_estimator !== null ? 'pointer' : 'default' }}
                >
                  <div className="module-name">{getModuleDisplayName('hrs_estimator')}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className={`module-value ${summary.modules.hrs_estimator === null ? 'not-generated' : ''}`}>
                      {formatCurrency(summary.modules.hrs_estimator)}
                    </div>
                    {summary.modules.hrs_estimator !== null && (
                      <span className="toggle-icon" style={{ fontSize: '1.2rem' }}>
                        {expandedModules.hrs_estimator ? '▼' : '▶'}
                      </span>
                    )}
                  </div>
                </div>
                {expandedModules.hrs_estimator && snapshot?.hrs_estimator_data && (
                  <div className="module-breakdown-content">
                    <HRSBreakdownDetails
                      details={snapshot.hrs_estimator_data.outputs || {}}
                      inputs={snapshot.hrs_estimator_data.inputs || {}}
                    />
                  </div>
                )}
              </div>

              {/* Lab Fees Module */}
              <div className="module-item-expandable">
                <div
                  className="module-item-header"
                  onClick={() => summary.modules.lab !== null && toggleModule('lab')}
                  style={{ cursor: summary.modules.lab !== null ? 'pointer' : 'default' }}
                >
                  <div className="module-name">{getModuleDisplayName('lab')}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className={`module-value ${summary.modules.lab === null ? 'not-generated' : ''}`}>
                      {formatCurrency(summary.modules.lab)}
                    </div>
                    {summary.modules.lab !== null && (
                      <span className="toggle-icon" style={{ fontSize: '1.2rem' }}>
                        {expandedModules.lab ? '▼' : '▶'}
                      </span>
                    )}
                  </div>
                </div>
                {expandedModules.lab && snapshot?.lab_fees_data && (
                  <div className="module-breakdown-content">
                    <LabFeesBreakdownDetails
                      details={snapshot.lab_fees_data.outputs || {}}
                      inputs={snapshot.lab_fees_data.inputs || {}}
                      categories={categories}
                    />
                  </div>
                )}
              </div>

              {/* Logistics Module */}
              <div className="module-item-expandable">
                <div
                  className="module-item-header"
                  onClick={() => summary.modules.logistics !== null && toggleModule('logistics')}
                  style={{ cursor: summary.modules.logistics !== null ? 'pointer' : 'default' }}
                >
                  <div className="module-name">{getModuleDisplayName('logistics')}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className={`module-value ${summary.modules.logistics === null ? 'not-generated' : ''}`}>
                      {formatCurrency(summary.modules.logistics)}
                    </div>
                    {summary.modules.logistics !== null && (
                      <span className="toggle-icon" style={{ fontSize: '1.2rem' }}>
                        {expandedModules.logistics ? '▼' : '▶'}
                      </span>
                    )}
                  </div>
                </div>
                {expandedModules.logistics && snapshot?.logistics_data && (
                  <div className="module-breakdown-content">
                    <LogisticsBreakdownDetails
                      details={snapshot.logistics_data.outputs || {}}
                    />
                  </div>
                )}
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

