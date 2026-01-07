import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { estimateSnapshotAPI, labFeesAPI } from '../services/api';
import './SnapshotDetails.css';

const SnapshotDetails = () => {
  const navigate = useNavigate();
  const { snapshotId } = useParams();
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [labMetadata, setLabMetadata] = useState({ tests: {}, turnTimes: {} });

  useEffect(() => {
    const fetchSnapshot = async () => {
      if (!snapshotId) {
        setError('Invalid snapshot ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await estimateSnapshotAPI.getSnapshot(parseInt(snapshotId));
        setSnapshot(data);
      } catch (err) {
        console.error('Error fetching snapshot:', err);
        setError('Failed to load snapshot details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSnapshot();
  }, [snapshotId]);

  // Fetch Lab Fees metadata for resolving IDs to names
  useEffect(() => {
    const fetchLabMetadata = async () => {
      try {
        const labs = await labFeesAPI.getLabs();
        const testsMap = {};
        const turnTimesMap = {};

        // Fetch data for all labs to ensure we can resolve any legacy IDs
        // This acts as a global lookup table
        for (const lab of labs) {
          const categories = await labFeesAPI.getCategories(lab.id);
          for (const category of categories) {
            const tests = await labFeesAPI.getTests(category.id);
            for (const test of tests) {
              testsMap[test.id] = {
                name: test.name,
                category: category.name
              };

              const rates = await labFeesAPI.getRates(test.id);
              rates.forEach(rate => {
                if (rate.turn_time) {
                  // Handle both object (API) and flattened (if cached/modified) structures
                  const turnTimeId = rate.turn_time.id || rate.turn_time_id;
                  const label = rate.turn_time.label || rate.turn_time;

                  // We map specific turn_time IDs if available, or use the label as fallback
                  // Key format: testId-turnTimeId
                  if (turnTimeId) {
                    turnTimesMap[`${test.id}-${turnTimeId}`] = label;
                  }
                }
              });
            }
          }
        }
        setLabMetadata({ tests: testsMap, turnTimes: turnTimesMap });
      } catch (err) {
        console.error('Error fetching lab metadata:', err);
        // Ensure non-blocking failure for metadata
      }
    };

    fetchLabMetadata();
  }, []);

  const formatCurrency = (value) => {
    if (value === null || value === undefined) {
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') {
      return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return value;
  };

  if (loading) {
    return (
      <div className="snapshot-details-container">
        <div className="snapshot-details-content">
          <div className="loading-message">Loading snapshot details...</div>
        </div>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="snapshot-details-container">
        <div className="snapshot-details-content">
          <div className="error-message">{error || 'Snapshot not found'}</div>
          <div className="navigation-actions">
            <button className="btn-back" onClick={() => navigate('/previous-estimates')}>
              Back to Previous Estimates
            </button>
            <button className="btn-home" onClick={() => navigate('/')}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hrsData = snapshot.hrs_estimator_data || {};
  const hrsInputs = hrsData.inputs || {};
  const hrsOutputs = hrsData.outputs || {};

  const labData = snapshot.lab_fees_data || {};
  const labInputs = labData.inputs || {};
  const labOutputs = labData.outputs || {};

  const logisticsData = snapshot.logistics_data || {};
  const logisticsInputs = logisticsData.inputs || {};
  const logisticsOutputs = logisticsData.outputs || {};

  // Calculate totals
  const hrsTotal = hrsOutputs.total_cost || 0;
  const labTotal = labOutputs.total_cost || 0;
  const logisticsTotal = logisticsOutputs.total_logistics_cost || 0;
  const grandTotal = hrsTotal + labTotal + logisticsTotal;

  return (
    <div className="snapshot-details-container">
      <div className="snapshot-details-content">
        {/* Header */}
        <div className="details-header">
          <div className="header-top">
            <h1>Estimate Details: {snapshot.project_name}</h1>
            <div className="navigation-actions">
              <button className="btn-back" onClick={() => navigate('/previous-estimates')}>
                ← Back to Previous Estimates
              </button>
              <button className="btn-home" onClick={() => navigate('/')}>
                Home
              </button>
            </div>
          </div>
          <div className="snapshot-meta">
            <div className="meta-item">
              <span className="meta-label">Project:</span>
              <span className="meta-value">{snapshot.project_name}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Snapshot ID:</span>
              <span className="meta-value">#{snapshot.id}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Created:</span>
              <span className="meta-value">{formatDate(snapshot.created_at)}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Status:</span>
              <span className={`meta-value ${snapshot.is_active ? 'active' : 'inactive'}`}>
                {snapshot.is_active ? 'Active' : 'Historical'}
              </span>
            </div>
            {snapshot.snapshot_name && (
              <div className="meta-item">
                <span className="meta-label">Name:</span>
                <span className="meta-value">{snapshot.snapshot_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Read-only notice */}
        <div className="read-only-notice">
          <p>This is a read-only view of the saved estimate. No calculations are performed.</p>
        </div>

        {/* HRS Estimator Section */}
        {hrsData.inputs || hrsData.outputs ? (
          <div className="module-section">
            <h2 className="module-title">HRS Estimator</h2>
            {hrsData.inputs ? (
              <div className="module-inputs">
                <h3>Inputs</h3>
                <div className="data-grid">
                  {hrsInputs.field_staff_count && (
                    <div className="data-item">
                      <span className="data-label">Field Staff Count:</span>
                      <span className="data-value">{hrsInputs.field_staff_count}</span>
                    </div>
                  )}
                  {hrsInputs.efficiency_factor !== undefined && hrsInputs.efficiency_factor !== null && (
                    <div className="data-item">
                      <span className="data-label">Efficiency Factor:</span>
                      <span className="data-value">{formatNumber(hrsInputs.efficiency_factor)}</span>
                    </div>
                  )}
                  {(hrsInputs.override_minutes_asbestos !== undefined && hrsInputs.override_minutes_asbestos !== null) && (
                    <div className="data-item">
                      <span className="data-label">Override Minutes (Asbestos):</span>
                      <span className="data-value">{formatNumber(hrsInputs.override_minutes_asbestos)}</span>
                    </div>
                  )}
                  {(hrsInputs.override_minutes_xrf !== undefined && hrsInputs.override_minutes_xrf !== null) && (
                    <div className="data-item">
                      <span className="data-label">Override Minutes (XRF):</span>
                      <span className="data-value">{formatNumber(hrsInputs.override_minutes_xrf)}</span>
                    </div>
                  )}
                  {(hrsInputs.override_minutes_lead !== undefined && hrsInputs.override_minutes_lead !== null) && (
                    <div className="data-item">
                      <span className="data-label">Override Minutes (Lead):</span>
                      <span className="data-value">{formatNumber(hrsInputs.override_minutes_lead)}</span>
                    </div>
                  )}
                  {(hrsInputs.override_minutes_mold !== undefined && hrsInputs.override_minutes_mold !== null) && (
                    <div className="data-item">
                      <span className="data-label">Override Minutes (Mold):</span>
                      <span className="data-value">{formatNumber(hrsInputs.override_minutes_mold)}</span>
                    </div>
                  )}
                </div>
                {hrsInputs.asbestos_lines && hrsInputs.asbestos_lines.length > 0 && (
                  <div className="data-table-section">
                    <h4>Asbestos Lines</h4>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Component</th>
                          <th>Unit Label</th>
                          <th>Actuals</th>
                          <th>Bulks per Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hrsInputs.asbestos_lines.map((line, idx) => (
                          <tr key={idx}>
                            <td>{line.component_name}</td>
                            <td>{line.unit_label}</td>
                            <td>{formatNumber(line.actuals)}</td>
                            <td>{formatNumber(line.bulks_per_unit)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {hrsInputs.lead_lines && hrsInputs.lead_lines.length > 0 && (
                  <div className="data-table-section">
                    <h4>Lead Lines</h4>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Component</th>
                          <th>XRF Shots</th>
                          <th>Chips/Wipes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hrsInputs.lead_lines.map((line, idx) => (
                          <tr key={idx}>
                            <td>{line.component_name}</td>
                            <td>{formatNumber(line.xrf_shots)}</td>
                            <td>{formatNumber(line.chips_wipes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {hrsInputs.mold_lines && hrsInputs.mold_lines.length > 0 && (
                  <div className="data-table-section">
                    <h4>Mold Lines</h4>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Component</th>
                          <th>Tape Lift</th>
                          <th>Spore Trap</th>
                          <th>Culturable</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hrsInputs.mold_lines.map((line, idx) => (
                          <tr key={idx}>
                            <td>{line.component_name}</td>
                            <td>{formatNumber(line.tape_lift)}</td>
                            <td>{formatNumber(line.spore_trap)}</td>
                            <td>{formatNumber(line.culturable)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {hrsInputs.orm && (
                  <div className="data-grid">
                    <div className="data-item">
                      <span className="data-label">ORM Building Total SF:</span>
                      <span className="data-value">{formatNumber(hrsInputs.orm.building_total_sf)}</span>
                    </div>
                    <div className="data-item">
                      <span className="data-label">ORM Hours:</span>
                      <span className="data-value">{formatNumber(hrsInputs.orm.hours)}</span>
                    </div>
                  </div>
                )}
                {hrsInputs.staff && hrsInputs.staff.length > 0 && (
                  <div className="data-table-section">
                    <h4>Staff Assignments</h4>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Role</th>
                          <th>Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hrsInputs.staff.map((s, idx) => (
                          <tr key={idx}>
                            <td>{s.role}</td>
                            <td>{s.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {hrsInputs.selected_role && (
                  <div className="data-item">
                    <span className="data-label">Selected Role:</span>
                    <span className="data-value">{hrsInputs.selected_role}</span>
                  </div>
                )}
                {hrsInputs.manual_labor_hours && Object.keys(hrsInputs.manual_labor_hours).length > 0 && (
                  <div className="data-table-section">
                    <h4>Manual Labor Hours</h4>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Role</th>
                          <th>Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(hrsInputs.manual_labor_hours).map(([role, hours]) => (
                          <tr key={role}>
                            <td>{role}</td>
                            <td>{formatNumber(hours)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-data">No HRS Estimator inputs saved</div>
            )}
            {hrsData.outputs ? (
              <div className="module-outputs">
                <h3>Calculated Outputs</h3>
                <div className="outputs-grid">
                  {hrsOutputs.suggested_hours_final !== undefined && (
                    <div className="output-item">
                      <span className="output-label">Suggested Hours (Final):</span>
                      <span className="output-value">{formatNumber(hrsOutputs.suggested_hours_final)} hours</span>
                    </div>
                  )}
                  {hrsOutputs.total_plm !== undefined && (
                    <div className="output-item">
                      <span className="output-label">Total PLM:</span>
                      <span className="output-value">{formatNumber(hrsOutputs.total_plm)}</span>
                    </div>
                  )}
                  {hrsOutputs.total_xrf_shots !== undefined && (
                    <div className="output-item">
                      <span className="output-label">Total XRF Shots:</span>
                      <span className="output-value">{formatNumber(hrsOutputs.total_xrf_shots)}</span>
                    </div>
                  )}
                  {hrsOutputs.total_chips_wipes !== undefined && (
                    <div className="output-item">
                      <span className="output-label">Total Chips/Wipes:</span>
                      <span className="output-value">{formatNumber(hrsOutputs.total_chips_wipes)}</span>
                    </div>
                  )}
                  {hrsOutputs.staff_labor_costs && Object.keys(hrsOutputs.staff_labor_costs).length > 0 && (
                    <div className="data-table-section">
                      <h4>Staff Labor Costs</h4>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Role</th>
                            <th>Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(hrsOutputs.staff_labor_costs).map(([role, cost]) => (
                            <tr key={role}>
                              <td>{role}</td>
                              <td>{formatCurrency(cost)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="output-total">
                    <span className="total-label">HRS Estimator Total:</span>
                    <span className="total-value">{formatCurrency(hrsTotal)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-data">No HRS Estimator outputs calculated</div>
            )}
          </div>
        ) : (
          <div className="module-section">
            <h2 className="module-title">HRS Estimator</h2>
            <div className="no-data">Not used in this estimate</div>
          </div>
        )}

        {/* Lab Fees Section */}
        {labData.inputs || labData.outputs ? (
          <div className="module-section">
            <h2 className="module-title">Lab Fees</h2>
            {labData.inputs ? (
              <div className="module-inputs">
                <h3>Inputs</h3>
                {labInputs.order_details && Object.keys(labInputs.order_details).length > 0 && (
                  <div className="data-table-section">
                    <h4>Order Details (Test Selections)</h4>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Test Name</th>
                          <th>Service Category</th>
                          <th>Turnaround Time</th>
                          <th>Quantity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(labInputs.order_details).flatMap(([testId, turnTimes]) =>
                          Object.entries(turnTimes).map(([turnTimeId, quantity]) => {
                            const testInfo = labMetadata.tests[testId];
                            // Try to resolve turn time label:
                            // 1. Look up using testId-turnTimeId key
                            // 2. Fallback to just the ID if not found (or "Standard" if empty)
                            const turnTimeLabel = labMetadata.turnTimes[`${testId}-${turnTimeId}`] ||
                              (turnTimeId === '' ? 'Standard' : turnTimeId);

                            return (
                              <tr key={`${testId}-${turnTimeId}`}>
                                <td>{testInfo ? testInfo.name : `Test #${testId}`}</td>
                                <td>{testInfo ? testInfo.category : '-'}</td>
                                <td>
                                  <span className="turn-time-badge">
                                    {turnTimeLabel}
                                  </span>
                                </td>
                                <td>{formatNumber(quantity)}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                {labInputs.staff_assignments && labInputs.staff_assignments.length > 0 && (
                  <div className="data-table-section">
                    <h4>Staff Assignments</h4>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Role</th>
                          <th>Count</th>
                          <th>Hours per Person</th>
                        </tr>
                      </thead>
                      <tbody>
                        {labInputs.staff_assignments.map((s, idx) => (
                          <tr key={idx}>
                            <td>{s.role}</td>
                            <td>{s.count}</td>
                            <td>{formatNumber(s.hours_per_person)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {labInputs.hrs_estimation_id && (
                  <div className="data-item">
                    <span className="data-label">Linked HRS Estimation ID:</span>
                    <span className="data-value">#{labInputs.hrs_estimation_id}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-data">No Lab Fees inputs saved</div>
            )}
            {labData.outputs ? (
              <div className="module-outputs">
                <h3>Calculated Outputs</h3>
                <div className="outputs-grid">
                  {labOutputs.total_samples !== undefined && (
                    <div className="output-item">
                      <span className="output-label">Total Samples:</span>
                      <span className="output-value">{formatNumber(labOutputs.total_samples)}</span>
                    </div>
                  )}
                  {labOutputs.total_lab_fees_cost !== undefined && (
                    <div className="output-item">
                      <span className="output-label">Lab Fees Cost:</span>
                      <span className="output-value">{formatCurrency(labOutputs.total_lab_fees_cost)}</span>
                    </div>
                  )}
                  {labOutputs.total_staff_labor_cost !== undefined && (
                    <div className="output-item">
                      <span className="output-label">Staff Labor Cost:</span>
                      <span className="output-value">{formatCurrency(labOutputs.total_staff_labor_cost)}</span>
                    </div>
                  )}
                  {labOutputs.staff_labor_costs && Object.keys(labOutputs.staff_labor_costs).length > 0 && (
                    <div className="data-table-section">
                      <h4>Staff Labor Costs</h4>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Role</th>
                            <th>Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(labOutputs.staff_labor_costs).map(([role, cost]) => (
                            <tr key={role}>
                              <td>{role}</td>
                              <td>{formatCurrency(cost)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="output-total">
                    <span className="total-label">Lab Fees Total:</span>
                    <span className="total-value">{formatCurrency(labTotal)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-data">No Lab Fees outputs calculated</div>
            )}
          </div>
        ) : (
          <div className="module-section">
            <h2 className="module-title">Lab Fees</h2>
            <div className="no-data">Not used in this estimate</div>
          </div>
        )}

        {/* Logistics Section */}
        {logisticsData.inputs || logisticsData.outputs ? (
          <div className="module-section">
            <h2 className="module-title">Logistics</h2>
            {logisticsData.inputs ? (
              <div className="module-inputs">
                <h3>Inputs</h3>
                <div className="data-grid">
                  {logisticsInputs.site_access_mode && (
                    <div className="data-item">
                      <span className="data-label">Site Access Mode:</span>
                      <span className="data-value">{logisticsInputs.site_access_mode}</span>
                    </div>
                  )}
                  {logisticsInputs.is_local_project !== undefined && (
                    <div className="data-item">
                      <span className="data-label">Local Project:</span>
                      <span className="data-value">{logisticsInputs.is_local_project ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                  {logisticsInputs.use_client_vehicle !== undefined && (
                    <div className="data-item">
                      <span className="data-label">Use Client Vehicle:</span>
                      <span className="data-value">{logisticsInputs.use_client_vehicle ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                  {logisticsInputs.per_diem_rate !== undefined && (
                    <div className="data-item">
                      <span className="data-label">Per Diem Rate:</span>
                      <span className="data-value">{formatCurrency(logisticsInputs.per_diem_rate)}</span>
                    </div>
                  )}
                  {logisticsInputs.rate_multiplier !== undefined && (
                    <div className="data-item">
                      <span className="data-label">Rate Multiplier:</span>
                      <span className="data-value">{formatNumber(logisticsInputs.rate_multiplier)}</span>
                    </div>
                  )}
                </div>
                {logisticsInputs.staff && logisticsInputs.staff.length > 0 && (
                  <div className="data-table-section">
                    <h4>Staff Assignments</h4>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Role</th>
                          <th>Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logisticsInputs.staff.map((s, idx) => (
                          <tr key={idx}>
                            <td>{s.role}</td>
                            <td>{s.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {logisticsInputs.roundtrip_driving && (
                  <div className="data-section">
                    <h4>Roundtrip Driving</h4>
                    <div className="data-grid">
                      {logisticsInputs.roundtrip_driving.project_location && (
                        <div className="data-item">
                          <span className="data-label">Project Location:</span>
                          <span className="data-value">{logisticsInputs.roundtrip_driving.project_location}</span>
                        </div>
                      )}
                      {logisticsInputs.roundtrip_driving.one_way_miles !== undefined && (
                        <div className="data-item">
                          <span className="data-label">One Way Miles:</span>
                          <span className="data-value">{formatNumber(logisticsInputs.roundtrip_driving.one_way_miles)}</span>
                        </div>
                      )}
                      {logisticsInputs.roundtrip_driving.project_duration_days !== undefined && (
                        <div className="data-item">
                          <span className="data-label">Project Duration (Days):</span>
                          <span className="data-value">{formatNumber(logisticsInputs.roundtrip_driving.project_duration_days)}</span>
                        </div>
                      )}
                      {logisticsInputs.roundtrip_driving.cost_per_mile !== undefined && (
                        <div className="data-item">
                          <span className="data-label">Cost per Mile:</span>
                          <span className="data-value">{formatCurrency(logisticsInputs.roundtrip_driving.cost_per_mile)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {logisticsInputs.daily_driving && (
                  <div className="data-section">
                    <h4>Daily Driving</h4>
                    <div className="data-grid">
                      {logisticsInputs.daily_driving.site_location && (
                        <div className="data-item">
                          <span className="data-label">Site Location:</span>
                          <span className="data-value">{logisticsInputs.daily_driving.site_location}</span>
                        </div>
                      )}
                      {logisticsInputs.daily_driving.daily_miles !== undefined && (
                        <div className="data-item">
                          <span className="data-label">Daily Miles:</span>
                          <span className="data-value">{formatNumber(logisticsInputs.daily_driving.daily_miles)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {logisticsInputs.flights && (
                  <div className="data-section">
                    <h4>Flights</h4>
                    <div className="data-grid">
                      {logisticsInputs.flights.num_tickets !== undefined && (
                        <div className="data-item">
                          <span className="data-label">Number of Tickets:</span>
                          <span className="data-value">{formatNumber(logisticsInputs.flights.num_tickets)}</span>
                        </div>
                      )}
                      {logisticsInputs.flights.roundtrip_cost_per_ticket !== undefined && (
                        <div className="data-item">
                          <span className="data-label">Cost per Ticket:</span>
                          <span className="data-value">{formatCurrency(logisticsInputs.flights.roundtrip_cost_per_ticket)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {logisticsInputs.rental && (
                  <div className="data-section">
                    <h4>Rental Vehicle</h4>
                    <div className="data-grid">
                      {logisticsInputs.rental.rental_days !== undefined && (
                        <div className="data-item">
                          <span className="data-label">Rental Days:</span>
                          <span className="data-value">{formatNumber(logisticsInputs.rental.rental_days)}</span>
                        </div>
                      )}
                      {logisticsInputs.rental.rental_period_type && (
                        <div className="data-item">
                          <span className="data-label">Rental Period Type:</span>
                          <span className="data-value">{logisticsInputs.rental.rental_period_type}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {logisticsInputs.lodging && (
                  <div className="data-section">
                    <h4>Lodging</h4>
                    <div className="data-grid">
                      {logisticsInputs.lodging.hotel_name && (
                        <div className="data-item">
                          <span className="data-label">Hotel Name:</span>
                          <span className="data-value">{logisticsInputs.lodging.hotel_name}</span>
                        </div>
                      )}
                      {logisticsInputs.lodging.night_cost_with_taxes !== undefined && (
                        <div className="data-item">
                          <span className="data-label">Night Cost (with taxes):</span>
                          <span className="data-value">{formatCurrency(logisticsInputs.lodging.night_cost_with_taxes)}</span>
                        </div>
                      )}
                      {logisticsInputs.lodging.project_duration_days !== undefined && (
                        <div className="data-item">
                          <span className="data-label">Project Duration (Days):</span>
                          <span className="data-value">{formatNumber(logisticsInputs.lodging.project_duration_days)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-data">No Logistics inputs saved</div>
            )}
            {logisticsData.outputs ? (
              <div className="module-outputs">
                <h3>Calculated Outputs</h3>
                <div className="outputs-grid">
                  {logisticsOutputs.total_driving_cost !== undefined && (
                    <div className="output-item">
                      <span className="output-label">Total Driving Cost:</span>
                      <span className="output-value">{formatCurrency(logisticsOutputs.total_driving_cost)}</span>
                    </div>
                  )}
                  {logisticsOutputs.total_flight_cost !== undefined && (
                    <div className="output-item">
                      <span className="output-label">Total Flight Cost:</span>
                      <span className="output-value">{formatCurrency(logisticsOutputs.total_flight_cost)}</span>
                    </div>
                  )}
                  {logisticsOutputs.total_rental_cost !== undefined && (
                    <div className="output-item">
                      <span className="output-label">Total Rental Cost:</span>
                      <span className="output-value">{formatCurrency(logisticsOutputs.total_rental_cost)}</span>
                    </div>
                  )}
                  {logisticsOutputs.total_lodging_room_cost !== undefined && (
                    <div className="output-item">
                      <span className="output-label">Total Lodging Cost:</span>
                      <span className="output-value">{formatCurrency(logisticsOutputs.total_lodging_room_cost)}</span>
                    </div>
                  )}
                  {logisticsOutputs.total_per_diem_cost !== undefined && (
                    <div className="output-item">
                      <span className="output-label">Total Per Diem Cost:</span>
                      <span className="output-value">{formatCurrency(logisticsOutputs.total_per_diem_cost)}</span>
                    </div>
                  )}
                  {logisticsOutputs.staff_labor_costs && Object.keys(logisticsOutputs.staff_labor_costs).length > 0 && (
                    <div className="data-table-section">
                      <h4>Staff Labor Costs</h4>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Role</th>
                            <th>Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(logisticsOutputs.staff_labor_costs).map(([role, cost]) => (
                            <tr key={role}>
                              <td>{role}</td>
                              <td>{formatCurrency(cost)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="output-total">
                    <span className="total-label">Logistics Total:</span>
                    <span className="total-value">{formatCurrency(logisticsTotal)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-data">No Logistics outputs calculated</div>
            )}
          </div>
        ) : (
          <div className="module-section">
            <h2 className="module-title">Logistics</h2>
            <div className="no-data">Not used in this estimate</div>
          </div>
        )}

        {/* Grand Total */}
        <div className="grand-total-section">
          <div className="grand-total-card">
            <div className="grand-total-label">Grand Total</div>
            <div className="grand-total-value">{formatCurrency(grandTotal)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnapshotDetails;

