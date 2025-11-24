import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logisticsAPI } from '../services/api';
import './Logistics.css';

const LogisticsEstimationsList = () => {
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
      const data = await logisticsAPI.getEstimations();
      setEstimations(data);
    } catch (err) {
      console.error('Error fetching estimations:', err);
      setError(`Failed to load estimations: ${err.message || err.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadEstimation = (estimation) => {
    navigate('/logistics', { state: { estimationData: estimation } });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);
  };

  if (loading) {
    return (
      <div className="logistics-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading estimations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="logistics-container">
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
    <div className="logistics-container">
      <nav className="logistics-nav">
        <Link to="/" className="nav-link">
          🏠 Home
        </Link>
        <div className="nav-title">
          <h1>📋 Previous Logistics Estimates</h1>
        </div>
        <button 
          className="view-estimations-btn"
          onClick={() => navigate('/logistics')}
        >
          ➕ New Estimate
        </button>
      </nav>

      <header className="logistics-header">
        <p>View and reuse past logistics estimations</p>
      </header>

      <div className="logistics-content">
        <div className="estimations-list-container">
          {estimations.length === 0 ? (
            <div className="no-estimations">
              <h2>📭 No Estimations Found</h2>
              <p>You haven't created any estimations yet.</p>
              <button 
                className="submit-btn"
                onClick={() => navigate('/logistics')}
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
                        <span className="summary-label">Site Access Mode:</span>
                        <span className="summary-value">
                          {estimation.site_access_mode === 'driving' ? '🚗 Driving' : '✈️ Flight'}
                        </span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Local Project:</span>
                        <span className="summary-value">
                          {estimation.is_local_project ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Number of Staff:</span>
                        <span className="summary-value">
                          {estimation.num_staff || 'N/A'}
                        </span>
                      </div>
                      <div className="summary-item highlight">
                        <span className="summary-label">Total Cost:</span>
                        <span className="summary-value">
                          {formatCurrency(estimation.total_logistics_cost)}
                        </span>
                      </div>
                    </div>

                    <div className="estimation-categories">
                      <strong>Cost Breakdown:</strong>
                      <div className="category-tags">
                        {estimation.total_driving_cost > 0 && (
                          <span className="category-tag">Driving: {formatCurrency(estimation.total_driving_cost)}</span>
                        )}
                        {estimation.total_flight_cost > 0 && (
                          <span className="category-tag">Flights: {formatCurrency(estimation.total_flight_cost)}</span>
                        )}
                        {estimation.total_rental_cost > 0 && (
                          <span className="category-tag">Rental: {formatCurrency(estimation.total_rental_cost)}</span>
                        )}
                        {estimation.total_lodging_room_cost > 0 && (
                          <span className="category-tag">Lodging: {formatCurrency(estimation.total_lodging_room_cost)}</span>
                        )}
                        {estimation.total_per_diem_cost > 0 && (
                          <span className="category-tag">Per Diem: {formatCurrency(estimation.total_per_diem_cost)}</span>
                        )}
                      </div>
                    </div>
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
                        navigate('/logistics', { state: { estimationData: estimation, showResults: true } });
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

export default LogisticsEstimationsList;

