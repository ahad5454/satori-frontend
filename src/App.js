import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { initializeSession } from './utils/sessionManager';
import Home from './components/Home';
import LabTests from './components/LabTests';
import HRSEstimator from './components/HRSEstimator';
import EstimationsList from './components/EstimationsList';
import Logistics from './components/Logistics';
import LogisticsEstimationsList from './components/LogisticsEstimationsList';
import ProjectEstimateSummary from './components/ProjectEstimateSummary';
import PreviousEstimates from './components/PreviousEstimates';
import SnapshotDetails from './components/SnapshotDetails';
import './App.css';

function App() {
  // Initialize session on app mount (runs once per browser session)
  useEffect(() => {
    initializeSession();
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lab-fees" element={<LabTests />} />
          <Route path="/hrs-estimator" element={<HRSEstimator />} />
          <Route path="/hrs-estimator/list" element={<EstimationsList />} />
          <Route path="/logistics" element={<Logistics />} />
          <Route path="/logistics/list" element={<LogisticsEstimationsList />} />
          <Route path="/project-summary" element={<ProjectEstimateSummary />} />
          <Route path="/previous-estimates" element={<PreviousEstimates />} />
          <Route path="/snapshots/:snapshotId/details" element={<SnapshotDetails />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;