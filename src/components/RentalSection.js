import React from 'react';

const RentalSection = ({ data, setData, isExpanded, onToggle }) => {
  return (
    <div className="collapsible-section">
      <div 
        className="section-header clickable"
        onClick={onToggle}
      >
        <h2>🚙 Rental Vehicles</h2>
        <span className="toggle-icon">{isExpanded ? '▼' : '▶'}</span>
      </div>
      {isExpanded && (
        <div className="section-content">
          <div className="input-grid">
            <div className="input-row">
              <div className="input-group">
                <label>Project Location</label>
                <input
                  type="text"
                  value={data.project_location || ''}
                  onChange={(e) => setData({ ...data, project_location: e.target.value })}
                  className="form-input"
                  placeholder="e.g., Anchorage"
                />
              </div>
              <div className="input-group">
                <label>Number of Vehicles</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={data.num_vehicles || ''}
                  onChange={(e) => setData({ ...data, num_vehicles: e.target.value })}
                  className="form-input small"
                  placeholder="0"
                />
              </div>
              <div className="input-group">
                <label>Vehicle Category</label>
                <select
                  value={data.vehicle_category || ''}
                  onChange={(e) => setData({ ...data, vehicle_category: e.target.value || null })}
                  className="form-input small"
                >
                  <option value="">-- Select --</option>
                  <option value="C">Car (C)</option>
                  <option value="T">Truck (T)</option>
                </select>
              </div>
              <div className="input-group">
                <label>Rental Period Type</label>
                <select
                  value={data.rental_period_type || ''}
                  onChange={(e) => setData({ ...data, rental_period_type: e.target.value || null })}
                  className="form-input small"
                >
                  <option value="">-- Select --</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="input-group">
                <label>Rental Days</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={data.rental_days || ''}
                  onChange={(e) => setData({ ...data, rental_days: e.target.value })}
                  className="form-input small"
                  placeholder="0"
                />
              </div>
            </div>
            
            <div className="input-row">
              <div className="input-group">
                <label>Daily Rate ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.daily_rate || ''}
                  onChange={(e) => setData({ ...data, daily_rate: e.target.value || null })}
                  className="form-input small"
                  placeholder="0.00"
                />
              </div>
              <div className="input-group">
                <label>Weekly Rate ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.weekly_rate || ''}
                  onChange={(e) => setData({ ...data, weekly_rate: e.target.value || null })}
                  className="form-input small"
                  placeholder="0.00"
                />
              </div>
              <div className="input-group">
                <label>Monthly Rate ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.monthly_rate || ''}
                  onChange={(e) => setData({ ...data, monthly_rate: e.target.value || null })}
                  className="form-input small"
                  placeholder="0.00"
                />
              </div>
              <div className="input-group">
                <label>Fuel Cost Estimate ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.fuel_cost_estimate || ''}
                  onChange={(e) => setData({ ...data, fuel_cost_estimate: e.target.value || null })}
                  className="form-input small"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RentalSection;

