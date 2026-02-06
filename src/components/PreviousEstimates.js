import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { estimateSnapshotAPI, projectAPI } from '../services/api';
import ProjectHeader from './ProjectHeader';
import './PreviousEstimates.css';

const PreviousEstimates = () => {
  const navigate = useNavigate();
  const { project, setCurrentProject, clearProject } = useProject();
  const [projectsWithSnapshots, setProjectsWithSnapshots] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
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
      // Sort by creation date (most recent first), then by name if dates are equal
      const sortedData = data.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
        const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
        if (dateB.getTime() !== dateA.getTime()) {
          return dateB.getTime() - dateA.getTime(); // Most recent first
        }
        return a.project_name.localeCompare(b.project_name);
      });
      setProjectsWithSnapshots(sortedData);
      setFilteredProjects(sortedData);
    } catch (err) {
      console.error('Error fetching global history:', err);
      setError('Failed to load estimate history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter projects by search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProjects(projectsWithSnapshots);
    } else {
      const query = searchQuery.toLowerCase().trim();
      const filtered = projectsWithSnapshots.filter(project =>
        project.project_name.toLowerCase().includes(query)
      );
      setFilteredProjects(filtered);
    }
  }, [searchQuery, projectsWithSnapshots]);

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
      let projectData;
      // Get or set project context
      try {
        // Try to get project by name
        projectData = await projectAPI.getProjectByName(projectName);
      } catch (err) {
        // If project doesn't exist, create it
        // This handles edge cases where project was deleted but snapshot exists
        console.warn('Project not found, creating new project:', err);
        projectData = await projectAPI.createProject({
          name: projectName,
          address: 'Address not specified' // Default address for restored projects
        });
      }

      // Set project context FIRST before any other operations
      setCurrentProject(projectData);

      // Small delay to ensure context is set before navigation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Duplicate it to make it active and editable
      await estimateSnapshotAPI.duplicateSnapshot(projectName);
      // Refresh the list
      fetchGlobalHistory();
      // Navigate to project summary to see the updated estimate
      navigate('/project-summary', { replace: true });
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

  const handleDeleteProject = async (projectId, projectName) => {
    if (!projectId) {
      alert('Cannot delete this project: Project ID not available. This may be a legacy project.');
      return;
    }

    const confirmed = window.confirm(
      `⚠️ WARNING: This will permanently delete the project "${projectName}" and ALL of its data.\n\n` +
      `This includes:\n` +
      `- All estimate snapshots\n` +
      `- All project summaries\n` +
      `- All module estimates\n\n` +
      `This action CANNOT be undone.\n\n` +
      `Are you absolutely sure you want to delete this project?`
    );

    if (!confirmed) return;

    try {
      await projectAPI.deleteProject(projectId);

      // If the deleted project is the current project, clear the context
      if (project?.id === projectId) {
        clearProject();
      }

      // Refresh the global list
      fetchGlobalHistory();

      alert(`Project "${projectName}" has been deleted successfully.`);
    } catch (err) {
      console.error('Error deleting project:', err);
      if (err.response?.status === 404) {
        alert('Project not found. It may have already been deleted.');
        fetchGlobalHistory(); // Refresh to update the list
      } else {
        alert('Failed to delete project. Please try again.');
      }
    }
  };

  // Get current project name from localStorage (if any) for ProjectHeader
  // This is optional - page works without it
  // Previous Estimates is a global view - project context is optional
  const currentProjectName = project?.name || '';

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

  const totalSnapshots = filteredProjects.reduce((sum, project) => sum + project.snapshots.length, 0);

  return (
    <div className="previous-estimates-container">
      <nav className="app-top-nav">
        <button onClick={() => navigate('/')} className="nav-action-btn">
          Home
        </button>
        <div className="nav-title">
          <h1>Previous Estimates</h1>
        </div>
        <div style={{ width: '64px' }}></div> {/* Spacer for balance */}
      </nav>

      {currentProjectName && (
        <ProjectHeader projectName={currentProjectName} moduleName="estimates" />
      )}
      <div className="previous-estimates-content">
        <div className="estimates-header">
          <p className="estimates-subtitle">
            View and manage estimate history across all projects.
            Click "Open as New Estimate" to create a new estimate based on a previous one.
          </p>
          <div className="search-container">
            <input
              type="text"
              placeholder="Search projects by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {filteredProjects.length === 0 && !loading ? (
          <div className="no-estimates">
            <p>{searchQuery ? `No projects found matching "${searchQuery}"` : 'No estimates found.'}</p>
            {!searchQuery && <p>Generate estimates in the modules to see them here.</p>}
          </div>
        ) : (
          <div className="projects-list">
            {filteredProjects.map((project) => (
              <div key={project.project_name} className="project-group">
                <div className="project-group-header">
                  <h2 className="project-group-title">{project.project_name}</h2>
                  <div className="project-group-actions">
                    <span className="project-snapshot-count">
                      {project.snapshots.length} {project.snapshots.length === 1 ? 'estimate' : 'estimates'}
                    </span>
                    {project.project_id && (
                      <button
                        className="btn-delete-project"
                        onClick={() => handleDeleteProject(project.project_id, project.project_name)}
                        title="Delete this project and all its data"
                      >
                        Delete Project
                      </button>
                    )}
                  </div>
                </div>
                <div className="snapshots-list">
                  {project.snapshots.length === 0 ? (
                    <div className="no-snapshots-message">
                      <p>No estimates yet for this project.</p>
                      <p className="no-snapshots-hint">Generate estimates in the modules to see them here.</p>
                    </div>
                  ) : (
                    project.snapshots.map((snapshot) => (
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
                          {snapshot.is_active && (
                            <button
                              className="btn-resume"
                              onClick={async () => {
                                try {
                                  // Set project context
                                  let projectData;
                                  try {
                                    projectData = await projectAPI.getProjectByName(project.project_name);
                                  } catch (err) {
                                    projectData = await projectAPI.createProject({
                                      name: project.project_name,
                                      address: 'Address not specified'
                                    });
                                  }
                                  setCurrentProject(projectData);
                                  await new Promise(resolve => setTimeout(resolve, 100));
                                  // Navigate to project summary where they can access all modules
                                  navigate('/project-summary', { replace: true });
                                } catch (err) {
                                  console.error('Error resuming estimate:', err);
                                  alert('Failed to resume estimate. Please try again.');
                                }
                              }}
                              style={{
                                background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
                                color: 'white',
                                border: 'none',
                                padding: '10px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '0.9rem'
                              }}
                            >
                              ✏️ Resume Editing
                            </button>
                          )}
                          {!snapshot.is_active && (
                            <button
                              className="btn-open"
                              onClick={() => handleOpenSnapshot(snapshot.id, project.project_name)}
                            >
                              Open as New Estimate
                            </button>
                          )}
                          {/* <button
                            className="btn-delete"
                            onClick={() => handleDeleteSnapshot(snapshot.id)}
                          >
                            Delete
                          </button> */}
                        </div>
                      </div>
                    ))
                  )}
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
