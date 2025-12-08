import React, { useState } from 'react';
import { logisticsAPI } from '../services/api';

const LogisticsBreakdownDetails = ({ details }) => {
  const [laborRates, setLaborRates] = useState([]);
  const [expandedSections, setExpandedSections] = useState({});

  React.useEffect(() => {
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

  const formatNumber = (value, decimals = 2) => {
    if (value === null || value === undefined) return 'N/A';
    return Number(value).toFixed(decimals);
  };

  const getRoleRate = (role) => {
    const rateEntry = laborRates.find(r => r.labor_role === role);
    return rateEntry ? rateEntry.hourly_rate : null;
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderFormula = (formula, values, result, unit = '') => {
    return (
      <div className="formula-breakdown">
        <div className="formula-text">{formula}</div>
        <div className="formula-calculation">
          <span className="formula-values">{values}</span> = <strong className="formula-result">{formatNumber(result)}{unit}</strong>
        </div>
      </div>
    );
  };

  // Get staff breakdown
  const getStaffBreakdown = () => {
    if (details.staff_breakdown && Array.isArray(details.staff_breakdown) && details.staff_breakdown.length > 0) {
      return details.staff_breakdown;
    } else if (details.professional_role && details.num_staff) {
      return [{ role: details.professional_role, count: details.num_staff }];
    }
    return [];
  };

  const staffBreakdown = getStaffBreakdown();
  const roundtripInput = details.driving_input?.roundtrip;
  const dailyInput = details.driving_input?.daily;
  const flightsInput = details.flights_input;
  const rentalInput = details.rental_input;
  const lodgingInput = details.lodging_input;

  return (
    <div className="breakdown-details-container">
      <h3 style={{ marginBottom: '20px', color: '#333' }}>Detailed Calculation Breakdown</h3>

      {/* Staff Labor Breakdown */}
      {staffBreakdown.length > 0 && details.staff_labor_costs && (
        <div className="breakdown-section">
          <div className="breakdown-section-header" onClick={() => toggleSection('staff')}>
            <h4>👥 Staff Labor Costs</h4>
            <span className="toggle-icon">{expandedSections.staff ? '▼' : '▶'}</span>
          </div>
          {expandedSections.staff && (
            <div className="breakdown-section-content">
              {staffBreakdown.map((staff, index) => {
                const role = staff.role;
                const count = staff.count || 0;
                const totalCost = details.staff_labor_costs[role] || 0;
                const rate = getRoleRate(role);
                // Calculate total hours for this role: cost / (rate * multiplier)
                const roleTotalHours = rate && rate > 0 && details.rate_multiplier > 0 
                  ? (totalCost / (rate * details.rate_multiplier)) 
                  : 0;
                
                // Calculate hours per person (approximate by dividing total role hours by count)
                const hoursPerPerson = count > 0 ? roleTotalHours / count : 0;

                return (
                  <div key={index} className="staff-role-breakdown">
                    <h5>{role} (Count: {count})</h5>
                    <div className="formula-group">
                      {roleTotalHours > 0 && rate && (
                        <>
                          {renderFormula(
                            `Total Hours for ${role} = Labor Cost ÷ (Hourly Rate × Rate Multiplier)`,
                            `${formatCurrency(totalCost)} ÷ (${formatNumber(rate)} × ${formatNumber(details.rate_multiplier)})`,
                            roleTotalHours,
                            ' hours'
                          )}
                          {count > 1 && (
                            renderFormula(
                              `Hours per Person = Total Hours ÷ Count`,
                              `${formatNumber(roleTotalHours)} ÷ ${count}`,
                              hoursPerPerson,
                              ' hours'
                            )
                          )}
                          {renderFormula(
                            `Labor Cost = Total Hours × Hourly Rate × Rate Multiplier`,
                            `${formatNumber(roleTotalHours)} × ${formatNumber(rate)} × ${formatNumber(details.rate_multiplier)}`,
                            totalCost,
                            ''
                          )}
                        </>
                      )}
                    </div>
                    <div className="final-cost">
                      <strong>Total Cost for {role}: {formatCurrency(totalCost)}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Roundtrip Driving Breakdown */}
      {roundtripInput && details.roundtrip_driving_miles > 0 && (
        <div className="breakdown-section">
          <div className="breakdown-section-header" onClick={() => toggleSection('roundtrip')}>
            <h4>🚗 Roundtrip Driving</h4>
            <span className="toggle-icon">{expandedSections.roundtrip ? '▼' : '▶'}</span>
          </div>
          {expandedSections.roundtrip && (
            <div className="breakdown-section-content">
              {renderFormula(
                `Roundtrip Miles = One-Way Miles × 2 × Project Duration Days`,
                `${formatNumber(roundtripInput.one_way_miles)} × 2 × ${roundtripInput.project_duration_days || 1}`,
                details.roundtrip_driving_miles,
                ' miles'
              )}

              {roundtripInput.project_location?.toLowerCase() === 'anchorage' ? (
                renderFormula(
                  `Vehicle Cost (Anchorage) = Flat Fee per Day × Project Duration Days`,
                  `${formatNumber(roundtripInput.anchorage_flat_fee || 45)} × ${roundtripInput.project_duration_days || 1}`,
                  details.total_driving_fuel_cost,
                  ''
                )
              ) : (
                <>
                  {roundtripInput.cost_per_mile ? (
                    renderFormula(
                      `Vehicle Cost = Total Miles × Cost per Mile`,
                      `${formatNumber(details.roundtrip_driving_miles)} × ${formatNumber(roundtripInput.cost_per_mile)}`,
                      details.roundtrip_driving_miles * (roundtripInput.cost_per_mile || 0),
                      ''
                    )
                  ) : roundtripInput.mpg && roundtripInput.cost_per_gallon ? (
                    <>
                      {renderFormula(
                        `Gallons = Total Miles ÷ MPG`,
                        `${formatNumber(details.roundtrip_driving_miles)} ÷ ${formatNumber(roundtripInput.mpg)}`,
                        details.roundtrip_driving_miles / (roundtripInput.mpg || 1),
                        ' gallons'
                      )}
                      {renderFormula(
                        `Vehicle Cost = Gallons × Cost per Gallon`,
                        `${formatNumber(details.roundtrip_driving_miles / (roundtripInput.mpg || 1))} × ${formatNumber(roundtripInput.cost_per_gallon)}`,
                        (details.roundtrip_driving_miles / (roundtripInput.mpg || 1)) * (roundtripInput.cost_per_gallon || 0),
                        ''
                      )}
                    </>
                  ) : null}
                </>
              )}

              {renderFormula(
                `Drive Hours = Roundtrip Miles ÷ 55 MPH`,
                `${formatNumber(details.roundtrip_driving_miles)} ÷ 55`,
                details.roundtrip_driving_miles / 55,
                ' hours'
              )}

              <div className="final-cost">
                <strong>Roundtrip Fuel/Mileage Cost: {formatCurrency(details.total_driving_fuel_cost)}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Daily Driving Breakdown */}
      {dailyInput && details.daily_driving_miles > 0 && (
        <div className="breakdown-section">
          <div className="breakdown-section-header" onClick={() => toggleSection('daily')}>
            <h4>🚗 Daily Driving</h4>
            <span className="toggle-icon">{expandedSections.daily ? '▼' : '▶'}</span>
          </div>
          {expandedSections.daily && (
            <div className="breakdown-section-content">
              {renderFormula(
                `Daily Miles Total = Daily Miles (roundtrip) × Project Duration Days`,
                `${formatNumber(dailyInput.daily_miles)} × ${dailyInput.project_duration_days || 1}`,
                details.daily_driving_miles,
                ' miles'
              )}

              {(dailyInput.site_location?.toLowerCase() === 'anchorage' || 
                dailyInput.lodging_location?.toLowerCase() === 'anchorage') ? (
                <div className="formula-breakdown">
                  <div className="formula-text">Vehicle Cost (Anchorage) = $0 (covered by flat fee)</div>
                </div>
              ) : (
                <>
                  {dailyInput.cost_per_mile ? (
                    renderFormula(
                      `Vehicle Cost = Daily Miles Total × Cost per Mile`,
                      `${formatNumber(details.daily_driving_miles)} × ${formatNumber(dailyInput.cost_per_mile)}`,
                      details.daily_driving_miles * (dailyInput.cost_per_mile || 0),
                      ''
                    )
                  ) : dailyInput.mpg && dailyInput.cost_per_gallon ? (
                    <>
                      {renderFormula(
                        `Gallons = Daily Miles Total ÷ MPG`,
                        `${formatNumber(details.daily_driving_miles)} ÷ ${formatNumber(dailyInput.mpg)}`,
                        details.daily_driving_miles / (dailyInput.mpg || 1),
                        ' gallons'
                      )}
                      {renderFormula(
                        `Vehicle Cost = Gallons × Cost per Gallon`,
                        `${formatNumber(details.daily_driving_miles / (dailyInput.mpg || 1))} × ${formatNumber(dailyInput.cost_per_gallon)}`,
                        (details.daily_driving_miles / (dailyInput.mpg || 1)) * (dailyInput.cost_per_gallon || 0),
                        ''
                      )}
                    </>
                  ) : null}
                </>
              )}

              {renderFormula(
                `Drive Hours = Daily Miles (roundtrip) ÷ 55 MPH`,
                `${formatNumber(dailyInput.daily_miles)} ÷ 55`,
                dailyInput.daily_miles / 55,
                ' hours per day'
              )}

              {(() => {
                // Calculate daily fuel cost separately
                let dailyFuelCost = 0;
                if (dailyInput.cost_per_mile) {
                  dailyFuelCost = details.daily_driving_miles * (dailyInput.cost_per_mile || 0);
                } else if (dailyInput.mpg && dailyInput.cost_per_gallon) {
                  const gallons = details.daily_driving_miles / (dailyInput.mpg || 1);
                  dailyFuelCost = gallons * (dailyInput.cost_per_gallon || 0);
                }
                return (
                  <div className="final-cost">
                    <strong>Daily Fuel/Mileage Cost: {formatCurrency(dailyFuelCost)}</strong>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Combined Driving Cost */}
      {(details.total_driving_cost > 0) && (
        <div className="breakdown-section">
          <div className="breakdown-section-header" onClick={() => toggleSection('combined')}>
            <h4>🚗 Combined Driving Cost</h4>
            <span className="toggle-icon">{expandedSections.combined ? '▼' : '▶'}</span>
          </div>
          {expandedSections.combined && (
            <div className="breakdown-section-content">
              {renderFormula(
                `Total Driving Miles = Roundtrip Miles + Daily Miles`,
                `${formatNumber(details.roundtrip_driving_miles || 0)} + ${formatNumber(details.daily_driving_miles || 0)}`,
                details.total_driving_miles,
                ' miles'
              )}
              {renderFormula(
                `Total Driving Labor Hours = Roundtrip Hours + Daily Hours`,
                `${formatNumber(details.roundtrip_driving_labor_hours || 0)} + ${formatNumber(details.daily_driving_labor_hours || 0)}`,
                details.total_driving_labor_hours,
                ' hours'
              )}
              {renderFormula(
                `Total Driving Cost = Fuel/Mileage Cost + Labor Cost`,
                `${formatCurrency(details.total_driving_fuel_cost)} + ${formatCurrency(details.total_driving_labor_cost)}`,
                details.total_driving_cost,
                ''
              )}
              <div className="final-cost">
                <strong>Total Driving Cost: {formatCurrency(details.total_driving_cost)}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Flights Breakdown */}
      {flightsInput && details.total_flight_cost > 0 && (
        <div className="breakdown-section">
          <div className="breakdown-section-header" onClick={() => toggleSection('flights')}>
            <h4>✈️ Flight Costs</h4>
            <span className="toggle-icon">{expandedSections.flights ? '▼' : '▶'}</span>
          </div>
          {expandedSections.flights && (
            <div className="breakdown-section-content">
              {renderFormula(
                `Flight Ticket Cost = Number of Tickets × Cost per Ticket`,
                `${flightsInput.num_tickets || 0} × ${formatCurrency(flightsInput.roundtrip_cost_per_ticket || 0)}`,
                details.total_flight_ticket_cost,
                ''
              )}
              {renderFormula(
                `Travel Time per Person = (One-Way Hours × 2) + 1.5 hours`,
                `(${formatNumber(flightsInput.flight_time_hours_one_way || 0)} × 2) + 1.5`,
                (flightsInput.flight_time_hours_one_way || 0) * 2 + 1.5,
                ' hours'
              )}
              {flightsInput.has_overnight && flightsInput.layover_cost_per_night && flightsInput.layover_rooms && (
                renderFormula(
                  `Layover Room Cost = Cost per Night × Number of Rooms`,
                  `${formatCurrency(flightsInput.layover_cost_per_night)} × ${flightsInput.layover_rooms}`,
                  details.total_layover_room_cost,
                  ''
                )
              )}
              {renderFormula(
                `Total Flight Cost = Ticket Cost + Labor Cost + Layover Cost`,
                `${formatCurrency(details.total_flight_ticket_cost)} + ${formatCurrency(details.total_flight_labor_cost)} + ${formatCurrency(details.total_layover_room_cost || 0)}`,
                details.total_flight_cost,
                ''
              )}
              <div className="final-cost">
                <strong>Total Flight Cost: {formatCurrency(details.total_flight_cost)}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rental Breakdown */}
      {rentalInput && details.total_rental_cost > 0 && (
        <div className="breakdown-section">
          <div className="breakdown-section-header" onClick={() => toggleSection('rental')}>
            <h4>🚙 Rental Vehicle Costs</h4>
            <span className="toggle-icon">{expandedSections.rental ? '▼' : '▶'}</span>
          </div>
          {expandedSections.rental && (
            <div className="breakdown-section-content">
              {rentalInput.rental_period_type === 'daily' && rentalInput.daily_rate && (
                renderFormula(
                  `Rental Base Cost = Daily Rate × Rental Days`,
                  `${formatCurrency(rentalInput.daily_rate)} × ${rentalInput.rental_days || 0}`,
                  details.total_rental_base_cost,
                  ''
                )
              )}
              {rentalInput.rental_period_type === 'weekly' && rentalInput.weekly_rate && (
                renderFormula(
                  `Rental Base Cost = Weekly Rate × Number of Weeks`,
                  `${formatCurrency(rentalInput.weekly_rate)} × ${Math.ceil((rentalInput.rental_days || 0) / 7)}`,
                  details.total_rental_base_cost,
                  ''
                )
              )}
              {rentalInput.rental_period_type === 'monthly' && rentalInput.monthly_rate && (
                renderFormula(
                  `Rental Base Cost = Monthly Rate × Number of Months`,
                  `${formatCurrency(rentalInput.monthly_rate)} × ${Math.ceil((rentalInput.rental_days || 0) / 30)}`,
                  details.total_rental_base_cost,
                  ''
                )
              )}
              {rentalInput.fuel_cost_estimate && (
                <div className="formula-breakdown">
                  <div className="formula-text">Fuel Cost Estimate</div>
                  <div className="formula-calculation">
                    = <strong className="formula-result">{formatCurrency(rentalInput.fuel_cost_estimate)}</strong>
                  </div>
                </div>
              )}
              {renderFormula(
                `Total Rental Cost = Base Cost + Fuel Cost`,
                `${formatCurrency(details.total_rental_base_cost)} + ${formatCurrency(details.total_rental_fuel_cost)}`,
                details.total_rental_cost,
                ''
              )}
              <div className="final-cost">
                <strong>Total Rental Cost: {formatCurrency(details.total_rental_cost)}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lodging & Per Diem Breakdown */}
      {lodgingInput && (details.total_lodging_room_cost > 0 || details.total_per_diem_cost > 0) && (
        <div className="breakdown-section">
          <div className="breakdown-section-header" onClick={() => toggleSection('lodging')}>
            <h4>🏨 Lodging & Per Diem Costs</h4>
            <span className="toggle-icon">{expandedSections.lodging ? '▼' : '▶'}</span>
          </div>
          {expandedSections.lodging && (
            <div className="breakdown-section-content">
              {renderFormula(
                `Lodging Room Cost = Night Cost × Number of Staff × Project Duration Days`,
                `${formatCurrency(lodgingInput.night_cost_with_taxes || 0)} × ${lodgingInput.num_staff || details.total_staff_count || 0} × ${lodgingInput.project_duration_days || 0}`,
                details.total_lodging_room_cost,
                ''
              )}
              {details.total_per_diem_cost > 0 && (
                renderFormula(
                  `Per Diem Cost = Per Diem Rate × Number of Staff × Project Duration Days`,
                  `${formatCurrency(details.per_diem_rate || 0)} × ${lodgingInput.num_staff || details.total_staff_count || 0} × ${lodgingInput.project_duration_days || 0}`,
                  details.total_per_diem_cost,
                  ''
                )
              )}
              {renderFormula(
                `Total Lodging & Per Diem = Room Cost + Per Diem Cost`,
                `${formatCurrency(details.total_lodging_room_cost)} + ${formatCurrency(details.total_per_diem_cost)}`,
                details.total_lodging_room_cost + details.total_per_diem_cost,
                ''
              )}
              <div className="final-cost">
                <strong>Total Lodging & Per Diem: {formatCurrency(details.total_lodging_room_cost + details.total_per_diem_cost)}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grand Total */}
      <div className="breakdown-section highlight">
        <div className="breakdown-section-header" onClick={() => toggleSection('total')}>
          <h4>💰 Grand Total</h4>
          <span className="toggle-icon">{expandedSections.total ? '▼' : '▶'}</span>
        </div>
        {expandedSections.total && (
          <div className="breakdown-section-content">
            {renderFormula(
              `Total Logistics Cost = Driving Cost + Flight Cost + Rental Cost + Lodging & Per Diem`,
              `${formatCurrency(details.total_driving_cost || 0)} + ${formatCurrency(details.total_flight_cost || 0)} + ${formatCurrency(details.total_rental_cost || 0)} + ${formatCurrency((details.total_lodging_room_cost || 0) + (details.total_per_diem_cost || 0))}`,
              details.total_logistics_cost,
              ''
            )}
            <div className="final-cost grand-total">
              <strong>Total Logistics Cost: {formatCurrency(details.total_logistics_cost)}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogisticsBreakdownDetails;

