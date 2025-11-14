import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import LabTests from './components/LabTests';
import HRSEstimator from './components/HRSEstimator';
import EstimationsList from './components/EstimationsList';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lab-fees" element={<LabTests />} />
          <Route path="/hrs-estimator" element={<HRSEstimator />} />
          <Route path="/hrs-estimator/list" element={<EstimationsList />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;