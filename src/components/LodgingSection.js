import React from 'react';

const LodgingSection = ({ data, setData, numStaff, isExpanded, onToggle }) => {
  return (
    <div className="collapsible-section">
      <div 
        className="section-header clickable"
        onClick={onToggle}
      >
        <h2>🏨 Lodging</h2>
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
                <label>Hotel Name</label>
                <input
                  type="text"
                  value={data.hotel_name || ''}
                  onChange={(e) => setData({ ...data, hotel_name: e.target.value || null })}
                  className="form-input"
                  placeholder="Hotel name"
                />
              </div>
              <div className="input-group">
                <label>Night Cost with Taxes ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.night_cost_with_taxes || ''}
                  onChange={(e) => setData({ ...data, night_cost_with_taxes: e.target.value })}
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
              <div className="input-group">
                <label>Number of Staff (rooms)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={data.num_staff || numStaff || ''}
                  onChange={(e) => setData({ ...data, num_staff: e.target.value })}
                  className="form-input small"
                  placeholder={numStaff || "0"}
                />
                <small style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px', display: 'block' }}>
                  Single occupancy: one room per staff
                </small>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LodgingSection;

