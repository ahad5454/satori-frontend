import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';

/**
 * AuthGuard - Wrapper that redirects unauthenticated users to login page.
 * Wraps the entire app to ensure all routes require authentication.
 */
const AuthGuard = ({ children }) => {
    const location = useLocation();

    // Check if user is authenticated
    const isAuthenticated = authAPI.isAuthenticated();

    // If not authenticated and not on login page, redirect to login
    if (!isAuthenticated && location.pathname !== '/login') {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If authenticated and on login page, redirect to home
    if (isAuthenticated && location.pathname === '/login') {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default AuthGuard;
