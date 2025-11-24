import React from 'react';

const DrivingSection = ({ data, setData, isExpanded, onToggle }) => {
  return (
    <div className="collapsible-section">
      <div 
        className="section-header clickable"
        onClick={onToggle}
      >
        <h2>🚗 Daily Site Driving</h2>
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
                  min="1"
                  step="1"
                  value={data.num_vehicles || 1}
                  onChange={(e) => setData({ ...data, num_vehicles: e.target.value })}
                  className="form-input small"
                  placeholder="1"
                />
              </div>
              <div className="input-group">
                <label>One-Way Miles</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.one_way_miles || ''}
                  onChange={(e) => setData({ ...data, one_way_miles: e.target.value })}
                  className="form-input small"
                  placeholder="0.00"
                />
              </div>
              <div className="input-group">
                <label>One-Way Drive Time (hours)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.drive_time_hours || ''}
                  onChange={(e) => setData({ ...data, drive_time_hours: e.target.value })}
                  className="form-input small"
                  placeholder="0.00"
                />
              </div>
              <div className="input-group">
                <label>Project Duration (days)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={data.project_duration_days || ''}
                  onChange={(e) => setData({ ...data, project_duration_days: e.target.value })}
                  className="form-input small"
                  placeholder="0"
                />
              </div>
            </div>
            
            <div className="input-row">
              <div className="input-group">
                <label>Cost per Mile (Preferred)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.cost_per_mile || ''}
                  onChange={(e) => setData({ ...data, cost_per_mile: e.target.value })}
                  className="form-input small"
                  placeholder="0.00"
                />
              </div>
              <div className="input-group">
                <label>OR: MPG (Fallback)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.mpg || ''}
                  onChange={(e) => setData({ ...data, mpg: e.target.value })}
                  className="form-input small"
                  placeholder="0.00"
                />
              </div>
              <div className="input-group">
                <label>Cost per Gallon (Fallback)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.cost_per_gallon || ''}
                  onChange={(e) => setData({ ...data, cost_per_gallon: e.target.value })}
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

export default DrivingSection;

