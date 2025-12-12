import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { logisticsAPI } from '../services/api';
import DrivingSection from './DrivingSection';
import FlightsSection from './FlightsSection';
import RentalSection from './RentalSection';
import LodgingSection from './LodgingSection';
import LogisticsResultsCard from './LogisticsResultsCard';
import StaffRows from './StaffRows';
import ProjectHeader from './ProjectHeader';
import './Logistics.css';

const Logistics = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Form state
  const [projectName, setProjectName] = useState('');
  const [siteAccessMode, setSiteAccessMode] = useState('driving');
  const [isLocalProject, setIsLocalProject] = useState(false);
  const [useClientVehicle, setUseClientVehicle] = useState(false);
  const [staffRows, setStaffRows] = useState([{ role: '', count: 0 }]);
  const [perDiemRate, setPerDiemRate] = useState(50); // Default to $50 On-Road
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [estimationResult, setEstimationResult] = useState(null);
  const [laborRates, setLaborRates] = useState([]);
  
  // Section expand/collapse state
  const [expandedSections, setExpandedSections] = useState({
    driving: true,
    flights: false,
    rental: false,
    lodging: false,
  });
  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Rate multiplier state
  const [rateMultiplier, setRateMultiplier] = useState(1.0);
  
  // Roundtrip driving state (for site_access_mode === "driving")
  const [roundtripDrivingData, setRoundtripDrivingData] = useState({
    project_location: '',
    num_vehicles: 1,
    one_way_miles: 0.0,
    drive_time_hours: null,
    project_duration_days: 0,
    mpg: null,
    cost_per_gallon: null,
    cost_per_mile: null,
    anchorage_flat_fee: 45,
  });
  
  // Daily driving state (lodging ⇄ site commute)
  const [dailyDrivingData, setDailyDrivingData] = useState({
    site_location: '',
    lodging_location: '',
    daily_miles: 0.0,
    daily_drive_time_hours: null,
    project_duration_days: 0,
    mpg: null,
    cost_per_gallon: null,
    cost_per_mile: null,
  });
  
  // Flights state
  const [flightsData, setFlightsData] = useState({
    project_location: '',
    num_tickets: 0,
    roundtrip_cost_per_ticket: 0.0,
    flight_time_hours_one_way: 0.0,
    layover_city: null,
    has_overnight: false,
    layover_hotel_name: null,
    layover_cost_per_night: null,
    layover_rooms: null,
  });
  
  // Rental state
  const [rentalData, setRentalData] = useState({
    project_location: '',
    num_vehicles: 0,
    vehicle_category: null,
    daily_rate: null,
    weekly_rate: null,
    monthly_rate: null,
    rental_period_type: null,
    rental_days: 0,
    fuel_cost_estimate: null,
  });
  
  // Lodging state
  const [lodgingData, setLodgingData] = useState({
    project_location: '',
    hotel_name: null,
    night_cost_with_taxes: 0.0,
    project_duration_days: 0,
    num_staff: 0,
  });
  
  // Fetch labor rates on mount
  useEffect(() => {
    const fetchLaborRates = async () => {
      try {
        const rates = await logisticsAPI.getLaborRates();
        setLaborRates(rates);
      } catch (err) {
        console.error('Error fetching labor rates:', err);
      }
    };
    fetchLaborRates();
  }, []);
  
  // Load project name from localStorage on mount
  useEffect(() => {
    const savedProjectName = localStorage.getItem('currentProjectName');
    if (savedProjectName && !projectName) {
      setProjectName(savedProjectName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save project name to localStorage when it changes
  useEffect(() => {
    if (projectName) {
      localStorage.setItem('currentProjectName', projectName);
    }
  }, [projectName]);

  // Load estimation data from navigation state if available
  useEffect(() => {
    if (location.state?.estimationData) {
      const estimation = location.state.estimationData;
      
      if (estimation.project_name) {
        setProjectName(estimation.project_name);
      }
      if (estimation.site_access_mode) {
        setSiteAccessMode(estimation.site_access_mode);
      }
      if (estimation.is_local_project !== undefined) {
        setIsLocalProject(estimation.is_local_project);
      }
      if (estimation.use_client_vehicle !== undefined) {
        setUseClientVehicle(estimation.use_client_vehicle);
      }
      if (estimation.per_diem_rate) {
        // Map existing per_diem_rate to closest option (50 or 60)
        const rate = parseFloat(estimation.per_diem_rate);
        setPerDiemRate(rate === 60 ? 60 : 50);
      }
      
      // Load staff rows - prefer staff_breakdown (list), fallback to legacy fields
      if (estimation.staff_breakdown && Array.isArray(estimation.staff_breakdown) && estimation.staff_breakdown.length > 0) {
        // New format: staff_breakdown is a list of { role, count }
        setStaffRows(estimation.staff_breakdown.map(s => ({ role: s.role || '', count: s.count || 0 })));
      } else if (estimation.professional_role && estimation.num_staff) {
        // Legacy format: convert to single staff row
        setStaffRows([{ role: estimation.professional_role, count: estimation.num_staff }]);
      }
      
      // Load input snapshots - handle new driving structure
      if (estimation.driving_input) {
        if (estimation.driving_input.roundtrip) {
          setRoundtripDrivingData(estimation.driving_input.roundtrip);
        }
        if (estimation.driving_input.daily) {
          setDailyDrivingData(estimation.driving_input.daily);
        }
        // Legacy: if driving_input is not nested, treat as roundtrip only
        if (!estimation.driving_input.roundtrip && !estimation.driving_input.daily) {
          setRoundtripDrivingData(estimation.driving_input);
          // Daily section remains empty for legacy records
        }
      }
      
      // Load rate multiplier if present
      if (estimation.rate_multiplier !== undefined && estimation.rate_multiplier !== null) {
        setRateMultiplier(estimation.rate_multiplier);
      }
      if (estimation.flights_input) {
        setFlightsData(estimation.flights_input);
      }
      if (estimation.rental_input) {
        setRentalData(estimation.rental_input);
      }
      if (estimation.lodging_input) {
        setLodgingData(estimation.lodging_input);
      }
      
      // If showResults flag is set, display the results immediately
      if (location.state?.showResults) {
        setEstimationResult(estimation);
      }
      
      // Clear navigation state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  
  // Calculate total staff count from staff rows
  const totalStaff = staffRows.reduce((sum, row) => sum + (parseInt(row.count) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setEstimationResult(null);
    
    // Validation: require at least one staff row with count > 0
    const validStaffRows = staffRows.filter(row => row.role && (parseInt(row.count) || 0) > 0);
    if (validStaffRows.length === 0) {
      setError('Please add at least one staff member with a role and count greater than 0.');
      setLoading(false);
      return;
    }
    
    // Validation for driving mode: require roundtrip driving
    if (siteAccessMode === 'driving') {
      if (!roundtripDrivingData.project_location || !roundtripDrivingData.project_duration_days) {
        setError('Roundtrip driving requires project location and duration.');
        setLoading(false);
        return;
      }
      const isAnchorage = roundtripDrivingData.project_location.toLowerCase() === 'anchorage';
      if (!isAnchorage) {
        // For non-Anchorage: require either cost-per-mile OR (MPG + cost-per-gallon)
        const hasCostPerMile = roundtripDrivingData.cost_per_mile && parseFloat(roundtripDrivingData.cost_per_mile) > 0;
        const hasMpgAndGallon = roundtripDrivingData.mpg && roundtripDrivingData.cost_per_gallon && 
                                parseFloat(roundtripDrivingData.mpg) > 0 && parseFloat(roundtripDrivingData.cost_per_gallon) > 0;
        const hasMiles = roundtripDrivingData.one_way_miles && parseFloat(roundtripDrivingData.one_way_miles) > 0;
        
        if (hasMiles && !hasCostPerMile && !hasMpgAndGallon) {
          setError('For non-Anchorage locations, please provide either cost-per-mile or MPG + cost-per-gallon.');
          setLoading(false);
          return;
        }
      }
    }
    
    try {
      // Build staff array from valid rows
      const staffArray = validStaffRows.map(row => ({
        role: row.role,
        count: parseInt(row.count) || 0
      }));
      
      // Build roundtrip driving payload (only for driving mode)
      const roundtripDriving = siteAccessMode === 'driving' && roundtripDrivingData.project_location ? {
        project_location: roundtripDrivingData.project_location,
        num_vehicles: Number(roundtripDrivingData.num_vehicles) || 1,
        one_way_miles: parseFloat(roundtripDrivingData.one_way_miles) || 0.0, // Required float, not Optional
        drive_time_hours: roundtripDrivingData.drive_time_hours ? parseFloat(roundtripDrivingData.drive_time_hours) : null,
        project_duration_days: Number(roundtripDrivingData.project_duration_days) || 0,
        mpg: roundtripDrivingData.mpg ? parseFloat(roundtripDrivingData.mpg) : null,
        cost_per_gallon: roundtripDrivingData.cost_per_gallon ? parseFloat(roundtripDrivingData.cost_per_gallon) : null,
        cost_per_mile: roundtripDrivingData.cost_per_mile ? parseFloat(roundtripDrivingData.cost_per_mile) : null,
        anchorage_flat_fee: roundtripDrivingData.anchorage_flat_fee ? parseFloat(roundtripDrivingData.anchorage_flat_fee) : null,
      } : null;
      
      // Build daily driving payload (optional, can apply to both driving and flight modes)
      const dailyDriving = (dailyDrivingData.site_location || dailyDrivingData.lodging_location || dailyDrivingData.daily_miles) ? {
        site_location: dailyDrivingData.site_location || null,
        lodging_location: dailyDrivingData.lodging_location || null,
        daily_miles: parseFloat(dailyDrivingData.daily_miles) || 0.0, // Required float, not Optional
        daily_drive_time_hours: dailyDrivingData.daily_drive_time_hours ? parseFloat(dailyDrivingData.daily_drive_time_hours) : null,
        project_duration_days: Number(dailyDrivingData.project_duration_days) || 0,
        mpg: dailyDrivingData.mpg ? parseFloat(dailyDrivingData.mpg) : null,
        cost_per_gallon: dailyDrivingData.cost_per_gallon ? parseFloat(dailyDrivingData.cost_per_gallon) : null,
        cost_per_mile: dailyDrivingData.cost_per_mile ? parseFloat(dailyDrivingData.cost_per_mile) : null,
      } : null;
      
      const payload = {
        project_name: projectName || null,
        site_access_mode: siteAccessMode,
        is_local_project: isLocalProject,
        use_client_vehicle: useClientVehicle,
        professional_role: null, // legacy
        num_staff: totalStaff, // legacy
        per_diem_rate: parseFloat(perDiemRate) || 0.0,
        rate_multiplier: parseFloat(rateMultiplier) || 1.0,
        // Send staff array (new preferred format)
        staff: staffArray.length > 0 ? staffArray : undefined,
        roundtrip_driving: roundtripDriving,
        daily_driving: dailyDriving,
        flights: siteAccessMode === 'flight' && !isLocalProject ? {
          project_location: flightsData.project_location || null,
          num_tickets: Number(flightsData.num_tickets) || 0,
          roundtrip_cost_per_ticket: parseFloat(flightsData.roundtrip_cost_per_ticket) || 0.0,
          flight_time_hours_one_way: parseFloat(flightsData.flight_time_hours_one_way) || 0.0,
          layover_city: flightsData.layover_city || null,
          has_overnight: flightsData.has_overnight || false,
          layover_hotel_name: flightsData.layover_hotel_name || null,
          layover_cost_per_night: flightsData.layover_cost_per_night ? parseFloat(flightsData.layover_cost_per_night) : null,
          layover_rooms: flightsData.layover_rooms ? Number(flightsData.layover_rooms) : null,
        } : null,
        rental: siteAccessMode === 'flight' && !isLocalProject && !useClientVehicle ? {
          project_location: rentalData.project_location || null,
          num_vehicles: Number(rentalData.num_vehicles) || 0,
          vehicle_category: rentalData.vehicle_category || null,
          daily_rate: rentalData.daily_rate ? parseFloat(rentalData.daily_rate) : null,
          weekly_rate: rentalData.weekly_rate ? parseFloat(rentalData.weekly_rate) : null,
          monthly_rate: rentalData.monthly_rate ? parseFloat(rentalData.monthly_rate) : null,
          rental_period_type: rentalData.rental_period_type || null,
          rental_days: Number(rentalData.rental_days) || 0,
          fuel_cost_estimate: rentalData.fuel_cost_estimate ? parseFloat(rentalData.fuel_cost_estimate) : null,
        } : null,
        lodging: !isLocalProject ? {
          project_location: lodgingData.project_location || null,
          hotel_name: lodgingData.hotel_name || null,
          night_cost_with_taxes: parseFloat(lodgingData.night_cost_with_taxes) || 0.0,
          project_duration_days: Number(lodgingData.project_duration_days) || 0,
          num_staff: Number(lodgingData.num_staff) || totalStaff || 0,
        } : null,
      };
      
      console.log("Final Payload:", JSON.stringify(payload, null, 2));
      
      const result = await logisticsAPI.createEstimation(payload);
      setEstimationResult(result);
    } catch (err) {
      console.error('Error creating estimation:', err);
      setError(`Failed to generate estimation: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Determine which sections should be visible
  const showDriving = siteAccessMode === 'driving' || (siteAccessMode === 'flight' && !isLocalProject);
  const showFlights = siteAccessMode === 'flight' && !isLocalProject;
  const showRental = siteAccessMode === 'flight' && !isLocalProject && !useClientVehicle;
  const showLodging = !isLocalProject;
  
  return (
    <div className="logistics-container">
      <nav className="logistics-nav">
        <Link to="/" className="nav-link">
          Home
        </Link>
        <div className="nav-title">
          <h1>Logistics Estimator</h1>
        </div>
        <button 
          className="view-estimations-btn"
          onClick={() => navigate('/logistics/list')}
        >
          View Previous Estimates
        </button>
      </nav>

      <header className="logistics-header">
        <p>Calculate travel and accommodation costs for your project</p>
      </header>

      {/* Project Header with Navigation */}
      <ProjectHeader projectName={projectName} moduleName="logistics" />

      <div className="logistics-content">
        <form onSubmit={handleSubmit} className="logistics-form">
          {/* Project Name */}
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="project-name">Project Name</label>
              <input
                id="project-name"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name (e.g., 'One Sample')"
                className="form-input"
              />
              <small style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px', display: 'block' }}>
                This project name will be shared across all modules
              </small>
            </div>
          </div>

          {/* Site Access Mode - Radio Buttons */}
          <div className="form-section">
            <div className="form-group">
              <label>Site Access Mode</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="site-access-mode"
                    value="driving"
                    checked={siteAccessMode === 'driving'}
                    onChange={(e) => setSiteAccessMode(e.target.value)}
                  />
                  <span>Driving</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="site-access-mode"
                    value="flight"
                    checked={siteAccessMode === 'flight'}
                    onChange={(e) => setSiteAccessMode(e.target.value)}
                  />
                  <span>Flight</span>
                </label>
              </div>
            </div>
          </div>

          {/* Local Project Option */}
          <div className="form-section">
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '12px', color: '#2c3e50', fontWeight: 'bold', fontSize: '1rem' }}>
                Project Type
              </label>
              <div className="simple-option-row">
                <label htmlFor="local-project-toggle" className="simple-option-label">
                  <span className="simple-option-text">
                    <strong>Local Project</strong> - Satori-owned vehicle, no flights/rental/lodging
                  </span>
                </label>
                <input
                  id="local-project-toggle"
                  type="checkbox"
                  checked={isLocalProject}
                  onChange={(e) => setIsLocalProject(e.target.checked)}
                  className="simple-option-checkbox"
                />
              </div>
            </div>
          </div>

          {/* Use Client Vehicle Option */}
          {siteAccessMode === 'flight' && !isLocalProject && (
            <div className="form-section">
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '12px', color: '#2c3e50', fontWeight: 'bold', fontSize: '1rem' }}>
                  Vehicle Option
                </label>
                <div className="simple-option-row">
                  <label htmlFor="client-vehicle-toggle" className="simple-option-label">
                    <span className="simple-option-text">
                      <strong>Use Client Vehicle</strong> - No rental required
                    </span>
                  </label>
                  <input
                    id="client-vehicle-toggle"
                    type="checkbox"
                    checked={useClientVehicle}
                    onChange={(e) => setUseClientVehicle(e.target.checked)}
                    className="simple-option-checkbox"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Rate Multiplier */}
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="rate-multiplier">Rate Multiplier (%)</label>
              <select
                id="rate-multiplier"
                value={rateMultiplier}
                onChange={(e) => setRateMultiplier(parseFloat(e.target.value))}
                className="form-input"
              >
                <option value={1.0}>100%</option>
                <option value={0.75}>75%</option>
                <option value={0.5}>50%</option>
              </select>
              <small style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px', display: 'block' }}>
                Applied to all staff labor costs
              </small>
            </div>
          </div>

          {/* Staff Rows */}
          <div className="form-section">
            <StaffRows
              staffRows={staffRows}
              setStaffRows={setStaffRows}
              laborRates={laborRates}
              totalStaffCount={totalStaff}
            />
          </div>

          {/* Per Diem Rate */}
          {showLodging && (
            <div className="form-section">
              <div className="form-group">
                <label htmlFor="per-diem-rate">Per Diem Rate (per person per day)</label>
                <select
                  id="per-diem-rate"
                  value={perDiemRate}
                  onChange={(e) => setPerDiemRate(parseFloat(e.target.value))}
                  className="form-input"
                >
                  <option value={50}>$50 On-Road</option>
                  <option value={60}>$60 Off-Road</option>
                </select>
              </div>
            </div>
          )}

          {/* Driving Section */}
          {showDriving && (
            <DrivingSection
              roundtripData={roundtripDrivingData}
              setRoundtripData={setRoundtripDrivingData}
              dailyData={dailyDrivingData}
              setDailyData={setDailyDrivingData}
              siteAccessMode={siteAccessMode}
              isExpanded={expandedSections.driving}
              onToggle={() => toggleSection('driving')}
            />
          )}
          

          {/* Flights Section */}
          {showFlights && (
            <FlightsSection
              data={flightsData}
              setData={setFlightsData}
              isExpanded={expandedSections.flights}
              onToggle={() => toggleSection('flights')}
            />
          )}

          {/* Rental Section */}
          {showRental && (
            <RentalSection
              data={rentalData}
              setData={setRentalData}
              isExpanded={expandedSections.rental}
              onToggle={() => toggleSection('rental')}
            />
          )}

          {/* Lodging Section */}
          {showLodging && (
            <LodgingSection
              data={lodgingData}
              setData={setLodgingData}
              numStaff={totalStaff}
              isExpanded={expandedSections.lodging}
              onToggle={() => toggleSection('lodging')}
            />
          )}

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
          <LogisticsResultsCard result={estimationResult} />
        )}
      </div>
    </div>
  );
};

export default Logistics;

