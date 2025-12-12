import React, { useState, useEffect } from 'react';

const DrivingSection = ({ 
  roundtripData, 
  setRoundtripData, 
  dailyData, 
  setDailyData,
  siteAccessMode,
  isExpanded, 
  onToggle 
}) => {
  const [locationType, setLocationType] = useState(''); // 'anchorage' or 'other'
  const [otherLocation, setOtherLocation] = useState('');
  
  // Initialize location type based on existing data
  useEffect(() => {
    if (roundtripData?.project_location) {
      const loc = roundtripData.project_location.toLowerCase();
      if (loc === 'anchorage') {
        setLocationType('anchorage');
        setOtherLocation('');
      } else {
        setLocationType('other');
        setOtherLocation(roundtripData.project_location);
      }
    }
  }, [roundtripData?.project_location]);
  
  const handleLocationTypeChange = (type) => {
    setLocationType(type);
    if (type === 'anchorage') {
      setOtherLocation('');
      setRoundtripData({ 
        ...roundtripData, 
        project_location: 'Anchorage',
        project_duration_days: roundtripData.project_duration_days || 1,
        anchorage_flat_fee: roundtripData.anchorage_flat_fee || 45
      });
    } else {
      setRoundtripData({ 
        ...roundtripData, 
        project_location: otherLocation || '',
        anchorage_flat_fee: null
      });
    }
  };
  
  const handleOtherLocationChange = (value) => {
    setOtherLocation(value);
    setRoundtripData({ ...roundtripData, project_location: value });
  };
  
  const isAnchorage = locationType === 'anchorage' || roundtripData?.project_location?.toLowerCase() === 'anchorage';
  const isDailyAnchorage = dailyData?.site_location?.toLowerCase() === 'anchorage' || 
                           dailyData?.lodging_location?.toLowerCase() === 'anchorage';
  
  // Calculate auto-calc display values (display only, don't overwrite user input)
  const calculateRoundtripAutoTime = () => {
    const miles = parseFloat(roundtripData?.one_way_miles) || 0;
    if (miles > 0) {
      return ((miles * 2) / 55).toFixed(2); // Total roundtrip hours
    }
    return '0.00';
  };
  
  const calculateDailyAutoTime = () => {
    const miles = parseFloat(dailyData?.daily_miles) || 0;
    if (miles > 0) {
      return (miles / 55).toFixed(2); // Total roundtrip hours (daily_miles is already roundtrip)
    }
    return '0.00';
  };
  
  // Pre-fill site location from roundtrip project location
  useEffect(() => {
    if (roundtripData?.project_location && !dailyData?.site_location && locationType === 'other') {
      setDailyData(prev => ({ ...prev, site_location: roundtripData.project_location }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundtripData?.project_location, locationType]);
  
  // If roundtripData is null/undefined, don't show roundtrip section
  const showRoundtrip = siteAccessMode === 'driving' && roundtripData;

  return (
    <div className="collapsible-section">
      <div 
        className="section-header clickable"
        onClick={onToggle}
      >
        <h2>Driving</h2>
        <span className="toggle-icon">{isExpanded ? '▼' : '▶'}</span>
      </div>
      {isExpanded && (
        <div className="section-content">
          {/* Roundtrip Driving Subsection */}
          {showRoundtrip && (
            <div className="driving-subsection">
              <h4 className="subsection-title">Roundtrip Driving (Home/Office → Project Site)</h4>
              <div className="input-grid">
                <div className="input-row">
                  <div className="input-group">
                    <label>Project Location</label>
                    <select
                      value={locationType}
                      onChange={(e) => handleLocationTypeChange(e.target.value)}
                      className="form-input"
                    >
                      <option value="">-- Select Location --</option>
                      <option value="anchorage">Anchorage</option>
                      <option value="other">Other (enter city manually)</option>
                    </select>
                  </div>
                  {locationType === 'other' && (
                    <div className="input-group">
                      <label>City Name</label>
                      <input
                        type="text"
                        value={otherLocation}
                        onChange={(e) => handleOtherLocationChange(e.target.value)}
                        className="form-input"
                        placeholder="e.g., Fairbanks"
                      />
                    </div>
                  )}
                  <div className="input-group">
                    <label>Number of Vehicles</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={roundtripData?.num_vehicles || 1}
                      onChange={(e) => setRoundtripData({ ...roundtripData, num_vehicles: e.target.value })}
                      className="form-input small"
                      placeholder="1"
                    />
                  </div>
                  {!isAnchorage && (
                    <>
                      <div className="input-group">
                        <label>One-Way Miles</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={roundtripData?.one_way_miles || ''}
                          onChange={(e) => setRoundtripData({ ...roundtripData, one_way_miles: e.target.value })}
                          className="form-input small"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="input-group">
                        <label>One-Way Drive Time (hours, optional)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={roundtripData?.drive_time_hours || ''}
                          onChange={(e) => setRoundtripData({ ...roundtripData, drive_time_hours: e.target.value || null })}
                          className="form-input small"
                          placeholder="Leave empty for auto-calc"
                        />
                        <small style={{ fontSize: '0.75rem', color: '#666', marginTop: '2px', display: 'block' }}>
                          Auto-calc (roundtrip): {calculateRoundtripAutoTime()} hrs
                        </small>
                      </div>
                    </>
                  )}
                  <div className="input-group">
                    <label>Project Duration (days)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={roundtripData?.project_duration_days || (isAnchorage ? 1 : 0)}
                      onChange={(e) => setRoundtripData({ ...roundtripData, project_duration_days: e.target.value })}
                      className="form-input small"
                      placeholder={isAnchorage ? "1" : "0"}
                    />
                  </div>
                </div>
                
                {isAnchorage ? (
                  <div className="input-row">
                    <div className="input-group">
                      <label>Anchorage Flat Fee per Day ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={roundtripData?.anchorage_flat_fee || 45}
                        onChange={(e) => setRoundtripData({ ...roundtripData, anchorage_flat_fee: e.target.value })}
                        className="form-input small"
                        placeholder="45"
                      />
                      <small style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px', display: 'block' }}>
                        Anchorage flat fee applies (mileage-based costs ignored)
                      </small>
                    </div>
                  </div>
                ) : (
                  locationType === 'other' && (
                    <div className="input-row">
                      <div className="input-group">
                        <label>Cost per Mile (Preferred)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={roundtripData?.cost_per_mile || ''}
                          onChange={(e) => setRoundtripData({ ...roundtripData, cost_per_mile: e.target.value })}
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
                          value={roundtripData?.mpg || ''}
                          onChange={(e) => setRoundtripData({ ...roundtripData, mpg: e.target.value })}
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
                          value={roundtripData?.cost_per_gallon || ''}
                          onChange={(e) => setRoundtripData({ ...roundtripData, cost_per_gallon: e.target.value })}
                          className="form-input small"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Daily Driving Subsection */}
          <div className="driving-subsection">
            <h4 className="subsection-title">Daily Driving (Lodging ⇄ Project Site)</h4>
            <div className="input-grid">
              <div className="input-row">
                <div className="input-group">
                  <label>Site Location</label>
                  <input
                    type="text"
                    value={dailyData?.site_location || ''}
                    onChange={(e) => setDailyData({ ...dailyData, site_location: e.target.value })}
                    className="form-input"
                    placeholder="e.g., Fairbanks"
                  />
                </div>
                <div className="input-group">
                  <label>Lodging Location</label>
                  <input
                    type="text"
                    value={dailyData?.lodging_location || ''}
                    onChange={(e) => setDailyData({ ...dailyData, lodging_location: e.target.value })}
                    className="form-input"
                    placeholder="e.g., North Pole"
                  />
                </div>
                {!isDailyAnchorage && (
                  <>
                    <div className="input-group">
                      <label>Daily Miles (roundtrip)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={dailyData?.daily_miles || ''}
                        onChange={(e) => setDailyData({ ...dailyData, daily_miles: e.target.value })}
                        className="form-input small"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="input-group">
                      <label>One-Way Drive Time (hours, optional)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={dailyData?.daily_drive_time_hours || ''}
                        onChange={(e) => setDailyData({ ...dailyData, daily_drive_time_hours: e.target.value || null })}
                        className="form-input small"
                        placeholder="Leave empty for auto-calc"
                      />
                      <small style={{ fontSize: '0.75rem', color: '#666', marginTop: '2px', display: 'block' }}>
                        Auto-calc (roundtrip): {calculateDailyAutoTime()} hrs
                      </small>
                    </div>
                  </>
                )}
                <div className="input-group">
                  <label>Project Duration (days)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={dailyData?.project_duration_days || ''}
                    onChange={(e) => setDailyData({ ...dailyData, project_duration_days: e.target.value })}
                    className="form-input small"
                    placeholder="0"
                  />
                </div>
              </div>
              
              {isDailyAnchorage ? (
                <div className="input-row">
                  <div className="input-group">
                    <small style={{ fontSize: '0.8rem', color: '#f39c12', marginTop: '4px', display: 'block' }}>
                      <strong>Note:</strong> For Anchorage daily driving, vehicle cost is covered by a flat fee. Labor hours still apply.
                    </small>
                  </div>
                </div>
              ) : (
                dailyData?.site_location || dailyData?.lodging_location ? (
                  <div className="input-row">
                    <div className="input-group">
                      <label>Cost per Mile (Preferred)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={dailyData?.cost_per_mile || ''}
                        onChange={(e) => setDailyData({ ...dailyData, cost_per_mile: e.target.value })}
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
                        value={dailyData?.mpg || ''}
                        onChange={(e) => setDailyData({ ...dailyData, mpg: e.target.value })}
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
                        value={dailyData?.cost_per_gallon || ''}
                        onChange={(e) => setDailyData({ ...dailyData, cost_per_gallon: e.target.value })}
                        className="form-input small"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ) : null
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrivingSection;
