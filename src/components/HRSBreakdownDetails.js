import React, { useState, useEffect } from 'react';
import { logisticsAPI } from '../services/api';
import './Logistics.css'; // Import shared breakdown styles

const HRSBreakdownDetails = ({ details, inputs }) => {
  const [laborRates, setLaborRates] = useState([]);
  const [expandedSections, setExpandedSections] = useState({});

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

  // Get minutes used (override or default)
  const getMinutesUsed = (type) => {
    if (inputs?.override_minutes_asbestos && type === 'asbestos') return inputs.override_minutes_asbestos;
    if (inputs?.override_minutes_xrf && type === 'xrf') return inputs.override_minutes_xrf;
    if (inputs?.override_minutes_lead && type === 'lead') return inputs.override_minutes_lead;
    if (inputs?.override_minutes_mold && type === 'mold') return inputs.override_minutes_mold;
    
    // Use defaults
    const defaults = { asbestos: 15.0, xrf: 3.0, lead: 10.0, mold: 20.0 };
    return defaults[type] || 0;
  };

  // Calculate hours for each category
  const calculateCategoryHours = (type, sampleCount) => {
    const minutes = getMinutesUsed(type);
    return (minutes * sampleCount) / 60;
  };

  const efficiencyFactor = inputs?.efficiency_factor || 1.0;
  const fieldStaffCount = inputs?.field_staff_count || 1;

  // Sample totals
  const totalPLM = details.total_plm || 0;
  const totalXRF = details.total_xrf_shots || 0;
  const totalChipsWipes = details.total_chips_wipes || 0;
  const totalTapeLift = details.total_tape_lift || 0;
  const totalSporeTrap = details.total_spore_trap || 0;
  const totalCulturable = details.total_culturable || 0;
  const ormHours = details.orm_hours || 0;

  // Calculate category hours
  const h_asb = calculateCategoryHours('asbestos', totalPLM);
  const h_xrf = calculateCategoryHours('xrf', totalXRF);
  const h_lead = calculateCategoryHours('lead', totalChipsWipes);
  const h_mold = calculateCategoryHours('mold', totalTapeLift + totalSporeTrap + totalCulturable);

  const fieldHours = h_asb + h_xrf + h_lead + h_mold;
  const suggestedHoursBase = fieldHours + ormHours;
  const suggestedHoursFinal = (fieldHours * efficiencyFactor) + ormHours;

  // Get staff breakdown
  const getStaffBreakdown = () => {
    if (details.staff_breakdown && Array.isArray(details.staff_breakdown) && details.staff_breakdown.length > 0) {
      return details.staff_breakdown;
    } else if (details.selected_role) {
      return [{ role: details.selected_role, count: 1 }];
    }
    return [];
  };

  const staffBreakdown = getStaffBreakdown();

  return (
    <div className="breakdown-details-container">
      <h3 style={{ marginBottom: '20px', color: '#333' }}>Detailed Calculation Breakdown</h3>

      {/* Sample Counts */}
      {(totalPLM > 0 || totalXRF > 0 || totalChipsWipes > 0 || totalTapeLift > 0 || totalSporeTrap > 0 || totalCulturable > 0) && (
        <div className="breakdown-section">
          <div className="breakdown-section-header" onClick={() => toggleSection('samples')}>
            <h4>Sample Counts</h4>
            <span className="toggle-icon">{expandedSections.samples ? '▼' : '▶'}</span>
          </div>
          {expandedSections.samples && (
            <div className="breakdown-section-content">
              {totalPLM > 0 && (
                <div className="data-item">
                  <span className="data-label">Total PLM (Asbestos):</span>
                  <span className="data-value">{formatNumber(totalPLM, 0)}</span>
                </div>
              )}
              {totalXRF > 0 && (
                <div className="data-item">
                  <span className="data-label">Total XRF Shots:</span>
                  <span className="data-value">{formatNumber(totalXRF, 0)}</span>
                </div>
              )}
              {totalChipsWipes > 0 && (
                <div className="data-item">
                  <span className="data-label">Total Chips/Wipes:</span>
                  <span className="data-value">{formatNumber(totalChipsWipes, 0)}</span>
                </div>
              )}
              {(totalTapeLift > 0 || totalSporeTrap > 0 || totalCulturable > 0) && (
                <>
                  {totalTapeLift > 0 && (
                    <div className="data-item">
                      <span className="data-label">Total Tape Lift:</span>
                      <span className="data-value">{formatNumber(totalTapeLift, 0)}</span>
                    </div>
                  )}
                  {totalSporeTrap > 0 && (
                    <div className="data-item">
                      <span className="data-label">Total Spore Trap:</span>
                      <span className="data-value">{formatNumber(totalSporeTrap, 0)}</span>
                    </div>
                  )}
                  {totalCulturable > 0 && (
                    <div className="data-item">
                      <span className="data-label">Total Culturable:</span>
                      <span className="data-value">{formatNumber(totalCulturable, 0)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hours Calculation */}
      {suggestedHoursFinal > 0 && (
        <div className="breakdown-section">
          <div className="breakdown-section-header" onClick={() => toggleSection('hours')}>
            <h4>Hours Calculation</h4>
            <span className="toggle-icon">{expandedSections.hours ? '▼' : '▶'}</span>
          </div>
          {expandedSections.hours && (
            <div className="breakdown-section-content">
              {totalPLM > 0 && (
                <>
                  {renderFormula(
                    `Asbestos Hours = (Minutes per Sample × Total PLM) ÷ 60`,
                    `(${formatNumber(getMinutesUsed('asbestos'))} × ${formatNumber(totalPLM, 0)}) ÷ 60`,
                    h_asb,
                    ' hours'
                  )}
                </>
              )}
              {totalXRF > 0 && (
                <>
                  {renderFormula(
                    `XRF Hours = (Minutes per Shot × Total XRF Shots) ÷ 60`,
                    `(${formatNumber(getMinutesUsed('xrf'))} × ${formatNumber(totalXRF, 0)}) ÷ 60`,
                    h_xrf,
                    ' hours'
                  )}
                </>
              )}
              {totalChipsWipes > 0 && (
                <>
                  {renderFormula(
                    `Lead Hours = (Minutes per Sample × Total Chips/Wipes) ÷ 60`,
                    `(${formatNumber(getMinutesUsed('lead'))} × ${formatNumber(totalChipsWipes, 0)}) ÷ 60`,
                    h_lead,
                    ' hours'
                  )}
                </>
              )}
              {(totalTapeLift > 0 || totalSporeTrap > 0 || totalCulturable > 0) && (
                <>
                  {renderFormula(
                    `Mold Hours = (Minutes per Sample × Total Mold Samples) ÷ 60`,
                    `(${formatNumber(getMinutesUsed('mold'))} × ${formatNumber(totalTapeLift + totalSporeTrap + totalCulturable, 0)}) ÷ 60`,
                    h_mold,
                    ' hours'
                  )}
                </>
              )}
              {renderFormula(
                `Field Hours = Asbestos + XRF + Lead + Mold`,
                `${formatNumber(h_asb)} + ${formatNumber(h_xrf)} + ${formatNumber(h_lead)} + ${formatNumber(h_mold)}`,
                fieldHours,
                ' hours'
              )}
              {ormHours > 0 && (
                <div className="data-item">
                  <span className="data-label">ORM Hours:</span>
                  <span className="data-value">{formatNumber(ormHours)} hours</span>
                </div>
              )}
              {renderFormula(
                `Suggested Hours (Base) = Field Hours + ORM Hours`,
                `${formatNumber(fieldHours)} + ${formatNumber(ormHours)}`,
                suggestedHoursBase,
                ' hours'
              )}
              {efficiencyFactor !== 1.0 && (
                <>
                  {renderFormula(
                    `Suggested Hours (Final) = (Field Hours × Efficiency Factor) + ORM Hours`,
                    `(${formatNumber(fieldHours)} × ${formatNumber(efficiencyFactor)}) + ${formatNumber(ormHours)}`,
                    suggestedHoursFinal,
                    ' hours'
                  )}
                </>
              )}
              {efficiencyFactor === 1.0 && (
                <div className="data-item">
                  <span className="data-label">Suggested Hours (Final):</span>
                  <span className="data-value">{formatNumber(suggestedHoursFinal)} hours</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Staff Labor Costs */}
      {staffBreakdown.length > 0 && details.staff_labor_costs && (
        <div className="breakdown-section">
          <div className="breakdown-section-header" onClick={() => toggleSection('staff')}>
            <h4>Staff Labor Costs</h4>
            <span className="toggle-icon">{expandedSections.staff ? '▼' : '▶'}</span>
          </div>
          {expandedSections.staff && (
            <div className="breakdown-section-content">
              {staffBreakdown.map((staff, index) => {
                const role = staff.role;
                const count = staff.count || 1;
                const totalCost = details.staff_labor_costs[role] || 0;
                const rate = getRoleRate(role);
                const hours = suggestedHoursFinal;

                return (
                  <div key={index} className="staff-role-breakdown">
                    <h5>{role} (Count: {count})</h5>
                    <div className="formula-group">
                      {rate && hours > 0 && (
                        <>
                          {renderFormula(
                            `Labor Cost = Hours × Hourly Rate × Staff Count`,
                            `${formatNumber(hours)} × ${formatCurrency(rate)} × ${count}`,
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

      {/* Grand Total */}
      {details.total_cost !== undefined && details.total_cost !== null && (
        <div className="breakdown-section highlight">
          <div className="breakdown-section-header">
            <h4>Total HRS Estimator Cost</h4>
          </div>
          <div className="breakdown-section-content">
            <div className="final-cost large">
              <strong>{formatCurrency(details.total_cost)}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRSBreakdownDetails;
