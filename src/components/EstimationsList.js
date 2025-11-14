import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { hrsEstimatorAPI } from '../services/api';
import './HRSEstimator.css';

const EstimationsList = () => {
  const navigate = useNavigate();
  const [estimations, setEstimations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEstimations();
  }, []);

  const fetchEstimations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await hrsEstimatorAPI.getEstimations();
      setEstimations(data);
    } catch (err) {
      console.error('Error fetching estimations:', err);
      setError(`Failed to load estimations: ${err.message || err.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadEstimation = (estimation) => {
    // Navigate to estimator with estimation data in state
    // We'll need to pass this via navigation state or URL params
    navigate('/hrs-estimator', { state: { estimationData: estimation } });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="hrs-estimator-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading estimations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hrs-estimator-container">
        <div className="error-container">
          <div className="error-message">
            <h2>⚠️ Error</h2>
            <p>{error}</p>
            <button onClick={fetchEstimations} className="retry-btn">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hrs-estimator-container">
      <nav className="hrs-estimator-nav">
        <Link to="/" className="nav-link">
          🏠 Home
        </Link>
        <div className="nav-title">
          <h1>📋 Previous Estimations</h1>
        </div>
        <button 
          className="view-estimations-btn"
          onClick={() => navigate('/hrs-estimator')}
        >
          ➕ New Estimation
        </button>
      </nav>

      <header className="hrs-estimator-header">
        <p>View and reuse past HRS sample estimations</p>
      </header>

      <div className="hrs-estimator-content">
        <div className="estimations-list-container">
          {estimations.length === 0 ? (
            <div className="no-estimations">
              <h2>📭 No Estimations Found</h2>
              <p>You haven't created any estimations yet.</p>
              <button 
                className="submit-btn"
                onClick={() => navigate('/hrs-estimator')}
              >
                Create First Estimation
              </button>
            </div>
          ) : (
            <div className="estimations-grid">
              {estimations.map((estimation) => (
                <div key={estimation.id} className="estimation-card">
                  <div className="estimation-card-header">
                    <h3>{estimation.project_name || `Estimation #${estimation.id}`}</h3>
                    <span className="estimation-date">
                      {formatDate(estimation.created_at)}
                    </span>
                  </div>
                  
                  <div className="estimation-card-body">
                    <div className="estimation-summary">
                      <div className="summary-item">
                        <span className="summary-label">Base Hours:</span>
                        <span className="summary-value">
                          {estimation.suggested_hours_base?.toFixed(2) || 'N/A'} hrs
                        </span>
                      </div>
                      <div className="summary-item highlight">
                        <span className="summary-label">Final Hours:</span>
                        <span className="summary-value">
                          {estimation.suggested_hours_final?.toFixed(2) || 'N/A'} hrs
                        </span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Field Staff:</span>
                        <span className="summary-value">
                          {estimation.field_staff_count || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {estimation.labor_breakdown && (
                      <div className="estimation-categories">
                        <strong>Categories:</strong>
                        <div className="category-tags">
                          {estimation.labor_breakdown.asbestos_hours > 0 && (
                            <span className="category-tag">Asbestos</span>
                          )}
                          {estimation.labor_breakdown.lead_xrf_hours > 0 && (
                            <span className="category-tag">Lead (XRF)</span>
                          )}
                          {estimation.labor_breakdown.lead_chips_wipes_hours > 0 && (
                            <span className="category-tag">Lead (Chips/Wipes)</span>
                          )}
                          {estimation.labor_breakdown.mold_hours > 0 && (
                            <span className="category-tag">Mold</span>
                          )}
                          {estimation.labor_breakdown.orm_hours > 0 && (
                            <span className="category-tag">ORM</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="estimation-card-actions">
                    <button
                      className="load-btn"
                      onClick={() => handleLoadEstimation(estimation)}
                    >
                      📥 Load & Edit
                    </button>
                    <button
                      className="view-btn"
                      onClick={() => {
                        // Show full details in a modal or expand
                        alert(`Estimation Details:\n\nBase Hours: ${estimation.suggested_hours_base}\nFinal Hours: ${estimation.suggested_hours_final}\n\nFull data available in console.`);
                        console.log('Full estimation data:', estimation);
                      }}
                    >
                      👁️ View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EstimationsList;

