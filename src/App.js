import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { initializeSession } from './utils/sessionManager';
import { ProjectProvider } from './contexts/ProjectContext';
import ProtectedRoute from './components/ProtectedRoute';
import AuthGuard from './components/AuthGuard';
import Login from './components/Login';
import Home from './components/Home';
import SelectProject from './components/SelectProject';
import LabTests from './components/LabTests';
import HRSEstimator from './components/HRSEstimator';
import EstimationsList from './components/EstimationsList';
import Logistics from './components/Logistics';
import LogisticsEstimationsList from './components/LogisticsEstimationsList';
import ProjectEstimateSummary from './components/ProjectEstimateSummary';
import PreviousEstimates from './components/PreviousEstimates';
import SnapshotDetails from './components/SnapshotDetails';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

function App() {
  // Initialize session on app mount (runs once per browser session)
  useEffect(() => {
    initializeSession();
  }, []);

  return (
    <Router>
      <ProjectProvider>
        <div className="App">
          <AuthGuard>
            <Routes>
              {/* Login page - only accessible when not authenticated */}
              <Route path="/login" element={<Login />} />
              {/* Home page - always accessible, no project required */}
              <Route path="/" element={<Home />} />
              <Route path="/select-project" element={<SelectProject />} />
              {/* Protected routes - require project context */}
              <Route
                path="/lab-fees"
                element={
                  <ProtectedRoute>
                    <LabTests />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hrs-estimator"
                element={
                  <ProtectedRoute>
                    <HRSEstimator />
                  </ProtectedRoute>
                }
              />
              <Route path="/hrs-estimator/list" element={<EstimationsList />} />
              <Route
                path="/logistics"
                element={
                  <ProtectedRoute>
                    <Logistics />
                  </ProtectedRoute>
                }
              />
              <Route path="/logistics/list" element={<LogisticsEstimationsList />} />
              <Route
                path="/project-summary"
                element={
                  <ProtectedRoute>
                    <ProjectEstimateSummary />
                  </ProtectedRoute>
                }
              />
              {/* Public routes - no project context required */}
              <Route path="/previous-estimates" element={<PreviousEstimates />} />
              <Route path="/snapshots/:snapshotId/details" element={<SnapshotDetails />} />
              {/* Admin Dashboard - visible only to admins */}
              <Route path="/admin" element={<AdminDashboard />} />
              {/* Catch-all route - redirect unknown paths to Home */}
              <Route path="*" element={<Home />} />
            </Routes>
          </AuthGuard>
        </div>
      </ProjectProvider>
    </Router>
  );
}

export default App;