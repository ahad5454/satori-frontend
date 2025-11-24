import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { logisticsAPI } from '../services/api';
import DrivingSection from './DrivingSection';
import FlightsSection from './FlightsSection';
import RentalSection from './RentalSection';
import LodgingSection from './LodgingSection';
import LogisticsResultsCard from './LogisticsResultsCard';
import './Logistics.css';

const Logistics = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Form state
  const [projectName, setProjectName] = useState('');
  const [siteAccessMode, setSiteAccessMode] = useState('driving');
  const [isLocalProject, setIsLocalProject] = useState(false);
  const [useClientVehicle, setUseClientVehicle] = useState(false);
  const [professionalRole, setProfessionalRole] = useState('');
  const [numStaff, setNumStaff] = useState(1);
  const [perDiemRate, setPerDiemRate] = useState(0.0);
  
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
  
  // Driving state
  const [drivingData, setDrivingData] = useState({
    project_location: '',
    num_vehicles: 1,
    one_way_miles: 0.0,
    drive_time_hours: 0.0,
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
      if (estimation.professional_role) {
        setProfessionalRole(estimation.professional_role);
      }
      if (estimation.num_staff) {
        setNumStaff(estimation.num_staff);
      }
      if (estimation.per_diem_rate) {
        setPerDiemRate(estimation.per_diem_rate);
      }
      
      // Load input snapshots
      if (estimation.driving_input) {
        setDrivingData(estimation.driving_input);
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
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setEstimationResult(null);
    
    try {
      const payload = {
        project_name: projectName || null,
        site_access_mode: siteAccessMode,
        is_local_project: isLocalProject,
        use_client_vehicle: useClientVehicle,
        professional_role: professionalRole || null,
        num_staff: Number(numStaff) || 0,
        per_diem_rate: parseFloat(perDiemRate) || 0.0,
        driving: siteAccessMode === 'driving' ? {
          project_location: drivingData.project_location || null,
          num_vehicles: Number(drivingData.num_vehicles) || 0,
          one_way_miles: parseFloat(drivingData.one_way_miles) || 0.0,
          drive_time_hours: parseFloat(drivingData.drive_time_hours) || 0.0,
          project_duration_days: Number(drivingData.project_duration_days) || 0,
          mpg: drivingData.mpg ? parseFloat(drivingData.mpg) : null,
          cost_per_gallon: drivingData.cost_per_gallon ? parseFloat(drivingData.cost_per_gallon) : null,
          cost_per_mile: drivingData.cost_per_mile ? parseFloat(drivingData.cost_per_mile) : null,
        } : null,
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
          num_staff: Number(lodgingData.num_staff) || Number(numStaff) || 0,
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
  const showDriving = siteAccessMode === 'driving' || isLocalProject;
  const showFlights = siteAccessMode === 'flight' && !isLocalProject;
  const showRental = siteAccessMode === 'flight' && !isLocalProject && !useClientVehicle;
  const showLodging = !isLocalProject;
  
  return (
    <div className="logistics-container">
      <nav className="logistics-nav">
        <Link to="/" className="nav-link">
          🏠 Home
        </Link>
        <div className="nav-title">
          <h1>🚚 Logistics Estimator</h1>
        </div>
        <button 
          className="view-estimations-btn"
          onClick={() => navigate('/logistics/list')}
        >
          📋 View Previous Estimates
        </button>
      </nav>

      <header className="logistics-header">
        <p>Estimate travel, transportation, and accommodation costs for field projects</p>
      </header>

      <div className="logistics-content">
        <form onSubmit={handleSubmit} className="logistics-form">
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
                  <span>🚗 Driving</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="site-access-mode"
                    value="flight"
                    checked={siteAccessMode === 'flight'}
                    onChange={(e) => setSiteAccessMode(e.target.value)}
                  />
                  <span>✈️ Flight</span>
                </label>
              </div>
            </div>
          </div>

          {/* Local Project Toggle */}
          <div className="form-section">
            <div className="form-group">
              <div className="toggle-row">
                <label htmlFor="local-project-toggle" className="toggle-text-label">
                  Local Project (Satori-owned vehicle, no flights/rental/lodging)
                </label>
                <label className="toggle-switch-label">
                  <input
                    id="local-project-toggle"
                    type="checkbox"
                    checked={isLocalProject}
                    onChange={(e) => setIsLocalProject(e.target.checked)}
                    className="toggle-checkbox"
                  />
                  <span className="toggle-switch"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Use Client Vehicle Toggle */}
          {siteAccessMode === 'flight' && !isLocalProject && (
            <div className="form-section">
              <div className="form-group">
                <div className="toggle-row">
                  <label htmlFor="client-vehicle-toggle" className="toggle-text-label">
                    Use Client Vehicle (no rental required)
                  </label>
                  <label className="toggle-switch-label">
                    <input
                      id="client-vehicle-toggle"
                      type="checkbox"
                      checked={useClientVehicle}
                      onChange={(e) => setUseClientVehicle(e.target.checked)}
                      className="toggle-checkbox"
                    />
                    <span className="toggle-switch"></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Professional Role Selection */}
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="professional-role">Professional Role (for travel labor costs)</label>
              <select
                id="professional-role"
                value={professionalRole}
                onChange={(e) => setProfessionalRole(e.target.value)}
                className="form-input"
              >
                <option value="">-- Select Role --</option>
                {laborRates.map((rate) => (
                  <option key={rate.labor_role} value={rate.labor_role}>
                    {rate.labor_role} (${rate.hourly_rate.toFixed(2)}/hr)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Number of Staff */}
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="num-staff">Number of Staff</label>
              <input
                id="num-staff"
                type="number"
                min="1"
                step="1"
                value={numStaff}
                onChange={(e) => setNumStaff(e.target.value)}
                className="form-input"
                placeholder="1"
              />
            </div>
          </div>

          {/* Per Diem Rate */}
          {showLodging && (
            <div className="form-section">
              <div className="form-group">
                <label htmlFor="per-diem-rate">Per Diem Rate (per person per day)</label>
                <input
                  id="per-diem-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={perDiemRate}
                  onChange={(e) => setPerDiemRate(e.target.value)}
                  className="form-input"
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

          {/* Driving Section */}
          {showDriving && (
            <DrivingSection
              data={drivingData}
              setData={setDrivingData}
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
              numStaff={numStaff}
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
              <p>⚠️ {error}</p>
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

