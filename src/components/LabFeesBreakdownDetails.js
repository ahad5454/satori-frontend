import React, { useState, useEffect } from 'react';
import { logisticsAPI } from '../services/api';
import './Logistics.css'; // Import shared breakdown styles

const LabFeesBreakdownDetails = ({ details, inputs, categories = [] }) => {
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

  // Parse order_details to get test breakdown
  const getTestBreakdown = () => {
    if (!inputs?.order_details) return [];
    
    const breakdown = [];
    const orderDetails = inputs.order_details;
    
    // order_details format: {"test_id": {"turn_time_id": quantity, ...}, ...}
    Object.entries(orderDetails).forEach(([testIdStr, turnTimes]) => {
      const testId = parseInt(testIdStr);
      
      Object.entries(turnTimes).forEach(([turnTimeIdStr, quantity]) => {
        const turnTimeId = parseInt(turnTimeIdStr);
        const qty = parseFloat(quantity) || 0;
        
        if (qty > 0) {
          // Find test and rate in categories
          let testName = `Test ID ${testId}`;
          let turnTimeLabel = `Turnaround ID ${turnTimeId}`;
          let price = 0;
          let categoryName = 'Unknown';
          
          for (const category of categories) {
            if (category.tests) {
              for (const test of category.tests) {
                if (test.id === testId && test.rates) {
                  testName = test.name;
                  categoryName = category.name;
                  
                  for (const rate of test.rates) {
                    const rateTurnTimeId = typeof rate.turn_time === 'object' 
                      ? rate.turn_time?.id 
                      : rate.turn_time_id;
                    
                    if (rateTurnTimeId === turnTimeId) {
                      price = rate.price || 0;
                      turnTimeLabel = typeof rate.turn_time === 'object'
                        ? rate.turn_time?.label || `Turnaround ID ${turnTimeId}`
                        : `Turnaround ID ${turnTimeId}`;
                      break;
                    }
                  }
                  break;
                }
              }
            }
          }
          
          const cost = qty * price;
          breakdown.push({
            categoryName,
            testName,
            turnTime: turnTimeLabel,
            quantity: qty,
            price,
            cost
          });
        }
      });
    });
    
    return breakdown;
  };

  const testBreakdown = getTestBreakdown();
  const totalLabFeesCost = details.total_lab_fees_cost || 0;
  const totalSamples = details.total_samples || 0;
  const totalStaffLaborCost = details.total_staff_labor_cost || 0;
  const totalCost = details.total_cost || 0;

  // Get staff breakdown
  const getStaffBreakdown = () => {
    if (details.staff_breakdown && Array.isArray(details.staff_breakdown) && details.staff_breakdown.length > 0) {
      return details.staff_breakdown;
    }
    return [];
  };

  const staffBreakdown = getStaffBreakdown();

  return (
    <div className="breakdown-details-container">
      <h3 style={{ marginBottom: '20px', color: '#333' }}>Detailed Calculation Breakdown</h3>

      {/* Test Breakdown */}
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
                    <th>Category</th>
                    <th>Test Name</th>
                    <th>Turnaround</th>
                    <th className="text-right">Quantity</th>
                    <th className="text-right">Price per Sample</th>
                    <th className="text-right">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {testBreakdown.map((item, index) => (
                    <tr key={index}>
                      <td>{item.categoryName}</td>
                      <td>{item.testName}</td>
                      <td>{item.turnTime}</td>
                      <td className="text-right">{formatNumber(item.quantity, 0)}</td>
                      <td className="text-right">{formatCurrency(item.price)}</td>
                      <td className="text-right">
                        <strong>{formatCurrency(item.cost)}</strong>
                        <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                          {formatNumber(item.quantity, 0)} × {formatCurrency(item.price)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="breakdown-total-row">
                    <td colSpan="3"><strong>Total Lab Fees Cost</strong></td>
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
                const totalCost = details.staff_labor_costs[role] || 0;
                const rate = getRoleRate(role);
                const hoursPerPerson = count > 0 ? totalHours / count : 0;

                return (
                  <div key={index} className="staff-role-breakdown">
                    <h5>{role} (Count: {count})</h5>
                    <div className="formula-group">
                      {totalHours > 0 && (
                        <>
                          {count > 1 && (
                            renderFormula(
                              `Total Hours = Hours per Person × Count`,
                              `${formatNumber(hoursPerPerson)} × ${count}`,
                              totalHours,
                              ' hours'
                            )
                          )}
                          {rate && (
                            renderFormula(
                              `Labor Cost = Total Hours × Hourly Rate`,
                              `${formatNumber(totalHours)} × ${formatCurrency(rate)}`,
                              totalCost,
                              ''
                            )
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
      {totalCost > 0 && (
        <div className="breakdown-section highlight">
          <div className="breakdown-section-header">
            <h4>Total Lab Fees Cost</h4>
          </div>
          <div className="breakdown-section-content">
            {totalStaffLaborCost > 0 && (
              <>
                {renderFormula(
                  `Total Cost = Lab Fees Cost + Staff Labor Cost`,
                  `${formatCurrency(totalLabFeesCost)} + ${formatCurrency(totalStaffLaborCost)}`,
                  totalCost,
                  ''
                )}
              </>
            )}
            {totalStaffLaborCost === 0 && (
              <div className="final-cost">
                <strong>Total Cost: {formatCurrency(totalCost)}</strong>
              </div>
            )}
            <div className="final-cost large" style={{ marginTop: '15px' }}>
              <strong>{formatCurrency(totalCost)}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabFeesBreakdownDetails;
