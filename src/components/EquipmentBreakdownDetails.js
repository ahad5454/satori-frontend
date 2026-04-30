import React from 'react';

const EquipmentBreakdownDetails = ({ details }) => {
  if (!details || Object.keys(details).length === 0) {
    return <div style={{ padding: '15px', color: '#666' }}>No equipment details available.</div>;
  }

  return (
    <div className="breakdown-details">
      <div className="breakdown-section">
        <h4 className="breakdown-section-title">Consumables & Materials (Section 1)</h4>
        <div className="breakdown-row total-row">
          <span className="breakdown-label">Section Total</span>
          <span className="breakdown-value">${(details.section_1_total || 0).toFixed(2)}</span>
        </div>
      </div>

      <div className="breakdown-section">
        <h4 className="breakdown-section-title">Equipment & Instrumentation (Section 2)</h4>
        <div className="breakdown-row total-row">
          <span className="breakdown-label">Section Total</span>
          <span className="breakdown-value">${(details.section_2_total || 0).toFixed(2)}</span>
        </div>
      </div>

      <div className="breakdown-section" style={{ marginTop: '20px', borderTop: '2px solid #e0e0e0', paddingTop: '15px' }}>
        <div className="breakdown-row" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
          <span className="breakdown-label">Total Equipment Cost</span>
          <span className="breakdown-value" style={{ color: '#2ecc71' }}>${(details.total_cost || 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default EquipmentBreakdownDetails;
