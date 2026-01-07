import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectAPI } from '../services/api';

const ProjectContext = createContext(null);

const PROJECT_STORAGE_KEY = 'satori_current_project';

/**
 * ProjectProvider manages the active project context for the entire application.
 * 
 * Features:
 * - Persists project in localStorage
 * - Restores project on app load (if still exists in backend)
 * - Provides project context to all components
 * - Handles 404 errors gracefully
 */
export const ProjectProvider = ({ children }) => {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Restore project from localStorage on mount
  useEffect(() => {
    const restoreProject = async () => {
      try {
        const stored = localStorage.getItem(PROJECT_STORAGE_KEY);
        if (!stored) {
          setLoading(false);
          return;
        }

        const projectData = JSON.parse(stored);
        
        // Verify project still exists in backend
        try {
          const projectResponse = await projectAPI.getProject(projectData.id);
          setProject(projectResponse);
        } catch (error) {
          // Project no longer exists (404) - clear storage
          if (error.response?.status === 404) {
            localStorage.removeItem(PROJECT_STORAGE_KEY);
            setProject(null);
          } else {
            // Other error - still restore from storage
            setProject(projectData);
          }
        }
      } catch (error) {
        console.error('Error restoring project:', error);
        localStorage.removeItem(PROJECT_STORAGE_KEY);
      } finally {
        setLoading(false);
      }
    };

    restoreProject();
  }, []);

  // Save project to localStorage whenever it changes
  useEffect(() => {
    if (project) {
      localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    } else {
      localStorage.removeItem(PROJECT_STORAGE_KEY);
    }
  }, [project]);

  const setCurrentProject = useCallback((projectData) => {
    // Save to localStorage synchronously to avoid race conditions
    // This ensures ProtectedRoute can read the project immediately
    if (projectData) {
      localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projectData));
    } else {
      localStorage.removeItem(PROJECT_STORAGE_KEY);
    }
    // Update state (which will trigger useEffect, but localStorage is already set)
    setProject(projectData);
  }, []);

  const clearProject = useCallback(() => {
    setProject(null);
    localStorage.removeItem(PROJECT_STORAGE_KEY);
  }, []);

  // Handle 404 errors - clear project and redirect to selection
  const handleProjectNotFound = useCallback(() => {
    clearProject();
    navigate('/select-project');
  }, [clearProject, navigate]);

  const value = {
    project,
    setCurrentProject,
    clearProject,
    handleProjectNotFound,
    loading
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

/**
 * Hook to access project context
 */
export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within ProjectProvider');
  }
  return context;
};
