import React from 'react';

const StaffRows = ({ staffRows, setStaffRows, laborRates, totalStaffCount, fieldStaffCount }) => {
  const handleAddRow = () => {
    setStaffRows([...staffRows, { role: '', count: 0 }]);
  };

  const handleRemoveRow = (index) => {
    const newRows = staffRows.filter((_, i) => i !== index);
    setStaffRows(newRows);
  };

  const handleRoleChange = (index, role) => {
    const newRows = [...staffRows];
    newRows[index].role = role;
    setStaffRows(newRows);
  };

  const handleCountChange = (index, count) => {
    const newRows = [...staffRows];
    newRows[index].count = Math.max(0, parseInt(count) || 0);
    setStaffRows(newRows);
  };

  const getRoleRate = (role) => {
    const rateEntry = laborRates.find(r => r.labor_role === role);
    return rateEntry ? rateEntry.hourly_rate : null;
  };

  return (
    <div className="staff-rows-section">
      <div className="staff-rows-header">
        <h3>Staff Breakdown</h3>
        <div className="total-staff-display">
          <strong>Total Staff: {totalStaffCount}</strong>
        </div>
      </div>

      <div className="staff-rows-table">
        <div className="staff-rows-header-row">
          <div className="staff-role-header">Role</div>
          <div className="staff-count-header">Count</div>
          <div className="staff-rate-header">Hourly Rate</div>
          <div className="staff-remove-header"></div>
        </div>

        {staffRows.map((row, index) => {
          const rate = getRoleRate(row.role);
          const hasRate = rate !== null;

          return (
            <div key={index} className="staff-row">
              <div className="staff-role-cell">
                <select
                  value={row.role}
                  onChange={(e) => handleRoleChange(index, e.target.value)}
                  className="form-input staff-role-select"
                >
                  <option value="">-- Select Role --</option>
                  {laborRates.map((rateEntry) => (
                    <option key={rateEntry.labor_role} value={rateEntry.labor_role}>
                      {rateEntry.labor_role} (${rateEntry.hourly_rate.toFixed(2)}/hr)
                    </option>
                  ))}
                </select>
                {row.role && !hasRate && (
                  <small className="rate-warning">
                    ⚠️ No rate found for this role — labor cost will be $0.00
                  </small>
                )}
              </div>
              <div className="staff-count-cell">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={row.count || ''}
                  onChange={(e) => handleCountChange(index, e.target.value)}
                  className="form-input staff-count-input"
                  placeholder="1"
                />
              </div>
              <div className="staff-rate-cell">
                {hasRate ? (
                  <span className="rate-display">${rate.toFixed(2)}/hr</span>
                ) : (
                  <span className="rate-display no-rate">N/A</span>
                )}
              </div>
              <div className="staff-remove-cell">
                {staffRows.length > parseInt(fieldStaffCount || 1) && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(index)}
                    className="remove-row-btn"
                    title="Remove row"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleAddRow}
        className="add-staff-row-btn"
      >
        ➕ Add Staff Row
      </button>
    </div>
  );
};

export default StaffRows;

