import React, { useState, useEffect } from 'react';
import { logisticsAPI } from '../services/api';
import LogisticsBreakdownDetails from './LogisticsBreakdownDetails';

const LogisticsResultsCard = ({ result }) => {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [laborRates, setLaborRates] = useState([]);

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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);
  };

  const getRoleRate = (role) => {
    const rateEntry = laborRates.find(r => r.labor_role === role);
    return rateEntry ? rateEntry.hourly_rate : null;
  };

  // Get staff breakdown data
  const getStaffBreakdown = () => {
    if (result.staff_breakdown && Array.isArray(result.staff_breakdown) && result.staff_breakdown.length > 0) {
      // New format: staff_breakdown is a list
      return result.staff_breakdown;
    } else if (result.professional_role && result.num_staff) {
      // Legacy format: convert to single staff row
      return [{ role: result.professional_role, count: result.num_staff }];
    }
    return [];
  };

  const staffBreakdown = getStaffBreakdown();
  const hasStaffBreakdown = staffBreakdown.length > 0 && result.staff_labor_costs;

  return (
    <div className="estimation-results">
      <h2>Estimation Results</h2>

      {/* Staff Labor Cost Breakdown */}
      {hasStaffBreakdown && (
        <div className="category-breakdown">
          <h3>Staff Labor Cost Breakdown</h3>
          <table className="staff-breakdown-table">
            <thead>
              <tr>
                <th>Role</th>
                <th className="text-center">Count</th>
                <th className="text-right">Hours</th>
                <th className="text-right">Rate</th>
                <th className="text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {staffBreakdown.map((staff, index) => {
                const role = staff.role;
                const count = staff.count || 0;
                const cost = result.staff_labor_costs[role] || 0;
                const rate = getRoleRate(role);
                const hours = rate && rate > 0 ? (cost / rate) : 0;

                return (
                  <tr key={index}>
                    <td>{role}</td>
                    <td className="text-center">{count}</td>
                    <td className="text-right">{hours > 0 ? hours.toFixed(2) : 'N/A'}</td>
                    <td className="text-right">
                      {rate ? `$${rate.toFixed(2)}/hr` : 'N/A'}
                    </td>
                    <td className="text-right">{formatCurrency(cost)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Driving Totals */}
      {(result.total_driving_cost > 0 || result.total_driving_miles > 0) && (
        <div className="category-breakdown">
          <h3>Driving Costs</h3>
          <div className="breakdown-list">
            {(result.roundtrip_driving_miles !== undefined && result.roundtrip_driving_miles !== null) && (
              <div className="breakdown-item">
                <span className="category-name">Roundtrip Driving Miles</span>
                <span className="category-hours">
                  {result.roundtrip_driving_miles.toFixed(2)} miles
                </span>
              </div>
            )}
            {(result.daily_driving_miles !== undefined && result.daily_driving_miles !== null) && (
              <div className="breakdown-item">
                <span className="category-name">Daily Driving Miles</span>
                <span className="category-hours">
                  {result.daily_driving_miles.toFixed(2)} miles
                </span>
              </div>
            )}
            <div className="breakdown-item">
              <span className="category-name">Total Driving Miles</span>
              <span className="category-hours">
                {result.total_driving_miles?.toFixed(2) || '0.00'} miles
              </span>
            </div>
            {(result.roundtrip_driving_labor_hours !== undefined && result.roundtrip_driving_labor_hours !== null) && (
              <div className="breakdown-item">
                <span className="category-name">Roundtrip Driving Labor Hours</span>
                <span className="category-hours">
                  {result.roundtrip_driving_labor_hours.toFixed(2)} hours
                </span>
              </div>
            )}
            {(result.daily_driving_labor_hours !== undefined && result.daily_driving_labor_hours !== null) && (
              <div className="breakdown-item">
                <span className="category-name">Daily Driving Labor Hours</span>
                <span className="category-hours">
                  {result.daily_driving_labor_hours.toFixed(2)} hours
                </span>
              </div>
            )}
            <div className="breakdown-item">
              <span className="category-name">Total Driving Labor Hours</span>
              <span className="category-hours">
                {result.total_driving_labor_hours?.toFixed(2) || '0.00'} hours
              </span>
            </div>
            <div className="breakdown-item">
              <span className="category-name">Total Driving Fuel/Mileage Cost</span>
              <span className="category-hours">
                {formatCurrency(result.total_driving_fuel_cost)}
              </span>
            </div>
            <div className="breakdown-item">
              <span className="category-name">Total Driving Labor Cost</span>
              <span className="category-hours">
                {formatCurrency(result.total_driving_labor_cost)}
              </span>
            </div>
            <div className="breakdown-item highlight">
              <span className="category-name">Total Driving Cost</span>
              <span className="category-hours">
                {formatCurrency(result.total_driving_cost)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Flight Totals */}
      {(result.total_flight_cost > 0 || result.total_flight_ticket_cost > 0) && (
        <div className="category-breakdown">
          <h3>Flight Costs</h3>
          <div className="breakdown-list">
            <div className="breakdown-item">
              <span className="category-name">Flight Ticket Cost</span>
              <span className="category-hours">
                {formatCurrency(result.total_flight_ticket_cost)}
              </span>
            </div>
            <div className="breakdown-item">
              <span className="category-name">Travel Labor Hours</span>
              <span className="category-hours">
                {result.total_flight_labor_hours?.toFixed(2) || '0.00'} hours
              </span>
            </div>
            <div className="breakdown-item">
              <span className="category-name">Travel Labor Cost</span>
              <span className="category-hours">
                {formatCurrency(result.total_flight_labor_cost)}
              </span>
            </div>
            <div className="breakdown-item">
              <span className="category-name">Layover Room Cost</span>
              <span className="category-hours">
                {formatCurrency(result.total_layover_room_cost)}
              </span>
            </div>
            <div className="breakdown-item highlight">
              <span className="category-name">Total Flight Cost</span>
              <span className="category-hours">
                {formatCurrency(result.total_flight_cost)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Rental Totals */}
      {(result.total_rental_cost > 0 || result.total_rental_base_cost > 0) && (
        <div className="category-breakdown">
          <h3>🚙 Rental Vehicle Costs</h3>
          <div className="breakdown-list">
            <div className="breakdown-item">
              <span className="category-name">Rental Base Cost</span>
              <span className="category-hours">
                {formatCurrency(result.total_rental_base_cost)}
              </span>
            </div>
            <div className="breakdown-item">
              <span className="category-name">Rental Fuel Cost</span>
              <span className="category-hours">
                {formatCurrency(result.total_rental_fuel_cost)}
              </span>
            </div>
            <div className="breakdown-item highlight">
              <span className="category-name">Total Rental Cost</span>
              <span className="category-hours">
                {formatCurrency(result.total_rental_cost)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Lodging & Per Diem Totals */}
      {(result.total_lodging_room_cost > 0 || result.total_per_diem_cost > 0) && (
        <div className="category-breakdown">
          <h3>🏨 Lodging & Per Diem Costs</h3>
          <div className="breakdown-list">
            <div className="breakdown-item">
              <span className="category-name">Lodging Room Cost</span>
              <span className="category-hours">
                {formatCurrency(result.total_lodging_room_cost)}
              </span>
            </div>
            <div className="breakdown-item">
              <span className="category-name">Per Diem Cost</span>
              <span className="category-hours">
                {formatCurrency(result.total_per_diem_cost)}
              </span>
            </div>
            <div className="breakdown-item highlight">
              <span className="category-name">Total Lodging & Per Diem</span>
              <span className="category-hours">
                {formatCurrency(result.total_lodging_room_cost + result.total_per_diem_cost)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Grand Total */}
      <div className="results-grid" style={{ marginTop: '30px' }}>
        <div className="result-card highlight">
          <h3>Total Logistics Cost</h3>
          <div className="result-value large">
            {formatCurrency(result.total_logistics_cost)}
          </div>
        </div>
      </div>

      {result.id && (
        <div className="estimation-id">
          <p>Estimation ID: <strong>{result.id}</strong></p>
        </div>
      )}

      {/* Calculation Breakdown Toggle - Only for Admin/Manager */}
      {(localStorage.getItem('user_role') === 'admin' || localStorage.getItem('user_role') === 'manager') && (
        <div style={{ marginTop: '30px', textAlign: 'center' }}>
          <button
            className={`show-breakdown-btn ${showBreakdown ? 'active' : ''}`}
            onClick={() => setShowBreakdown(!showBreakdown)}
          >
            {showBreakdown ? '▼ Hide Calculation Breakdown' : '▶ Show Calculation Breakdown'}
          </button>
        </div>
      )}

      {/* Detailed Calculation Breakdown */}
      {showBreakdown && (
        <LogisticsBreakdownDetails details={result} />
      )}
    </div>
  );
};

export default LogisticsResultsCard;

