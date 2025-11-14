import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { hrsEstimatorAPI } from '../services/api';
import './HRSEstimator.css';

const HRSEstimator = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Form state
  const [projectName, setProjectName] = useState('');
  const [fieldStaffCount, setFieldStaffCount] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [estimationResult, setEstimationResult] = useState(null);
  
  // Role and labor cost state
  const [selectedRole, setSelectedRole] = useState('');
  const [manualLaborHours, setManualLaborHours] = useState({
    'Program Manager': '',
    'Project Manager': '',
    'Accounting': '',
    'Administrative': '',
  });
  
  // Section expand/collapse state
  const [expandedSections, setExpandedSections] = useState({
    asbestos: true,
    lead: false,
    mold: false,
    orm: false,
    laborCategories: false,
  });
  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Advanced settings (override_minutes fields)
  const [overrideMinutes, setOverrideMinutes] = useState({
    asbestos: null,
    xrf: null,
    lead: null,
    mold: null,
  });

  // Asbestos Sampling state
  const [asbestosData, setAsbestosData] = useState({
    'GWB/JC': { actuals: '', bulks_per_unit: '', unit_label: 'Rooms' },
    'Flooring': { actuals: '', bulks_per_unit: '', unit_label: 'Rooms' },
    'Ceilings': { actuals: '', bulks_per_unit: '', unit_label: 'Rooms' },
    'Exterior Sides (CAB, etc.)': { actuals: '', bulks_per_unit: '', unit_label: 'LF' },
    'Piping': { actuals: '', bulks_per_unit: '', unit_label: 'LF' },
    'Tanks': { actuals: '', bulks_per_unit: '', unit_label: 'EA' },
  });

  // Lead Sampling state
  const [leadData, setLeadData] = useState({
    'Walls': { xrf_shots: '', chips_wipes: '' },
    'Windows': { xrf_shots: '', chips_wipes: '' },
    'Doors': { xrf_shots: '', chips_wipes: '' },
    'Exterior': { xrf_shots: '', chips_wipes: '' },
    'Other': { xrf_shots: '', chips_wipes: '' },
  });

  // Mold Sampling state
  const [moldData, setMoldData] = useState({
    'Living Room': { tape_lift: '', spore_trap: '', culturable: '' },
    'Kitchen': { tape_lift: '', spore_trap: '', culturable: '' },
    'Bath': { tape_lift: '', spore_trap: '', culturable: '' },
    'Crawl Space': { tape_lift: '', spore_trap: '', culturable: '' },
    'Mech Room': { tape_lift: '', spore_trap: '', culturable: '' },
    'Bedroom': { tape_lift: '', spore_trap: '', culturable: '' },
  });

  // ORM state
  const [ormData, setOrmData] = useState({
    building_total_sf: '',
    hours: '',
  });

  // Calculate Asbestos totals
  const calculateAsbestosTotals = () => {
    let totalPLM = 0;
    const bulkSummaries = {};
    
    Object.entries(asbestosData).forEach(([component, data]) => {
      const actuals = parseFloat(data.actuals) || 0;
      const bulksPerUnit = parseFloat(data.bulks_per_unit) || 0;
      const bulkSummary = actuals * bulksPerUnit;
      bulkSummaries[component] = bulkSummary;
      totalPLM += bulkSummary;
    });
    
    return { bulkSummaries, totalPLM };
  };

  // Calculate Lead totals
  const calculateLeadTotals = () => {
    let totalXRF = 0;
    let totalChipsWipes = 0;
    
    Object.values(leadData).forEach(data => {
      totalXRF += parseFloat(data.xrf_shots) || 0;
      totalChipsWipes += parseFloat(data.chips_wipes) || 0;
    });
    
    return { totalXRF, totalChipsWipes };
  };

  // Calculate Mold totals
  const calculateMoldTotals = () => {
    let totalTapeLift = 0;
    let totalSporeTrap = 0;
    let totalCulturable = 0;
    
    Object.values(moldData).forEach(data => {
      totalTapeLift += parseFloat(data.tape_lift) || 0;
      totalSporeTrap += parseFloat(data.spore_trap) || 0;
      totalCulturable += parseFloat(data.culturable) || 0;
    });
    
    return { totalTapeLift, totalSporeTrap, totalCulturable };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setEstimationResult(null);

    try {
      // Build asbestos_lines
      const asbestosLines = Object.entries(asbestosData).map(([component_name, data]) => ({
        component_name,
        unit_label: data.unit_label,
        actuals: parseFloat(data.actuals) || 0,
        bulks_per_unit: parseFloat(data.bulks_per_unit) || 0,
      }));

      // Build lead_lines
      const leadLines = Object.entries(leadData).map(([component_name, data]) => ({
        component_name,
        xrf_shots: parseFloat(data.xrf_shots) || 0,
        chips_wipes: parseFloat(data.chips_wipes) || 0,
      }));

      // Build mold_lines
      const moldLines = Object.entries(moldData).map(([component_name, data]) => ({
        component_name,
        tape_lift: parseFloat(data.tape_lift) || 0,
        spore_trap: parseFloat(data.spore_trap) || 0,
        culturable: parseFloat(data.culturable) || 0,
      }));

      // Build request payload
      const payload = {
        project_name: projectName || null,
        field_staff_count: Number(fieldStaffCount) || 1,
        asbestos_lines: asbestosLines,
        lead_lines: leadLines,
        mold_lines: moldLines,
        orm: (ormData.building_total_sf || ormData.hours)
        ? {
            building_total_sf: Number(ormData.building_total_sf) || 0,
            hours: Number(ormData.hours) || 0,
          }
        : null,
      };

      // Add override_minutes if set
      if (overrideMinutes.asbestos !== null && overrideMinutes.asbestos !== '') {
        payload.override_minutes_asbestos = parseFloat(overrideMinutes.asbestos);
      }
      if (overrideMinutes.xrf !== null && overrideMinutes.xrf !== '') {
        payload.override_minutes_xrf = parseFloat(overrideMinutes.xrf);
      }
      if (overrideMinutes.lead !== null && overrideMinutes.lead !== '') {
        payload.override_minutes_lead = parseFloat(overrideMinutes.lead);
      }
      if (overrideMinutes.mold !== null && overrideMinutes.mold !== '') {
        payload.override_minutes_mold = parseFloat(overrideMinutes.mold);
      }

      // Add role and manual labor hours if set
      if (selectedRole) {
        payload.selected_role = selectedRole;
      }
      
      // Build manual_labor_hours object (only include non-empty values)
      const manualHoursObj = {};
      Object.entries(manualLaborHours).forEach(([role, hours]) => {
        const hoursValue = parseFloat(hours);
        if (hours && !isNaN(hoursValue) && hoursValue >= 0) {
          manualHoursObj[role] = hoursValue;
        }
      });
      
      if (Object.keys(manualHoursObj).length > 0) {
        payload.manual_labor_hours = manualHoursObj;
      }

      console.log("Final Payload:", JSON.stringify(payload, null, 2));

      const result = await hrsEstimatorAPI.createEstimation(payload);
      setEstimationResult(result);
      
      // Dispatch custom event to notify other components (e.g., LabTests) to refresh
      window.dispatchEvent(new CustomEvent('hrs-estimation-complete', {
        detail: { estimationId: result.id }
      }));
    } catch (err) {
      console.error('Error creating estimation:', err);
      setError(`Failed to generate estimation: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load estimation data from navigation state if available
  useEffect(() => {
    if (location.state?.estimationData) {
      const estimation = location.state.estimationData;
      
      // Set project name
      if (estimation.project_name) {
        setProjectName(estimation.project_name);
      }
      
      // Set field staff count
      if (estimation.field_staff_count) {
        setFieldStaffCount(estimation.field_staff_count);
      }
      
      // Load asbestos data
      if (estimation.asbestos_lines) {
        const newAsbestosData = {
          'GWB/JC': { actuals: '', bulks_per_unit: '', unit_label: 'Rooms' },
          'Flooring': { actuals: '', bulks_per_unit: '', unit_label: 'Rooms' },
          'Ceilings': { actuals: '', bulks_per_unit: '', unit_label: 'Rooms' },
          'Exterior Sides (CAB, etc.)': { actuals: '', bulks_per_unit: '', unit_label: 'LF' },
          'Piping': { actuals: '', bulks_per_unit: '', unit_label: 'LF' },
          'Tanks': { actuals: '', bulks_per_unit: '', unit_label: 'EA' },
        };
        estimation.asbestos_lines.forEach(line => {
          if (newAsbestosData[line.component_name]) {
            newAsbestosData[line.component_name] = {
              actuals: line.actuals?.toString() || '',
              bulks_per_unit: line.bulks_per_unit?.toString() || '',
              unit_label: line.unit_label || newAsbestosData[line.component_name].unit_label,
            };
          }
        });
        setAsbestosData(newAsbestosData);
      }
      
      // Load lead data
      if (estimation.lead_lines) {
        const newLeadData = {
          'Walls': { xrf_shots: '', chips_wipes: '' },
          'Windows': { xrf_shots: '', chips_wipes: '' },
          'Doors': { xrf_shots: '', chips_wipes: '' },
          'Exterior': { xrf_shots: '', chips_wipes: '' },
          'Other': { xrf_shots: '', chips_wipes: '' },
        };
        estimation.lead_lines.forEach(line => {
          if (newLeadData[line.component_name]) {
            newLeadData[line.component_name] = {
              xrf_shots: line.xrf_shots?.toString() || '',
              chips_wipes: line.chips_wipes?.toString() || '',
            };
          }
        });
        setLeadData(newLeadData);
      }
      
      // Load mold data
      if (estimation.mold_lines) {
        const newMoldData = {
          'Living Room': { tape_lift: '', spore_trap: '', culturable: '' },
          'Kitchen': { tape_lift: '', spore_trap: '', culturable: '' },
          'Bath': { tape_lift: '', spore_trap: '', culturable: '' },
          'Crawl Space': { tape_lift: '', spore_trap: '', culturable: '' },
          'Mech Room': { tape_lift: '', spore_trap: '', culturable: '' },
          'Bedroom': { tape_lift: '', spore_trap: '', culturable: '' },
        };
        estimation.mold_lines.forEach(line => {
          if (newMoldData[line.component_name]) {
            newMoldData[line.component_name] = {
              tape_lift: line.tape_lift?.toString() || '',
              spore_trap: line.spore_trap?.toString() || '',
              culturable: line.culturable?.toString() || '',
            };
          }
        });
        setMoldData(newMoldData);
      }
      
      // Load ORM data
      if (estimation.orm) {
        setOrmData({
          building_total_sf: estimation.orm.building_total_sf?.toString() || '',
          hours: estimation.orm.hours?.toString() || '',
        });
      }
      
      // Load override minutes if they exist
      if (estimation.override_minutes_asbestos !== undefined) {
        setOverrideMinutes(prev => ({
          ...prev,
          asbestos: estimation.override_minutes_asbestos?.toString() || '',
        }));
        setShowAdvanced(true);
      }
      if (estimation.override_minutes_xrf !== undefined) {
        setOverrideMinutes(prev => ({
          ...prev,
          xrf: estimation.override_minutes_xrf?.toString() || '',
        }));
        setShowAdvanced(true);
      }
      if (estimation.override_minutes_lead !== undefined) {
        setOverrideMinutes(prev => ({
          ...prev,
          lead: estimation.override_minutes_lead?.toString() || '',
        }));
        setShowAdvanced(true);
      }
      if (estimation.override_minutes_mold !== undefined) {
        setOverrideMinutes(prev => ({
          ...prev,
          mold: estimation.override_minutes_mold?.toString() || '',
        }));
        setShowAdvanced(true);
      }
      
      // Load role and manual labor hours if they exist
      if (estimation.selected_role) {
        setSelectedRole(estimation.selected_role);
      }
      
      if (estimation.manual_labor_hours) {
        const loadedManualHours = {
          'Program Manager': estimation.manual_labor_hours['Program Manager']?.toString() || '',
          'Project Manager': estimation.manual_labor_hours['Project Manager']?.toString() || '',
          'Accounting': estimation.manual_labor_hours['Accounting']?.toString() || '',
          'Administrative': estimation.manual_labor_hours['Administrative']?.toString() || '',
        };
        setManualLaborHours(loadedManualHours);
        // Expand labor categories section if there's data
        if (Object.values(loadedManualHours).some(h => h !== '')) {
          setExpandedSections(prev => ({ ...prev, laborCategories: true }));
        }
      }
      
      // Clear navigation state to prevent reloading on re-render
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const asbestosTotals = calculateAsbestosTotals();
  const leadTotals = calculateLeadTotals();
  const moldTotals = calculateMoldTotals();

  return (
    <div className="hrs-estimator-container">
      <nav className="hrs-estimator-nav">
        <Link to="/" className="nav-link">
          🏠 Home
        </Link>
        <div className="nav-title">
          <h1>HRS Sample Estimator</h1>
        </div>
        <button 
          className="view-estimations-btn"
          onClick={() => navigate('/hrs-estimator/list')}
        >
          📋 View Previous Estimations
        </button>
      </nav>

      <header className="hrs-estimator-header">
        <p>Estimate field hours for asbestos, lead, mold, and other regulated materials sampling</p>
      </header>

      <div className="hrs-estimator-content">
        <form onSubmit={handleSubmit} className="estimator-form">
          {/* Project Name */}
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="project-name">Project Name (Optional)</label>
              <input
                id="project-name"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name"
                className="form-input"
              />
            </div>
          </div>

          {/* Asbestos Sampling Section */}
          <div className="collapsible-section">
            <div 
              className="section-header clickable"
              onClick={() => toggleSection('asbestos')}
            >
              <h2>🔷 Asbestos Sampling</h2>
              <span className="toggle-icon">{expandedSections.asbestos ? '▼' : '▶'}</span>
            </div>
            {expandedSections.asbestos && (
            <div className="section-content">
              <div className="input-grid">
                {Object.entries(asbestosData).map(([component, data]) => (
                  <div key={component} className="input-row">
                    <div className="component-name">{component}</div>
                    <div className="input-group">
                      <label>Actuals ({data.unit_label})</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.actuals}
                        onChange={(e) => {
                          setAsbestosData({
                            ...asbestosData,
                            [component]: { ...data, actuals: e.target.value }
                          });
                        }}
                        className="form-input small"
                        placeholder="0"
                      />
                    </div>
                    <div className="input-group">
                      <label>Bulks per {data.unit_label === 'Rooms' ? 'Room' : data.unit_label === 'LF' ? 'LF' : 'EA'}</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.bulks_per_unit}
                        onChange={(e) => {
                          setAsbestosData({
                            ...asbestosData,
                            [component]: { ...data, bulks_per_unit: e.target.value }
                          });
                        }}
                        className="form-input small"
                        placeholder="0"
                      />
                    </div>
                    <div className="calculated-value">
                      <label>Bulk Summary</label>
                      <div className="value-display">
                        {asbestosTotals.bulkSummaries[component].toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="section-total">
                <strong>Total PLM: {asbestosTotals.totalPLM.toFixed(2)}</strong>
              </div>
            </div>
            )}
          </div>

          {/* Lead Sampling Section */}
          <div className="collapsible-section">
            <div 
              className="section-header clickable"
              onClick={() => toggleSection('lead')}
            >
              <h2>🔶 Lead Sampling</h2>
              <span className="toggle-icon">{expandedSections.lead ? '▼' : '▶'}</span>
            </div>
            {expandedSections.lead && (
            <div className="section-content">
              <div className="input-grid">
                {Object.entries(leadData).map(([component, data]) => (
                  <div key={component} className="input-row">
                    <div className="component-name">{component}</div>
                    <div className="input-group">
                      <label>XRF Shots</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.xrf_shots}
                        onChange={(e) => {
                          setLeadData({
                            ...leadData,
                            [component]: { ...data, xrf_shots: e.target.value }
                          });
                        }}
                        className="form-input small"
                        placeholder="0"
                      />
                    </div>
                    <div className="input-group">
                      <label>Chips/Wipes</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.chips_wipes}
                        onChange={(e) => {
                          setLeadData({
                            ...leadData,
                            [component]: { ...data, chips_wipes: e.target.value }
                          });
                        }}
                        className="form-input small"
                        placeholder="0"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="section-total">
                <strong>Total XRF Shots: {leadTotals.totalXRF.toFixed(2)}</strong>
                <strong>Total Chips/Wipes: {leadTotals.totalChipsWipes.toFixed(2)}</strong>
              </div>
            </div>
            )}
          </div>

          {/* Mold Sampling Section */}
          <div className="collapsible-section">
            <div 
              className="section-header clickable"
              onClick={() => toggleSection('mold')}
            >
              <h2>🟢 Mold Sampling</h2>
              <span className="toggle-icon">{expandedSections.mold ? '▼' : '▶'}</span>
            </div>
            {expandedSections.mold && (
            <div className="section-content">
              <div className="input-grid">
                {Object.entries(moldData).map(([component, data]) => (
                  <div key={component} className="input-row">
                    <div className="component-name">{component}</div>
                    <div className="input-group">
                      <label>Tape Lift</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.tape_lift}
                        onChange={(e) => {
                          setMoldData({
                            ...moldData,
                            [component]: { ...data, tape_lift: e.target.value }
                          });
                        }}
                        className="form-input small"
                        placeholder="0"
                      />
                    </div>
                    <div className="input-group">
                      <label>Spore Trap</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.spore_trap}
                        onChange={(e) => {
                          setMoldData({
                            ...moldData,
                            [component]: { ...data, spore_trap: e.target.value }
                          });
                        }}
                        className="form-input small"
                        placeholder="0"
                      />
                    </div>
                    <div className="input-group">
                      <label>Culturable</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.culturable}
                        onChange={(e) => {
                          setMoldData({
                            ...moldData,
                            [component]: { ...data, culturable: e.target.value }
                          });
                        }}
                        className="form-input small"
                        placeholder="0"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="section-total">
                <strong>Total Tape Lift: {moldTotals.totalTapeLift.toFixed(2)}</strong>
                <strong>Total Spore Trap: {moldTotals.totalSporeTrap.toFixed(2)}</strong>
                <strong>Total Culturable: {moldTotals.totalCulturable.toFixed(2)}</strong>
              </div>
            </div>
            )}
          </div>

          {/* ORM Section */}
          <div className="collapsible-section">
            <div 
              className="section-header clickable"
              onClick={() => toggleSection('orm')}
            >
              <h2>⚪ Other Regulated Materials (ORM)</h2>
              <span className="toggle-icon">{expandedSections.orm ? '▼' : '▶'}</span>
            </div>
            {expandedSections.orm && (
            <div className="section-content">
              <div className="input-row">
                <div className="input-group">
                  <label>Building Total SF</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ormData.building_total_sf}
                    onChange={(e) => setOrmData({ ...ormData, building_total_sf: e.target.value })}
                    className="form-input"
                    placeholder="0"
                  />
                </div>
                <div className="input-group">
                  <label>Hours</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ormData.hours}
                    onChange={(e) => setOrmData({ ...ormData, hours: e.target.value })}
                    className="form-input"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            )}
          </div>

          {/* Field Staff Section */}
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="field-staff-count">Field Staff Count</label>
              <input
                id="field-staff-count"
                type="number"
                min="1"
                step="1"
                value={fieldStaffCount}
                onChange={(e) => setFieldStaffCount(e.target.value)}
                className="form-input"
                placeholder="1"
              />
            </div>
          </div>

          {/* Role Selection Section */}
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="selected-role">Select Role for Suggested Hours</label>
              <select
                id="selected-role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="form-input"
              >
                <option value="">-- Select Role --</option>
                <option value="Env Scientist">Env Scientist ($93.17/hr)</option>
                <option value="Env Technician">Env Technician ($72.40/hr)</option>
              </select>
            </div>
          </div>

          {/* Additional Labor Categories Section */}
          <div className="collapsible-section">
            <div 
              className="section-header clickable"
              onClick={() => setExpandedSections(prev => ({ ...prev, laborCategories: !prev.laborCategories }))}
            >
              <h2>💰 Additional Labor Categories</h2>
              <span className="toggle-icon">{expandedSections.laborCategories ? '▼' : '▶'}</span>
            </div>
            {expandedSections.laborCategories && (
              <div className="section-content">
                <div className="input-grid">
                  <div className="input-group">
                    <label>Program Manager ($131.55/hr)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={manualLaborHours['Program Manager']}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                          setManualLaborHours({
                            ...manualLaborHours,
                            'Program Manager': value
                          });
                        }
                      }}
                      className="form-input"
                      placeholder="0"
                    />
                  </div>
                  <div className="input-group">
                    <label>Project Manager ($104.23/hr)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={manualLaborHours['Project Manager']}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                          setManualLaborHours({
                            ...manualLaborHours,
                            'Project Manager': value
                          });
                        }
                      }}
                      className="form-input"
                      placeholder="0"
                    />
                  </div>
                  <div className="input-group">
                    <label>Accounting ($95.36/hr)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={manualLaborHours['Accounting']}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                          setManualLaborHours({
                            ...manualLaborHours,
                            'Accounting': value
                          });
                        }
                      }}
                      className="form-input"
                      placeholder="0"
                    />
                  </div>
                  <div className="input-group">
                    <label>Administrative ($54.80/hr)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={manualLaborHours['Administrative']}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                          setManualLaborHours({
                            ...manualLaborHours,
                            'Administrative': value
                          });
                        }
                      }}
                      className="form-input"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Advanced Settings */}
          <div className="collapsible-section">
            <div 
              className="section-header clickable"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <h2>⚙️ Advanced Settings</h2>
              <span className="toggle-icon">{showAdvanced ? '▼' : '▶'}</span>
            </div>
            {showAdvanced && (
              <div className="section-content">
                <div className="input-grid">
                  <div className="input-group">
                    <label>Override Minutes - Asbestos</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={overrideMinutes.asbestos || ''}
                      onChange={(e) => setOverrideMinutes({ ...overrideMinutes, asbestos: e.target.value })}
                      className="form-input"
                      placeholder="Leave empty for default"
                    />
                  </div>
                  <div className="input-group">
                    <label>Override Minutes - XRF</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={overrideMinutes.xrf || ''}
                      onChange={(e) => setOverrideMinutes({ ...overrideMinutes, xrf: e.target.value })}
                      className="form-input"
                      placeholder="Leave empty for default"
                    />
                  </div>
                  <div className="input-group">
                    <label>Override Minutes - Lead</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={overrideMinutes.lead || ''}
                      onChange={(e) => setOverrideMinutes({ ...overrideMinutes, lead: e.target.value })}
                      className="form-input"
                      placeholder="Leave empty for default"
                    />
                  </div>
                  <div className="input-group">
                    <label>Override Minutes - Mold</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={overrideMinutes.mold || ''}
                      onChange={(e) => setOverrideMinutes({ ...overrideMinutes, mold: e.target.value })}
                      className="form-input"
                      placeholder="Leave empty for default"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="form-actions">
            <button 
              type="submit" 
              className="submit-btn"
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Estimation'}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-message">
              <p>⚠️ {error}</p>
            </div>
          )}
        </form>

        {/* Results Display */}
        {estimationResult && (
          <div className="estimation-results">
            <h2>Estimation Results</h2>
            <div className="results-grid">
              <div className="result-card">
                <h3>Suggested Hours (Base)</h3>
                <div className="result-value">
                  {estimationResult.suggested_hours_base?.toFixed(2) || 'N/A'} hours
                </div>
              </div>
              <div className="result-card highlight">
                <h3>Suggested Hours (Final)</h3>
                <div className="result-value large">
                  {estimationResult.suggested_hours_final?.toFixed(2) || 'N/A'} hours
                </div>
              </div>
            </div>
            
            {estimationResult.labor_breakdown && (
              <div className="category-breakdown">
                <h3>Hours by Category</h3>
                <div className="breakdown-list">
                  {estimationResult.labor_breakdown.asbestos_hours > 0 && (
                    <div className="breakdown-item">
                      <span className="category-name">Asbestos</span>
                      <span className="category-hours">
                        {estimationResult.labor_breakdown.asbestos_hours?.toFixed(2) || '0.00'} hours
                      </span>
                    </div>
                  )}
                  {estimationResult.labor_breakdown.lead_xrf_hours > 0 && (
                    <div className="breakdown-item">
                      <span className="category-name">Lead (XRF Shots)</span>
                      <span className="category-hours">
                        {estimationResult.labor_breakdown.lead_xrf_hours?.toFixed(2) || '0.00'} hours
                      </span>
                    </div>
                  )}
                  {estimationResult.labor_breakdown.lead_chips_wipes_hours > 0 && (
                    <div className="breakdown-item">
                      <span className="category-name">Lead (Chips/Wipes)</span>
                      <span className="category-hours">
                        {estimationResult.labor_breakdown.lead_chips_wipes_hours?.toFixed(2) || '0.00'} hours
                      </span>
                    </div>
                  )}
                  {estimationResult.labor_breakdown.mold_hours > 0 && (
                    <div className="breakdown-item">
                      <span className="category-name">Mold</span>
                      <span className="category-hours">
                        {estimationResult.labor_breakdown.mold_hours?.toFixed(2) || '0.00'} hours
                      </span>
                    </div>
                  )}
                  {estimationResult.labor_breakdown.orm_hours > 0 && (
                    <div className="breakdown-item">
                      <span className="category-name">Other Regulated Materials (ORM)</span>
                      <span className="category-hours">
                        {estimationResult.labor_breakdown.orm_hours?.toFixed(2) || '0.00'} hours
                      </span>
                    </div>
                  )}
                  <div className="breakdown-item highlight">
                    <span className="category-name">Efficiency Factor</span>
                    <span className="category-hours">
                      {estimationResult.labor_breakdown.efficiency_factor?.toFixed(2) || '1.00'}x
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Labor Cost Breakdown Section */}
            {(estimationResult.selected_role || estimationResult.calculated_cost || estimationResult.manual_labor_costs || estimationResult.total_cost) && (
              <div className="labor-cost-breakdown">
                <h3>Labor Cost Breakdown</h3>
                <div className="breakdown-list">
                  {estimationResult.selected_role && (
                    <div className="breakdown-item">
                      <span className="category-name">Selected Role</span>
                      <span className="category-hours">{estimationResult.selected_role}</span>
                    </div>
                  )}
                  {estimationResult.calculated_cost !== null && estimationResult.calculated_cost !== undefined && (
                    <div className="breakdown-item">
                      <span className="category-name">Calculated Cost (Suggested Hours × Rate)</span>
                      <span className="category-hours">
                        ${estimationResult.calculated_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {estimationResult.manual_labor_costs && Object.keys(estimationResult.manual_labor_costs).length > 0 && (
                    <div className="breakdown-item">
                      <span className="category-name" style={{ fontWeight: 'bold', marginBottom: '10px', display: 'block' }}>Manual Labor Costs</span>
                      <div style={{ width: '100%' }}>
                        {Object.entries(estimationResult.manual_labor_costs).map(([role, cost]) => (
                          <div key={role} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingLeft: '15px' }}>
                            <span className="category-name">{role}</span>
                            <span className="category-hours">
                              ${typeof cost === 'number' ? cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : cost}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {estimationResult.total_cost !== null && estimationResult.total_cost !== undefined && (
                    <div className="breakdown-item highlight">
                      <span className="category-name">Total Estimated Cost</span>
                      <span className="category-hours" style={{ fontSize: '1.2rem' }}>
                        ${estimationResult.total_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {estimationResult.id && (
              <div className="estimation-id">
                <p>Estimation ID: <strong>{estimationResult.id}</strong></p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HRSEstimator;

