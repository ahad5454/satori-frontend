import React from 'react';

const LogisticsResultsCard = ({ result }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);
  };

  return (
    <div className="estimation-results">
      <h2>Estimation Results</h2>
      
      {/* Driving Totals */}
      {(result.total_driving_cost > 0 || result.total_driving_miles > 0) && (
        <div className="category-breakdown">
          <h3>🚗 Driving Costs</h3>
          <div className="breakdown-list">
            <div className="breakdown-item">
              <span className="category-name">Total Driving Miles</span>
              <span className="category-hours">
                {result.total_driving_miles?.toFixed(2) || '0.00'} miles
              </span>
            </div>
            <div className="breakdown-item">
              <span className="category-name">Fuel/Mileage Cost</span>
              <span className="category-hours">
                {formatCurrency(result.total_driving_fuel_cost)}
              </span>
            </div>
            <div className="breakdown-item">
              <span className="category-name">Driving Labor Hours</span>
              <span className="category-hours">
                {result.total_driving_labor_hours?.toFixed(2) || '0.00'} hours
              </span>
            </div>
            <div className="breakdown-item">
              <span className="category-name">Driving Labor Cost</span>
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
          <h3>✈️ Flight Costs</h3>
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
    </div>
  );
};

export default LogisticsResultsCard;

