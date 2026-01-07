import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';

/**
 * ProtectedRoute component that ensures a project is selected before accessing a route.
 * 
 * If no project is selected, redirects to /select-project with the intended destination
 * stored in location state for post-selection redirect.
 */
const ProtectedRoute = ({ children }) => {
  const { project, loading } = useProject();
  const location = useLocation();

  // Show loading state while checking project
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  // If no project, redirect to selection page with intended destination
  if (!project) {
    return (
      <Navigate
        to="/select-project"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  // Project exists, render the protected component
  return children;
};

export default ProtectedRoute;
