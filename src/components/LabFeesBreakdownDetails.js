import React, { useState, useEffect } from 'react';
import { logisticsAPI } from '../services/api';
import './Logistics.css'; // Import shared breakdown styles

const LabFeesBreakdownDetails = ({ details, inputs, categories = [] }) => {
  const [laborRates, setLaborRates] = useState([]);
  const [expandedSections, setExpandedSections] = useState({ tests: true });

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

  // Parse order_details to get test breakdown
  // Format: { "test_id": { "turn_time_id": quantity } }
  const getTestBreakdown = () => {
    if (!inputs?.order_details) return [];

    const breakdown = [];
    const orderDetails = inputs.order_details;

    Object.entries(orderDetails).forEach(([testIdStr, turnTimes]) => {
      if (!turnTimes || typeof turnTimes !== 'object') return;
      // Skip old cart-format entries that have a 'test_id' key directly
      if ('test_id' in turnTimes) return;

      const testId = parseInt(testIdStr, 10);

      Object.entries(turnTimes).forEach(([turnTimeIdStr, quantity]) => {
        const turnTimeId = parseInt(turnTimeIdStr, 10);
        const qty = parseFloat(quantity) || 0;
        if (qty <= 0) return;

        let testName = `Test ID ${testId}`;
        let turnTimeLabel = `Turnaround ID ${turnTimeId}`;
        let price = 0;
        let categoryName = 'Unknown';
        let labName = '';

        for (const category of categories) {
          if (!category.tests) continue;
          for (const test of category.tests) {
            if (parseInt(test.id, 10) !== testId) continue;
            testName = test.name;
            categoryName = category.name;
            labName = category.labName || '';

            if (test.rates) {
              for (const rate of test.rates) {
                // Normalize turn_time_id — may be on rate.turn_time_id or rate.turn_time.id
                const rateTtId = rate.turn_time_id != null
                  ? parseInt(rate.turn_time_id, 10)
                  : (rate.turn_time?.id != null ? parseInt(rate.turn_time.id, 10) : null);

                if (rateTtId === turnTimeId) {
                  price = rate.price || 0;
                  turnTimeLabel = typeof rate.turn_time === 'string' ? rate.turn_time : (rate.turn_time?.label || turnTimeLabel);
                  break;
                }
              }
            }
            break;
          }
          if (labName) break;
        }

        breakdown.push({ labName, categoryName, testName, turnTime: turnTimeLabel, quantity: qty, price, cost: qty * price });
      });
    });

    return breakdown;
  };

  const testBreakdown = getTestBreakdown();
  const totalLabFeesCost = details.total_lab_fees_cost || 0;
  const totalSamples = details.total_samples || 0;
  const totalStaffLaborCost = details.total_staff_labor_cost || 0;

  // PLM layer fields from snapshot outputs
  const plmCombinedQty = details.plm_combined_qty || 0;
  const plmMultiplier = details.plm_multiplier || 0.715;
  const plmLayerSamples = details.plm_layer_samples || 0;
  const plmLayerCost = details.plm_layer_cost || 0;
  const plmUnitPrice = details.plm_unit_price || 0;
  const hasPLMLayers = plmCombinedQty > 0 && plmLayerSamples > 0;

  // Markup fields
  const subtotalCost = details.subtotal_cost || (totalLabFeesCost + totalStaffLaborCost);
  const labMarkupPercent = details.lab_markup_percent ?? 50;
  const labMarkupAmount = details.lab_markup_amount || (subtotalCost * (labMarkupPercent / 100));
  const totalCostFinal = details.total_cost || (subtotalCost + labMarkupAmount);

  const staffBreakdown = (details.staff_breakdown && Array.isArray(details.staff_breakdown) && details.staff_breakdown.length > 0)
    ? details.staff_breakdown
    : [];

  return (
    <div className="breakdown-details-container">
      <h3 style={{ marginBottom: '20px', color: '#333' }}>Detailed Calculation Breakdown</h3>

      {/* Test Breakdown Table */}
      {testBreakdown.length > 0 && (
        <div className="breakdown-section">
          <div className="breakdown-section-header" onClick={() => toggleSection('tests')}>
            <h4>Lab Test Costs</h4>
            <span className="toggle-icon">{expandedSections.tests ? '▼' : '▶'}</span>
          </div>
          {expandedSections.tests && (
            <div className="breakdown-section-content">
              <table className="breakdown-table" style={{ width: '100%', marginTop: '10px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Lab</th>
                    <th>Category</th>
                    <th>Test Name</th>
                    <th>Turnaround</th>
                    <th className="text-right">Quantity</th>
                    <th className="text-right">Price / Sample</th>
                    <th className="text-right">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {testBreakdown.map((item, index) => (
                    <tr key={index}>
                      <td style={{ fontWeight: '600', color: '#2c3e50' }}>{item.labName || '—'}</td>
                      <td>{item.categoryName}</td>
                      <td>{item.testName}</td>
                      <td>{item.turnTime}</td>
                      <td className="text-right">{formatNumber(item.quantity, 0)}</td>
                      <td className="text-right">{formatCurrency(item.price)}</td>
                      <td className="text-right">
                        <strong>{formatCurrency(item.cost)}</strong>
                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>
                          {formatNumber(item.quantity, 0)} × {formatCurrency(item.price)}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {/* PLM Layer rows (shown inline after test rows) */}
                  {hasPLMLayers && (
                    <>
                      <tr style={{ backgroundColor: '#fffde7', borderTop: '2px solid #f9e000' }}>
                        <td colSpan="4" style={{ fontStyle: 'italic', color: '#7b6e00', paddingLeft: '12px' }}>
                          Layer Multiplier
                        </td>
                        <td className="text-right" style={{ color: '#7b6e00' }}>
                          {formatNumber(plmCombinedQty, 0)} × {plmMultiplier} = <strong>{plmLayerSamples}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#a09000' }}>samples (rounded up)</div>
                        </td>
                        <td className="text-right" style={{ color: '#7b6e00' }}>{formatCurrency(plmUnitPrice)}</td>
                        <td></td>
                      </tr>
                      <tr style={{ backgroundColor: '#fffde7' }}>
                        <td colSpan="4" style={{ fontStyle: 'italic', color: '#7b6e00', paddingLeft: '12px' }}>
                          PLM Layer Costs
                        </td>
                        <td className="text-right" style={{ color: '#7b6e00' }}>{plmLayerSamples}</td>
                        <td className="text-right" style={{ color: '#7b6e00' }}>{formatCurrency(plmUnitPrice)}</td>
                        <td className="text-right">
                          <strong style={{ color: '#5a5000' }}>{formatCurrency(plmLayerCost)}</strong>
                          <div style={{ fontSize: '0.8rem', color: '#a09000' }}>
                            {plmLayerSamples} × {formatCurrency(plmUnitPrice)}
                          </div>
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
                <tfoot>
                  <tr className="breakdown-total-row">
                    <td colSpan="4"><strong>Subtotal — Lab Tests</strong></td>
                    <td className="text-right"><strong>{formatNumber(totalSamples, 0)}</strong></td>
                    <td></td>
                    <td className="text-right"><strong>{formatCurrency(totalLabFeesCost)}</strong></td>
                  </tr>
                </tfoot>
              </table>
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
                const totalHours = staff.total_hours || 0;
                const roleCost = details.staff_labor_costs[role] || 0;
                const rate = getRoleRate(role);
                const hoursPerPerson = count > 0 ? totalHours / count : 0;

                return (
                  <div key={index} className="staff-role-breakdown">
                    <h5>{role} (Count: {count})</h5>
                    <div className="formula-group">
                      {totalHours > 0 && (
                        <>
                          {count > 1 && renderFormula(
                            'Total Hours = Hours per Person × Count',
                            `${formatNumber(hoursPerPerson)} × ${count}`,
                            totalHours,
                            ' hours'
                          )}
                          {rate && renderFormula(
                            'Labor Cost = Total Hours × Hourly Rate',
                            `${formatNumber(totalHours)} × ${formatCurrency(rate)}`,
                            roleCost,
                            ''
                          )}
                        </>
                      )}
                    </div>
                    <div className="final-cost">
                      <strong>Total Cost for {role}: {formatCurrency(roleCost)}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Totals Section: Subtotal → Lab Markup → Total Cost */}
      <div className="breakdown-section highlight">
        <div className="breakdown-section-content" style={{ padding: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                <td style={{ padding: '8px 4px', color: '#555' }}>Subtotal Cost</td>
                <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 600 }}>
                  {formatCurrency(subtotalCost)}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                <td style={{ padding: '8px 4px', color: '#555' }}>
                  Lab Markup ({formatNumber(labMarkupPercent, 0)}%)
                </td>
                <td style={{ padding: '8px 4px', textAlign: 'right', color: '#2e7d32', fontWeight: 600 }}>
                  + {formatCurrency(labMarkupAmount)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '10px 4px', fontWeight: 700, fontSize: '1.05rem', color: '#1a237e' }}>
                  Total Cost
                </td>
                <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: 700, fontSize: '1.1rem', color: '#1a237e' }}>
                  {formatCurrency(totalCostFinal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LabFeesBreakdownDetails;
