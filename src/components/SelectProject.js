import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { projectAPI } from '../services/api';
import './SelectProject.css';

const SelectProject = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentProject } = useProject();

  // Get mode and intended destination from location state
  const initialMode = location.state?.mode || 'create';
  const [mode, setMode] = useState(initialMode); // 'create' or 'select'
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form state for creating new project
  const [projectName, setProjectName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');

  // Get intended destination from location state (default to Home if no destination specified)
  const intendedDestination = location.state?.from || '/';

  // Load existing projects when in 'select' mode
  useEffect(() => {
    if (mode === 'select') {
      loadProjects();
    }
  }, [mode]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectAPI.listProjects('active');
      setProjects(data);
    } catch (err) {
      console.error('Error loading projects:', err);
      setError('Failed to load projects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();

    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }

    if (!address.trim()) {
      setError('Address is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const projectData = {
        name: projectName.trim(),
        address: address.trim(),
        description: description.trim() || null,
      };

      const newProject = await projectAPI.createProject(projectData);

      // Set project context FIRST before navigation to avoid race condition
      setCurrentProject(newProject);

      // Small delay to ensure context is set before navigation
      // This prevents ProtectedRoute from redirecting to /select-project
      await new Promise(resolve => setTimeout(resolve, 100));

      // If no intended destination (came from Home "Create New Project"), go to Project Summary
      // Otherwise, navigate to intended destination
      if (intendedDestination === '/' || !location.state?.from) {
        navigate('/project-summary', { replace: true });
      } else {
        navigate(intendedDestination, { replace: true });
      }
    } catch (err) {
      console.error('Error creating project:', err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Failed to create project. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProject = async (project) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch full project details
      const fullProject = await projectAPI.getProject(project.id);

      // Set project context FIRST before navigation to avoid race condition
      setCurrentProject(fullProject);

      // Small delay to ensure context is set before navigation
      // This prevents ProtectedRoute from redirecting to /select-project
      await new Promise(resolve => setTimeout(resolve, 100));

      // Navigate to intended destination (if from Home with no destination, go to Project Summary)
      if (intendedDestination === '/' || !location.state?.from) {
        navigate('/project-summary', { replace: true });
      } else {
        navigate(intendedDestination, { replace: true });
      }
    } catch (err) {
      console.error('Error selecting project:', err);
      if (err.response?.status === 404) {
        setError('Project no longer exists. Please refresh the list.');
        loadProjects(); // Reload list
      } else {
        setError('Failed to select project. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="select-project-container">
      <div className="select-project-content">
        <div className="select-project-top-section">
          <div className="select-project-header">
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1rem' }}>
              <button
                onClick={() => navigate('/')}
                className="back-home-btn"
              >
                ← Back to Home
              </button>
            </div>
            <h1>Select or Create Project</h1>
            <p className="select-project-subtitle">
              Choose an existing project or create a new one to get started with your estimates.
            </p>
          </div>

          <div className="select-project-tabs">
            <button
              className={`tab-button ${mode === 'create' ? 'active' : ''}`}
              onClick={() => setMode('create')}
            >
              Create New Project
            </button>
            <button
              className={`tab-button ${mode === 'select' ? 'active' : ''}`}
              onClick={() => setMode('select')}
            >
              Select Existing Project
            </button>
          </div>
        </div>

        <div className="select-project-body">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {mode === 'create' ? (
            <form onSubmit={handleCreateProject} className="create-project-form">
              <div className="form-group">
                <label htmlFor="projectName">
                  Project Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="projectName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="address">
                  Address <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter project address"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description (Optional)</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter project description (optional)"
                  rows={3}
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className="submit-button"
                disabled={loading || !projectName.trim() || !address.trim()}
              >
                {loading ? 'Creating...' : 'Create Project'}
              </button>
            </form>
          ) : (
            <div className="select-project-list">
              {loading && projects.length === 0 ? (
                <div className="loading-message">Loading projects...</div>
              ) : projects.length === 0 ? (
                <div className="empty-message">
                  No active projects found. Create a new project to get started.
                </div>
              ) : (
                <div className="projects-grid">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="project-card"
                      onClick={() => !loading && handleSelectProject(project)}
                    >
                      <div className="project-card-header">
                        <h3>{project.name}</h3>
                        {project.grand_total !== null && project.grand_total !== undefined && (
                          <span className="project-total">
                            ${project.grand_total.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </span>
                        )}
                      </div>
                      {project.address && (
                        <div className="project-card-address">
                          📍 {project.address}
                        </div>
                      )}
                      {project.description && (
                        <div className="project-card-description">
                          {project.description}
                        </div>
                      )}
                      {project.latest_estimate_date && (
                        <div className="project-card-date">
                          Last updated: {new Date(project.latest_estimate_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectProject;
