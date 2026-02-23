import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { hrsEstimatorAPI, estimateSnapshotAPI } from '../services/api';
import StaffRows from './StaffRows';
import ProjectHeader from './ProjectHeader';
import HRSBreakdownDetails from './HRSBreakdownDetails';
import './HRSEstimator.css';

const HRSEstimator = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { project, handleProjectNotFound } = useProject();

  // Form state
  const [fieldStaffCount, setFieldStaffCount] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [estimationResult, setEstimationResult] = useState(null);
  const [laborRates, setLaborRates] = useState([]);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Role-based access control
  const userRole = localStorage.getItem('user_role') || 'user';
  const canSeeRates = userRole === 'admin';

  // Staff rows (multiple roles support)
  const [staffRows, setStaffRows] = useState([{ role: '', count: 0 }]);

  // Legacy: single role selection (for backward compatibility)
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

  // Fetch labor rates on mount
  useEffect(() => {
    const fetchLaborRates = async () => {
      try {
        const rates = await hrsEstimatorAPI.getLaborRates();
        setLaborRates(rates);
      } catch (err) {
        console.error('Error fetching labor rates:', err);
      }
    };
    fetchLaborRates();
  }, []);

  // Project context is managed by ProjectProvider - no need for localStorage

  // Load snapshot data when project name is available (for form rehydration)
  // IMPORTANT: This runs when component mounts OR when switching back to this route
  // This ensures form data is restored when user switches tabs and comes back
  useEffect(() => {
    // Only run if we're actually on the HRS Estimator route
    if (location.pathname !== '/hrs-estimator') {
      return;
    }

    const loadSnapshotData = async () => {
      if (!project?.name) return;

      try {
        const snapshot = await estimateSnapshotAPI.getLatestSnapshot(project.name);
        if (!snapshot || !snapshot.hrs_estimator_data) {
          // No snapshot data available - form stays empty
          return;
        }

        const hrsData = snapshot.hrs_estimator_data;
        const inputs = hrsData.inputs || {};
        const outputs = hrsData.outputs || {};

        // Rehydrate form fields from saved inputs
        if (inputs.field_staff_count) {
          setFieldStaffCount(inputs.field_staff_count);
        }

        // Override minutes
        if (inputs.override_minutes_asbestos !== undefined && inputs.override_minutes_asbestos !== null) {
          setOverrideMinutes(prev => ({ ...prev, asbestos: inputs.override_minutes_asbestos }));
        }
        if (inputs.override_minutes_xrf !== undefined && inputs.override_minutes_xrf !== null) {
          setOverrideMinutes(prev => ({ ...prev, xrf: inputs.override_minutes_xrf }));
        }
        if (inputs.override_minutes_lead !== undefined && inputs.override_minutes_lead !== null) {
          setOverrideMinutes(prev => ({ ...prev, lead: inputs.override_minutes_lead }));
        }
        if (inputs.override_minutes_mold !== undefined && inputs.override_minutes_mold !== null) {
          setOverrideMinutes(prev => ({ ...prev, mold: inputs.override_minutes_mold }));
        }

        // Asbestos lines
        if (inputs.asbestos_lines && Array.isArray(inputs.asbestos_lines)) {
          const newAsbestosData = { ...asbestosData };
          inputs.asbestos_lines.forEach(line => {
            if (line.component_name && newAsbestosData[line.component_name]) {
              newAsbestosData[line.component_name] = {
                actuals: line.actuals?.toString() || '',
                bulks_per_unit: line.bulks_per_unit?.toString() || '',
                unit_label: line.unit_label || 'Rooms'
              };
            }
          });
          setAsbestosData(newAsbestosData);
        }

        // Lead lines
        if (inputs.lead_lines && Array.isArray(inputs.lead_lines)) {
          const newLeadData = { ...leadData };
          inputs.lead_lines.forEach(line => {
            if (line.component_name && newLeadData[line.component_name]) {
              newLeadData[line.component_name] = {
                xrf_shots: line.xrf_shots?.toString() || '',
                chips_wipes: line.chips_wipes?.toString() || ''
              };
            }
          });
          setLeadData(newLeadData);
        }

        // Mold lines
        if (inputs.mold_lines && Array.isArray(inputs.mold_lines)) {
          const newMoldData = { ...moldData };
          inputs.mold_lines.forEach(line => {
            if (line.component_name && newMoldData[line.component_name]) {
              newMoldData[line.component_name] = {
                tape_lift: line.tape_lift?.toString() || '',
                spore_trap: line.spore_trap?.toString() || '',
                culturable: line.culturable?.toString() || ''
              };
            }
          });
          setMoldData(newMoldData);
        }

        // ORM
        if (inputs.orm) {
          setOrmData({
            building_total_sf: inputs.orm.building_total_sf?.toString() || '',
            hours: inputs.orm.hours?.toString() || ''
          });
        }

        // Staff selection
        if (inputs.staff && Array.isArray(inputs.staff) && inputs.staff.length > 0) {
          setStaffRows(inputs.staff.map(s => ({ role: s.role || '', count: s.count || 0 })));
        } else if (inputs.selected_role) {
          setSelectedRole(inputs.selected_role);
        }

        // Manual labor hours
        if (inputs.manual_labor_hours) {
          const loadedManualHours = {
            'Program Manager': inputs.manual_labor_hours['Program Manager']?.toString() || '',
            'Project Manager': inputs.manual_labor_hours['Project Manager']?.toString() || '',
            'Accounting': inputs.manual_labor_hours['Accounting']?.toString() || '',
            'Administrative': inputs.manual_labor_hours['Administrative']?.toString() || '',
          };
          setManualLaborHours(loadedManualHours);
        }

        // If there are outputs, show the results
        if (outputs.id) {
          setEstimationResult(outputs);
          setShowBreakdown(true);
        }

      } catch (error) {
        console.error('Error loading snapshot data:', error);
        // Handle 404 - project not found
        if (error.response?.status === 404) {
          handleProjectNotFound();
        }
        // Don't show other errors to user - just proceed with empty form
      }
    };

    loadSnapshotData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.name, location.pathname]);

  // Calculate total staff count from staff rows
  const totalStaff = staffRows.reduce((sum, row) => sum + (parseInt(row.count) || 0), 0);

  // Initialize staff rows when field staff count changes
  useEffect(() => {
    const fieldCount = parseInt(fieldStaffCount) || 1;

    // If field staff count changes and we have no rows or all rows are empty, create initial rows
    if (staffRows.length === 0 || (staffRows.length === 1 && !staffRows[0].role && staffRows[0].count === 0)) {
      const newRows = [];
      for (let i = 0; i < Math.min(fieldCount, 3); i++) { // Start with up to 3 rows
        newRows.push({ role: '', count: 1 });
      }
      setStaffRows(newRows);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldStaffCount]);

  // Advanced settings (override_minutes fields)
  const [overrideMinutes, setOverrideMinutes] = useState({
    asbestos: null,
    xrf: null,
    lead: null,
    mold: null,
  });

  // Asbestos Sampling state
  const [asbestosData, setAsbestosData] = useState({
    'Walls': { actuals: '', bulks_per_unit: '', unit_label: 'Rooms' },
    'Flooring': { actuals: '', bulks_per_unit: '', unit_label: 'Rooms' },
    'Ceilings': { actuals: '', bulks_per_unit: '', unit_label: 'Rooms' },
    'Exterior Sides (CAB, etc.)': { actuals: '', bulks_per_unit: '', unit_label: 'LF' },
    'Piping': { actuals: '', bulks_per_unit: '', unit_label: 'LF' },
    'Tanks': { actuals: '', bulks_per_unit: '', unit_label: 'EA' },
  });

  // Custom rows for each section
  const [customAsbestosRows, setCustomAsbestosRows] = useState([]);
  const [customLeadRows, setCustomLeadRows] = useState([]);
  const [customMoldRows, setCustomMoldRows] = useState([]);

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
      const actuals = parseInt(data.actuals) || 0;
      const bulksPerUnit = parseInt(data.bulks_per_unit) || 0;
      const bulkSummary = Math.round(actuals * bulksPerUnit);
      bulkSummaries[component] = bulkSummary;
      totalPLM += bulkSummary;
    });

    // Include custom rows
    customAsbestosRows.forEach((row) => {
      const actuals = parseInt(row.actuals) || 0;
      const bulksPerUnit = parseInt(row.bulks_per_unit) || 0;
      const bulkSummary = Math.round(actuals * bulksPerUnit);
      bulkSummaries[row.name || 'Custom'] = bulkSummary;
      totalPLM += bulkSummary;
    });

    return { bulkSummaries, totalPLM };
  };

  // Calculate Lead totals
  const calculateLeadTotals = () => {
    let totalXRF = 0;
    let totalChipsWipes = 0;

    Object.values(leadData).forEach(data => {
      totalXRF += parseInt(data.xrf_shots) || 0;
      totalChipsWipes += parseInt(data.chips_wipes) || 0;
    });

    // Include custom rows
    customLeadRows.forEach(row => {
      totalXRF += parseInt(row.xrf_shots) || 0;
      totalChipsWipes += parseInt(row.chips_wipes) || 0;
    });

    return { totalXRF, totalChipsWipes };
  };

  // Calculate Mold totals
  const calculateMoldTotals = () => {
    let totalTapeLift = 0;
    let totalSporeTrap = 0;
    let totalCulturable = 0;

    Object.values(moldData).forEach(data => {
      totalTapeLift += parseInt(data.tape_lift) || 0;
      totalSporeTrap += parseInt(data.spore_trap) || 0;
      totalCulturable += parseInt(data.culturable) || 0;
    });

    // Include custom rows
    customMoldRows.forEach(row => {
      totalTapeLift += parseInt(row.tape_lift) || 0;
      totalSporeTrap += parseInt(row.spore_trap) || 0;
      totalCulturable += parseInt(row.culturable) || 0;
    });

    return { totalTapeLift, totalSporeTrap, totalCulturable };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setEstimationResult(null);

    try {
      // Build asbestos_lines (default + custom)
      const asbestosLines = [
        ...Object.entries(asbestosData).map(([component_name, data]) => ({
          component_name,
          unit_label: data.unit_label,
          actuals: parseInt(data.actuals) || 0,
          bulks_per_unit: parseInt(data.bulks_per_unit) || 0,
        })),
        ...customAsbestosRows.filter(r => r.name).map(row => ({
          component_name: row.name,
          unit_label: row.unit_label || 'EA',
          actuals: parseInt(row.actuals) || 0,
          bulks_per_unit: parseInt(row.bulks_per_unit) || 0,
        })),
      ];

      // Build lead_lines (default + custom)
      const leadLines = [
        ...Object.entries(leadData).map(([component_name, data]) => ({
          component_name,
          xrf_shots: parseInt(data.xrf_shots) || 0,
          chips_wipes: parseInt(data.chips_wipes) || 0,
        })),
        ...customLeadRows.filter(r => r.name).map(row => ({
          component_name: row.name,
          xrf_shots: parseInt(row.xrf_shots) || 0,
          chips_wipes: parseInt(row.chips_wipes) || 0,
        })),
      ];

      // Build mold_lines (default + custom)
      const moldLines = [
        ...Object.entries(moldData).map(([component_name, data]) => ({
          component_name,
          tape_lift: parseInt(data.tape_lift) || 0,
          spore_trap: parseInt(data.spore_trap) || 0,
          culturable: parseInt(data.culturable) || 0,
        })),
        ...customMoldRows.filter(r => r.name).map(row => ({
          component_name: row.name,
          tape_lift: parseInt(row.tape_lift) || 0,
          spore_trap: parseInt(row.spore_trap) || 0,
          culturable: parseInt(row.culturable) || 0,
        })),
      ];

      // Build request payload
      const payload = {
        project_name: project?.name || null,
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

      // Build staff array from valid rows (preferred method)
      const validStaffRows = staffRows.filter(row => row.role && (parseInt(row.count) || 0) > 0);
      if (validStaffRows.length > 0) {
        payload.staff = validStaffRows.map(row => ({
          role: row.role,
          count: parseInt(row.count) || 0
        }));
      } else if (selectedRole) {
        // Legacy: single role support
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

      // Project name is managed by context - no need to set it here

      // Set field staff count
      if (estimation.field_staff_count) {
        setFieldStaffCount(estimation.field_staff_count);
      }

      // Load asbestos data
      if (estimation.asbestos_lines) {
        const defaultAsbestosKeys = ['Walls', 'Flooring', 'Ceilings', 'Exterior Sides (CAB, etc.)', 'Piping', 'Tanks'];
        const newAsbestosData = {
          'Walls': { actuals: '', bulks_per_unit: '', unit_label: 'Rooms' },
          'Flooring': { actuals: '', bulks_per_unit: '', unit_label: 'Rooms' },
          'Ceilings': { actuals: '', bulks_per_unit: '', unit_label: 'Rooms' },
          'Exterior Sides (CAB, etc.)': { actuals: '', bulks_per_unit: '', unit_label: 'LF' },
          'Piping': { actuals: '', bulks_per_unit: '', unit_label: 'LF' },
          'Tanks': { actuals: '', bulks_per_unit: '', unit_label: 'EA' },
        };
        const loadedCustomAsbestos = [];
        estimation.asbestos_lines.forEach(line => {
          if (newAsbestosData[line.component_name]) {
            newAsbestosData[line.component_name] = {
              actuals: line.actuals?.toString() || '',
              bulks_per_unit: line.bulks_per_unit?.toString() || '',
              unit_label: line.unit_label || newAsbestosData[line.component_name].unit_label,
            };
          } else if (!defaultAsbestosKeys.includes(line.component_name)) {
            // Custom row from saved data
            loadedCustomAsbestos.push({
              name: line.component_name,
              actuals: line.actuals?.toString() || '',
              bulks_per_unit: line.bulks_per_unit?.toString() || '',
              unit_label: line.unit_label || 'EA',
            });
          }
        });
        setAsbestosData(newAsbestosData);
        if (loadedCustomAsbestos.length > 0) setCustomAsbestosRows(loadedCustomAsbestos);
      }

      // Load lead data
      if (estimation.lead_lines) {
        const defaultLeadKeys = ['Walls', 'Windows', 'Doors', 'Exterior', 'Other'];
        const newLeadData = {
          'Walls': { xrf_shots: '', chips_wipes: '' },
          'Windows': { xrf_shots: '', chips_wipes: '' },
          'Doors': { xrf_shots: '', chips_wipes: '' },
          'Exterior': { xrf_shots: '', chips_wipes: '' },
          'Other': { xrf_shots: '', chips_wipes: '' },
        };
        const loadedCustomLead = [];
        estimation.lead_lines.forEach(line => {
          if (newLeadData[line.component_name]) {
            newLeadData[line.component_name] = {
              xrf_shots: line.xrf_shots?.toString() || '',
              chips_wipes: line.chips_wipes?.toString() || '',
            };
          } else if (!defaultLeadKeys.includes(line.component_name)) {
            loadedCustomLead.push({
              name: line.component_name,
              xrf_shots: line.xrf_shots?.toString() || '',
              chips_wipes: line.chips_wipes?.toString() || '',
            });
          }
        });
        setLeadData(newLeadData);
        if (loadedCustomLead.length > 0) setCustomLeadRows(loadedCustomLead);
      }

      // Load mold data
      if (estimation.mold_lines) {
        const defaultMoldKeys = ['Living Room', 'Kitchen', 'Bath', 'Crawl Space', 'Mech Room', 'Bedroom'];
        const newMoldData = {
          'Living Room': { tape_lift: '', spore_trap: '', culturable: '' },
          'Kitchen': { tape_lift: '', spore_trap: '', culturable: '' },
          'Bath': { tape_lift: '', spore_trap: '', culturable: '' },
          'Crawl Space': { tape_lift: '', spore_trap: '', culturable: '' },
          'Mech Room': { tape_lift: '', spore_trap: '', culturable: '' },
          'Bedroom': { tape_lift: '', spore_trap: '', culturable: '' },
        };
        const loadedCustomMold = [];
        estimation.mold_lines.forEach(line => {
          if (newMoldData[line.component_name]) {
            newMoldData[line.component_name] = {
              tape_lift: line.tape_lift?.toString() || '',
              spore_trap: line.spore_trap?.toString() || '',
              culturable: line.culturable?.toString() || '',
            };
          } else if (!defaultMoldKeys.includes(line.component_name)) {
            loadedCustomMold.push({
              name: line.component_name,
              tape_lift: line.tape_lift?.toString() || '',
              spore_trap: line.spore_trap?.toString() || '',
              culturable: line.culturable?.toString() || '',
            });
          }
        });
        setMoldData(newMoldData);
        if (loadedCustomMold.length > 0) setCustomMoldRows(loadedCustomMold);
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

      // Load staff breakdown (preferred) or legacy selected_role
      if (estimation.staff_breakdown && Array.isArray(estimation.staff_breakdown) && estimation.staff_breakdown.length > 0) {
        setStaffRows(estimation.staff_breakdown.map(s => ({ role: s.role || '', count: s.count || 0 })));
      } else if (estimation.selected_role) {
        // Legacy: single role
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
          Home
        </Link>
        <div className="nav-title">
          <h1>HRS Sample Estimator</h1>
        </div>
        <button
          className="view-estimations-btn"
          onClick={() => navigate('/previous-estimates')}
        >
          View Previous Estimates
        </button>
      </nav>

      {/* <header className="hrs-estimator-header">
        <p>Calculate the hours needed for field sampling work</p>
      </header> */}

      {/* Project Header with Navigation */}
      <ProjectHeader projectName={project?.name} moduleName="hrs" />

      <div className="hrs-estimator-content">
        <form onSubmit={handleSubmit} className="estimator-form">
          {/* Asbestos Sampling Section */}
          <div className="collapsible-section">
            <div
              className="section-header clickable"
              onClick={() => toggleSection('asbestos')}
            >
              <h2>Asbestos Sampling</h2>
              <span className="toggle-icon">{expandedSections.asbestos ? '▼' : '▶'}</span>
            </div>
            {expandedSections.asbestos && (
              <div className="section-content">
                <div className="input-grid">
                  {Object.entries(asbestosData).map(([component, data]) => {
                    return (
                      <div key={component} className="input-row">
                        <div className="component-name">{component}</div>
                        <div className="input-group">
                          <label>Number of {data.unit_label}</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={data.actuals}
                            onChange={(e) => {
                              let value = e.target.value;
                              // Only allow whole numbers
                              if (value !== '' && !isNaN(value)) {
                                value = Math.floor(Math.max(0, parseInt(value) || 0)).toString();
                              }
                              setAsbestosData({
                                ...asbestosData,
                                [component]: { ...data, actuals: value }
                              });
                            }}
                            className="form-input small"
                            placeholder="0"
                          />
                        </div>
                        <div className="input-group">
                          <label>Bulk Samples per {data.unit_label === 'Rooms' ? 'Room' : data.unit_label === 'LF' ? 'Linear Foot' : 'Each'}</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={data.bulks_per_unit}
                            onChange={(e) => {
                              let value = e.target.value;
                              // Only allow whole numbers
                              if (value !== '' && !isNaN(value)) {
                                value = Math.floor(Math.max(0, parseInt(value) || 0)).toString();
                              }
                              setAsbestosData({
                                ...asbestosData,
                                [component]: { ...data, bulks_per_unit: value }
                              });
                            }}
                            className="form-input small"
                            placeholder="0"
                          />
                        </div>
                        <div className="calculated-value">
                          <label>Total Bulk Samples</label>
                          <div className="value-display">
                            {Math.round(asbestosTotals.bulkSummaries[component])}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Asbestos Rows */}
                {customAsbestosRows.map((row, index) => (
                  <div key={`custom-asbestos-${index}`} className="input-row" style={{ background: '#f0f7ff', borderLeft: '3px solid #3498db' }}>
                    <div className="component-name">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => {
                          const updated = [...customAsbestosRows];
                          updated[index] = { ...row, name: e.target.value };
                          setCustomAsbestosRows(updated);
                        }}
                        className="form-input small"
                        placeholder="Enter name..."
                        style={{ fontWeight: 'bold', border: '1px dashed #3498db' }}
                      />
                    </div>
                    <div className="input-group">
                      <label>Number of Units</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={row.actuals}
                        onChange={(e) => {
                          let value = e.target.value;
                          if (value !== '' && !isNaN(value)) {
                            value = Math.floor(Math.max(0, parseInt(value) || 0)).toString();
                          }
                          const updated = [...customAsbestosRows];
                          updated[index] = { ...row, actuals: value };
                          setCustomAsbestosRows(updated);
                        }}
                        className="form-input small"
                        placeholder="0"
                      />
                    </div>
                    <div className="input-group">
                      <label>Bulk Samples per Unit</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={row.bulks_per_unit}
                        onChange={(e) => {
                          let value = e.target.value;
                          if (value !== '' && !isNaN(value)) {
                            value = Math.floor(Math.max(0, parseInt(value) || 0)).toString();
                          }
                          const updated = [...customAsbestosRows];
                          updated[index] = { ...row, bulks_per_unit: value };
                          setCustomAsbestosRows(updated);
                        }}
                        className="form-input small"
                        placeholder="0"
                      />
                    </div>
                    <div className="calculated-value">
                      <label>Total</label>
                      <div className="value-display">
                        {Math.round((parseInt(row.actuals) || 0) * (parseInt(row.bulks_per_unit) || 0))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomAsbestosRows(customAsbestosRows.filter((_, i) => i !== index))}
                      style={{ background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.85rem', alignSelf: 'center' }}
                    >✕</button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setCustomAsbestosRows([...customAsbestosRows, { name: '', actuals: '', bulks_per_unit: '', unit_label: 'EA' }])}
                  style={{ marginTop: '10px', padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' }}
                >
                  + Add Custom Row
                </button>

                <div className="section-total">
                  <strong>Total PLM: {Math.round(asbestosTotals.totalPLM)}</strong>
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
              <h2>Lead Sampling</h2>
              <span className="toggle-icon">{expandedSections.lead ? '▼' : '▶'}</span>
            </div>
            {expandedSections.lead && (
              <div className="section-content">
                <div className="input-grid">
                  {Object.entries(leadData).map(([component, data]) => (
                    <div key={component} className="input-row">
                      <div className="component-name">{component}</div>
                      <div className="input-group">
                        <label>Number of XRF Shots</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={data.xrf_shots}
                          onChange={(e) => {
                            let value = e.target.value;
                            // Only allow whole numbers
                            if (value !== '' && !isNaN(value)) {
                              value = Math.floor(Math.max(0, parseFloat(value) || 0)).toString();
                            }
                            setLeadData({
                              ...leadData,
                              [component]: { ...data, xrf_shots: value }
                            });
                          }}
                          className="form-input small"
                          placeholder="0"
                        />
                      </div>
                      <div className="input-group">
                        <label>Number of Chips/Wipes</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={data.chips_wipes}
                          onChange={(e) => {
                            let value = e.target.value;
                            // Only allow whole numbers
                            if (value !== '' && !isNaN(value)) {
                              value = Math.floor(Math.max(0, parseFloat(value) || 0)).toString();
                            }
                            setLeadData({
                              ...leadData,
                              [component]: { ...data, chips_wipes: value }
                            });
                          }}
                          className="form-input small"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Custom Lead Rows */}
                {customLeadRows.map((row, index) => (
                  <div key={`custom-lead-${index}`} className="input-row" style={{ background: '#f0f7ff', borderLeft: '3px solid #3498db' }}>
                    <div className="component-name">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => {
                          const updated = [...customLeadRows];
                          updated[index] = { ...row, name: e.target.value };
                          setCustomLeadRows(updated);
                        }}
                        className="form-input small"
                        placeholder="Enter name..."
                        style={{ fontWeight: 'bold', border: '1px dashed #3498db' }}
                      />
                    </div>
                    <div className="input-group">
                      <label>Number of XRF Shots</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={row.xrf_shots}
                        onChange={(e) => {
                          let value = e.target.value;
                          if (value !== '' && !isNaN(value)) {
                            value = Math.floor(Math.max(0, parseInt(value) || 0)).toString();
                          }
                          const updated = [...customLeadRows];
                          updated[index] = { ...row, xrf_shots: value };
                          setCustomLeadRows(updated);
                        }}
                        className="form-input small"
                        placeholder="0"
                      />
                    </div>
                    <div className="input-group">
                      <label>Number of Chips/Wipes</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={row.chips_wipes}
                        onChange={(e) => {
                          let value = e.target.value;
                          if (value !== '' && !isNaN(value)) {
                            value = Math.floor(Math.max(0, parseInt(value) || 0)).toString();
                          }
                          const updated = [...customLeadRows];
                          updated[index] = { ...row, chips_wipes: value };
                          setCustomLeadRows(updated);
                        }}
                        className="form-input small"
                        placeholder="0"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomLeadRows(customLeadRows.filter((_, i) => i !== index))}
                      style={{ background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.85rem', alignSelf: 'center' }}
                    >✕</button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setCustomLeadRows([...customLeadRows, { name: '', xrf_shots: '', chips_wipes: '' }])}
                  style={{ marginTop: '10px', padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' }}
                >
                  + Add Custom Row
                </button>

                <div className="section-total">
                  <strong>Total XRF Shots: {Math.round(leadTotals.totalXRF)}</strong>
                  <strong>Total Chips/Wipes: {Math.round(leadTotals.totalChipsWipes)}</strong>
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
              <h2>Mold Sampling</h2>
              <span className="toggle-icon">{expandedSections.mold ? '▼' : '▶'}</span>
            </div>
            {expandedSections.mold && (
              <div className="section-content">
                <div className="input-grid">
                  {Object.entries(moldData).map(([component, data]) => (
                    <div key={component} className="input-row">
                      <div className="component-name">{component}</div>
                      <div className="input-group">
                        <label>Number of Tape Lift Samples</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={data.tape_lift}
                          onChange={(e) => {
                            let value = e.target.value;
                            // Only allow whole numbers
                            if (value !== '' && !isNaN(value)) {
                              value = Math.floor(Math.max(0, parseFloat(value) || 0)).toString();
                            }
                            setMoldData({
                              ...moldData,
                              [component]: { ...data, tape_lift: value }
                            });
                          }}
                          className="form-input small"
                          placeholder="0"
                        />
                      </div>
                      <div className="input-group">
                        <label>Number of Spore Trap Samples</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={data.spore_trap}
                          onChange={(e) => {
                            let value = e.target.value;
                            // Only allow whole numbers
                            if (value !== '' && !isNaN(value)) {
                              value = Math.floor(Math.max(0, parseFloat(value) || 0)).toString();
                            }
                            setMoldData({
                              ...moldData,
                              [component]: { ...data, spore_trap: value }
                            });
                          }}
                          className="form-input small"
                          placeholder="0"
                        />
                      </div>
                      <div className="input-group">
                        <label>Number of Culturable Samples</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={data.culturable}
                          onChange={(e) => {
                            let value = e.target.value;
                            // Only allow whole numbers
                            if (value !== '' && !isNaN(value)) {
                              value = Math.floor(Math.max(0, parseFloat(value) || 0)).toString();
                            }
                            setMoldData({
                              ...moldData,
                              [component]: { ...data, culturable: value }
                            });
                          }}
                          className="form-input small"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Custom Mold Rows */}
                {customMoldRows.map((row, index) => (
                  <div key={`custom-mold-${index}`} className="input-row" style={{ background: '#f0f7ff', borderLeft: '3px solid #3498db' }}>
                    <div className="component-name">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => {
                          const updated = [...customMoldRows];
                          updated[index] = { ...row, name: e.target.value };
                          setCustomMoldRows(updated);
                        }}
                        className="form-input small"
                        placeholder="Enter name..."
                        style={{ fontWeight: 'bold', border: '1px dashed #3498db' }}
                      />
                    </div>
                    <div className="input-group">
                      <label>Tape Lift Samples</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={row.tape_lift}
                        onChange={(e) => {
                          let value = e.target.value;
                          if (value !== '' && !isNaN(value)) {
                            value = Math.floor(Math.max(0, parseInt(value) || 0)).toString();
                          }
                          const updated = [...customMoldRows];
                          updated[index] = { ...row, tape_lift: value };
                          setCustomMoldRows(updated);
                        }}
                        className="form-input small"
                        placeholder="0"
                      />
                    </div>
                    <div className="input-group">
                      <label>Spore Trap Samples</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={row.spore_trap}
                        onChange={(e) => {
                          let value = e.target.value;
                          if (value !== '' && !isNaN(value)) {
                            value = Math.floor(Math.max(0, parseInt(value) || 0)).toString();
                          }
                          const updated = [...customMoldRows];
                          updated[index] = { ...row, spore_trap: value };
                          setCustomMoldRows(updated);
                        }}
                        className="form-input small"
                        placeholder="0"
                      />
                    </div>
                    <div className="input-group">
                      <label>Culturable Samples</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={row.culturable}
                        onChange={(e) => {
                          let value = e.target.value;
                          if (value !== '' && !isNaN(value)) {
                            value = Math.floor(Math.max(0, parseInt(value) || 0)).toString();
                          }
                          const updated = [...customMoldRows];
                          updated[index] = { ...row, culturable: value };
                          setCustomMoldRows(updated);
                        }}
                        className="form-input small"
                        placeholder="0"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomMoldRows(customMoldRows.filter((_, i) => i !== index))}
                      style={{ background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.85rem', alignSelf: 'center' }}
                    >✕</button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setCustomMoldRows([...customMoldRows, { name: '', tape_lift: '', spore_trap: '', culturable: '' }])}
                  style={{ marginTop: '10px', padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' }}
                >
                  + Add Custom Row
                </button>

                <div className="section-total">
                  <strong>Total Tape Lift: {Math.round(moldTotals.totalTapeLift)}</strong>
                  <strong>Total Spore Trap: {Math.round(moldTotals.totalSporeTrap)}</strong>
                  <strong>Total Culturable: {Math.round(moldTotals.totalCulturable)}</strong>
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
              <h2>Other Regulated Materials</h2>
              <span className="toggle-icon">{expandedSections.orm ? '▼' : '▶'}</span>
            </div>
            {expandedSections.orm && (
              <div className="section-content">
                <div className="input-row">
                  <div className="input-group">
                    <label>Building Total Square Feet</label>
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
                    <label>Estimated Hours</label>
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
              <small style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px', display: 'block' }}>
                How many people will be doing the field work? This helps calculate how long the job will take.
              </small>
            </div>
          </div>

          {/* Staff Rows - Multiple Roles */}
          <div className="form-section">
            <div style={{ marginBottom: '10px' }}>
              <h3 style={{ color: '#2c3e50', marginBottom: '5px', fontSize: '1.1rem' }}>
                Select Staff Roles
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px' }}>
                Tell us what roles your {fieldStaffCount} staff member{parseInt(fieldStaffCount) !== 1 ? 's' : ''} will have.
                You can add multiple people with the same role (for example, 2 Environmental Scientists and 1 Technician).
              </p>
              {totalStaff !== parseInt(fieldStaffCount) && totalStaff > 0 && (
                <div style={{
                  padding: '12px',
                  background: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '6px',
                  marginBottom: '10px',
                  fontSize: '0.9rem',
                  color: '#856404'
                }}>
                  <strong>Note:</strong> The total staff count ({totalStaff}) doesn't match the number you entered above ({fieldStaffCount}). Please adjust the counts below to match.
                </div>
              )}
            </div>
            <StaffRows
              staffRows={staffRows}
              setStaffRows={setStaffRows}
              laborRates={laborRates}
              totalStaffCount={totalStaff}
              fieldStaffCount={fieldStaffCount}
            />
          </div>

          {/* Additional Labor Categories Section */}
          <div className="collapsible-section">
            <div
              className="section-header clickable"
              onClick={() => setExpandedSections(prev => ({ ...prev, laborCategories: !prev.laborCategories }))}
            >
              <h2>Additional Labor Hours</h2>
              <span className="toggle-icon">{expandedSections.laborCategories ? '▼' : '▶'}</span>
            </div>
            {expandedSections.laborCategories && (
              <div className="section-content">
                <div className="input-grid">
                  <div className="input-group">
                    <label>Program Manager Hours{canSeeRates ? ` ($${laborRates.find(r => r.labor_role === 'Program Manager')?.hourly_rate?.toFixed(2) || '131.55'}/hr)` : ''}</label>
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
                    <label>Project Manager Hours{canSeeRates ? ` ($${laborRates.find(r => r.labor_role === 'Project Manager')?.hourly_rate?.toFixed(2) || '104.23'}/hr)` : ''}</label>
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
                    <label>Accounting Hours{canSeeRates ? ` ($${laborRates.find(r => r.labor_role === 'Accounting')?.hourly_rate?.toFixed(2) || '95.36'}/hr)` : ''}</label>
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
                    <label>Administrative Hours{canSeeRates ? ` ($${laborRates.find(r => r.labor_role === 'Administrative')?.hourly_rate?.toFixed(2) || '54.80'}/hr)` : ''}</label>
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
              <h2>Advanced Settings</h2>
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
              <p><strong>Error:</strong> {error}</p>
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

            {/* Staff Labor Cost Breakdown */}
            {(estimationResult.staff_breakdown && estimationResult.staff_breakdown.length > 0 && estimationResult.staff_labor_costs) && (
              <div className="category-breakdown">
                <h3>Staff Labor Cost Breakdown</h3>
                <table className="staff-breakdown-table">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th className="text-center">Count</th>
                      <th className="text-right">Hours</th>
                      {canSeeRates && <th className="text-right">Rate</th>}
                      {canSeeRates && <th className="text-right">Cost</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {estimationResult.staff_breakdown.map((staff, index) => {
                      const role = staff.role;
                      const count = staff.count || 0;
                      const cost = estimationResult.staff_labor_costs[role] || 0;
                      const rateEntry = laborRates.find(r => r.labor_role === role);
                      const rate = rateEntry ? rateEntry.hourly_rate : null;
                      const hours = rate && rate > 0 ? (cost / (rate * count)) : 0;

                      return (
                        <tr key={index}>
                          <td>{role}</td>
                          <td className="text-center">{count}</td>
                          <td className="text-right">{hours > 0 ? hours.toFixed(2) : 'N/A'}</td>
                          {canSeeRates && (
                            <td className="text-right">
                              {rate ? `$${rate.toFixed(2)}/hr` : 'N/A'}
                            </td>
                          )}
                          {canSeeRates && (
                            <td className="text-right">
                              ${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

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

            {/* Calculation Breakdown Toggle */}
            <div style={{ marginTop: '30px', textAlign: 'center' }}>
              <button
                className={`show-breakdown-btn ${showBreakdown ? 'active' : ''}`}
                onClick={() => setShowBreakdown(!showBreakdown)}
                style={{
                  padding: '12px 24px',
                  background: showBreakdown ? '#3498db' : '#95a5a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                {showBreakdown ? '▼ Hide Detailed Breakdown' : '▶ Show Detailed Breakdown'}
              </button>
            </div>

            {/* Detailed Calculation Breakdown */}
            {showBreakdown && (
              <HRSBreakdownDetails
                details={estimationResult}
                inputs={{
                  field_staff_count: estimationResult?.field_staff_count || fieldStaffCount,
                  efficiency_factor: estimationResult?.efficiency_factor || estimationResult?.labor_breakdown?.efficiency_factor || 1.0,
                  override_minutes_asbestos: overrideMinutes.asbestos,
                  override_minutes_xrf: overrideMinutes.xrf,
                  override_minutes_lead: overrideMinutes.lead,
                  override_minutes_mold: overrideMinutes.mold
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HRSEstimator;


