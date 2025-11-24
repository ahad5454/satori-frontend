import React from 'react';

const FlightsSection = ({ data, setData, isExpanded, onToggle }) => {
  return (
    <div className="collapsible-section">
      <div 
        className="section-header clickable"
        onClick={onToggle}
      >
        <h2>✈️ Flights</h2>
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
                <label>Number of Tickets</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={data.num_tickets || ''}
                  onChange={(e) => setData({ ...data, num_tickets: e.target.value })}
                  className="form-input small"
                  placeholder="0"
                />
              </div>
              <div className="input-group">
                <label>Roundtrip Cost per Ticket ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.roundtrip_cost_per_ticket || ''}
                  onChange={(e) => setData({ ...data, roundtrip_cost_per_ticket: e.target.value })}
                  className="form-input small"
                  placeholder="0.00"
                />
              </div>
              <div className="input-group">
                <label>One-Way Flight Time (hours)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.flight_time_hours_one_way || ''}
                  onChange={(e) => setData({ ...data, flight_time_hours_one_way: e.target.value })}
                  className="form-input small"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="input-row">
              <div className="input-group">
                <label>Layover City (Optional)</label>
                <input
                  type="text"
                  value={data.layover_city || ''}
                  onChange={(e) => setData({ ...data, layover_city: e.target.value || null })}
                  className="form-input"
                  placeholder="e.g., Seattle"
                />
              </div>
              <div className="input-group">
                <div className="toggle-row">
                  <label htmlFor="overnight-toggle" className="toggle-text-label">
                    Has Overnight Layover
                  </label>
                  <label className="toggle-switch-label">
                    <input
                      id="overnight-toggle"
                      type="checkbox"
                      checked={data.has_overnight || false}
                      onChange={(e) => setData({ ...data, has_overnight: e.target.checked })}
                      className="toggle-checkbox"
                    />
                    <span className="toggle-switch"></span>
                  </label>
                </div>
              </div>
            </div>
            
            {data.has_overnight && (
              <div className="input-row">
                <div className="input-group">
                  <label>Layover Hotel Name</label>
                  <input
                    type="text"
                    value={data.layover_hotel_name || ''}
                    onChange={(e) => setData({ ...data, layover_hotel_name: e.target.value || null })}
                    className="form-input"
                    placeholder="Hotel name"
                  />
                </div>
                <div className="input-group">
                  <label>Layover Cost per Night ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={data.layover_cost_per_night || ''}
                    onChange={(e) => setData({ ...data, layover_cost_per_night: e.target.value || null })}
                    className="form-input small"
                    placeholder="0.00"
                  />
                </div>
                <div className="input-group">
                  <label>Layover Rooms</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={data.layover_rooms || ''}
                    onChange={(e) => setData({ ...data, layover_rooms: e.target.value || null })}
                    className="form-input small"
                    placeholder="0"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FlightsSection;

