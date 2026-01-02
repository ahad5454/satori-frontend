import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { estimateSnapshotAPI } from '../services/api';
import ProjectHeader from './ProjectHeader';
import './PreviousEstimates.css';

const PreviousEstimates = () => {
  const navigate = useNavigate();
  const [projectsWithSnapshots, setProjectsWithSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load global estimate history on mount (no project dependency)
  useEffect(() => {
    fetchGlobalHistory();
  }, []);

  const fetchGlobalHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await estimateSnapshotAPI.getGlobalHistory();
      setProjectsWithSnapshots(data);
    } catch (err) {
      console.error('Error fetching global history:', err);
      setError('Failed to load estimate history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) {
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const handleOpenSnapshot = async (snapshotId, projectName) => {
    try {
      const snapshot = await estimateSnapshotAPI.getSnapshot(snapshotId);
      // Set project name in localStorage so modules can use it
      localStorage.setItem('currentProjectName', projectName);
      // Duplicate it to make it active and editable
      await estimateSnapshotAPI.duplicateSnapshot(projectName);
      // Refresh the list
      fetchGlobalHistory();
      // Navigate to project summary to see the updated estimate
      navigate('/project-summary');
    } catch (err) {
      console.error('Error opening snapshot:', err);
      alert('Failed to open estimate. Please try again.');
    }
  };

  const handleViewSnapshot = (snapshotId) => {
    // Navigate to detail view
    navigate(`/snapshots/${snapshotId}/details`);
  };

  const handleDeleteSnapshot = async (snapshotId) => {
    const confirmed = window.confirm(
      'This will permanently delete this estimate. This action cannot be undone.\n\nAre you sure you want to delete this estimate?'
    );
    
    if (!confirmed) return;
    
    try {
      await estimateSnapshotAPI.deleteSnapshot(snapshotId);
      // Refresh the global list
      fetchGlobalHistory();
    } catch (err) {
      console.error('Error deleting snapshot:', err);
      alert('Failed to delete estimate. Please try again.');
    }
  };

  // Get current project name from localStorage (if any) for ProjectHeader
  // This is optional - page works without it
  const currentProjectName = localStorage.getItem('currentProjectName') || '';

  if (loading) {
    return (
      <div className="previous-estimates-container">
        {currentProjectName && (
          <ProjectHeader projectName={currentProjectName} moduleName="estimates" />
        )}
        <div className="previous-estimates-content">
          <div className="loading-message">Loading estimate history...</div>
        </div>
      </div>
    );
  }

  if (error && projectsWithSnapshots.length === 0) {
    return (
      <div className="previous-estimates-container">
        {currentProjectName && (
          <ProjectHeader projectName={currentProjectName} moduleName="estimates" />
        )}
        <div className="previous-estimates-content">
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  const totalSnapshots = projectsWithSnapshots.reduce((sum, project) => sum + project.snapshots.length, 0);

  return (
    <div className="previous-estimates-container">
      {currentProjectName && (
        <ProjectHeader projectName={currentProjectName} moduleName="estimates" />
      )}
      <div className="previous-estimates-content">
        <div className="estimates-header">
          <h1>Previous Estimates</h1>
          <p className="estimates-subtitle">
            View and manage estimate history across all projects.
            Click "Open as New Estimate" to create a new estimate based on a previous one.
          </p>
        </div>

        {totalSnapshots === 0 ? (
          <div className="no-estimates">
            <p>No estimates found.</p>
            <p>Generate estimates in the modules to see them here.</p>
          </div>
        ) : (
          <div className="projects-list">
            {projectsWithSnapshots.map((project) => (
              <div key={project.project_name} className="project-group">
                <div className="project-group-header">
                  <h2 className="project-group-title">{project.project_name}</h2>
                  <span className="project-snapshot-count">
                    {project.snapshots.length} {project.snapshots.length === 1 ? 'estimate' : 'estimates'}
                  </span>
                </div>
                <div className="snapshots-list">
                  {project.snapshots.map((snapshot) => (
                    <div
                      key={snapshot.id}
                      className={`snapshot-card ${snapshot.is_active ? 'active' : ''}`}
                    >
                      <div className="snapshot-header">
                        <div className="snapshot-title">
                          {snapshot.snapshot_name || `Estimate #${snapshot.id}`}
                          {snapshot.is_active && (
                            <span className="active-badge">Active</span>
                          )}
                        </div>
                        <div className="snapshot-date">
                          {formatDate(snapshot.created_at)}
                        </div>
                      </div>

                      <div className="snapshot-totals">
                        <div className="module-total">
                          <span className="module-label">HRS Estimator:</span>
                          <span className="module-value">
                            {formatCurrency(snapshot.hrs_estimator_total)}
                          </span>
                        </div>
                        <div className="module-total">
                          <span className="module-label">Lab Fees:</span>
                          <span className="module-value">
                            {formatCurrency(snapshot.lab_fees_total)}
                          </span>
                        </div>
                        <div className="module-total">
                          <span className="module-label">Logistics:</span>
                          <span className="module-value">
                            {formatCurrency(snapshot.logistics_total)}
                          </span>
                        </div>
                        <div className="grand-total">
                          <span className="total-label">Grand Total:</span>
                          <span className="total-value">
                            {formatCurrency(snapshot.grand_total)}
                          </span>
                        </div>
                      </div>

                      <div className="snapshot-actions">
                        <button
                          className="btn-view"
                          onClick={() => handleViewSnapshot(snapshot.id)}
                        >
                          View Details
                        </button>
                        {!snapshot.is_active && (
                          <button
                            className="btn-open"
                            onClick={() => handleOpenSnapshot(snapshot.id, project.project_name)}
                          >
                            Open as New Estimate
                          </button>
                        )}
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteSnapshot(snapshot.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviousEstimates;
