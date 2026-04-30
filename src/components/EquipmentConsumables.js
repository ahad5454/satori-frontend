import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { equipmentConsumablesAPI, estimateSnapshotAPI } from '../services/api';
import ProjectHeader from './ProjectHeader';
import './EquipmentConsumables.css';

const EquipmentConsumables = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { project, handleProjectNotFound } = useProject();

    const [categories, setCategories] = useState([]);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [estimationResult, setEstimationResult] = useState(null);

    // State for order details
    // quantities: { itemId: quantity }
    const [quantities, setQuantities] = useState({});
    // flatRates: { categoryId: boolean }
    const [flatRates, setFlatRates] = useState({});

    // Fetch master data
    useEffect(() => {
        const fetchMasterData = async () => {
            try {
                const [cats, itms] = await Promise.all([
                    equipmentConsumablesAPI.getCategories(),
                    equipmentConsumablesAPI.getItems()
                ]);
                setCategories(cats);
                setItems(itms);
            } catch (err) {
                console.error('Error fetching equipment master data:', err);
                setError('Failed to load equipment catalog. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchMasterData();
    }, []);

    // Rehydrate from snapshot
    useEffect(() => {
        if (location.pathname !== '/equipment') return;
        if (!project?.name) return;
        if (loading) return; // wait for master data

        const loadSnapshotData = async () => {
            try {
                const snapshot = await estimateSnapshotAPI.getLatestSnapshot(project.name);
                if (!snapshot || !snapshot.equipment_data) return;

                const inputs = snapshot.equipment_data.inputs || {};
                const outputs = snapshot.equipment_data.outputs || {};
                
                const orderDetails = inputs.order_details || outputs.order_details || {};
                
                // orderDetails format: 
                // {
                //   category_id: {
                //     is_flat_rate: true/false,
                //     items: { item_id: qty }
                //   }
                // }
                
                const newQuantities = {};
                const newFlatRates = {};

                Object.keys(orderDetails).forEach(catId => {
                    const catData = orderDetails[catId];
                    newFlatRates[catId] = catData.is_flat_rate;
                    if (catData.items) {
                        Object.keys(catData.items).forEach(itemId => {
                            newQuantities[itemId] = catData.items[itemId];
                        });
                    }
                });

                setQuantities(newQuantities);
                setFlatRates(newFlatRates);

                if (outputs.id) {
                    setEstimationResult(outputs);
                }
            } catch (error) {
                console.error('Error loading snapshot data:', error);
                if (error.response?.status === 404) {
                    handleProjectNotFound();
                }
            }
        };

        loadSnapshotData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project?.name, location.pathname, loading]);

    // Handle Quantity Change
    const handleQuantityChange = (itemId, val) => {
        const qty = parseFloat(val);
        setQuantities(prev => ({
            ...prev,
            [itemId]: isNaN(qty) ? '' : qty
        }));
    };

    // Handle Flat Rate Toggle
    const handleFlatRateToggle = (categoryId, checked) => {
        setFlatRates(prev => ({
            ...prev,
            [categoryId]: checked
        }));
    };

    // Calculate sum of base unit costs for a category
    const calculateCategoryBaseSum = (categoryId) => {
        return items
            .filter(i => i.category_id === categoryId)
            .reduce((sum, item) => sum + item.unit_cost, 0);
    };

    // Calculate total cost for a specific category
    const calculateCategoryTotal = (category) => {
        const isFlatRate = flatRates[category.id] || false;
        
        if (isFlatRate && category.section === 1) {
            // Take 10% of the sum of the base unit costs
            const baseSum = calculateCategoryBaseSum(category.id);
            return baseSum * 0.10;
        }

        // Otherwise sum up quantity * unit_cost
        const categoryItems = items.filter(i => i.category_id === category.id);
        return categoryItems.reduce((sum, item) => {
            const qty = quantities[item.id] || 0;
            return sum + (qty * item.unit_cost);
        }, 0);
    };

    // Calculate Section Totals
    const calculateSectionTotal = (sectionId) => {
        const sectionCategories = categories.filter(c => c.section === sectionId);
        return sectionCategories.reduce((sum, cat) => sum + calculateCategoryTotal(cat), 0);
    };

    const section1Total = calculateSectionTotal(1);
    const section2Total = calculateSectionTotal(2);
    const grandTotal = section1Total + section2Total;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            // Build order_details JSON payload
            const orderDetails = {};
            
            categories.forEach(cat => {
                const isFlatRate = flatRates[cat.id] || false;
                const catItems = {};
                
                items.filter(i => i.category_id === cat.id).forEach(item => {
                    const qty = quantities[item.id] || 0;
                    if (qty > 0) {
                        catItems[item.id] = qty;
                    }
                });

                // Only include category in order_details if it has flat rate enabled OR has items with quantities
                if (isFlatRate || Object.keys(catItems).length > 0) {
                    orderDetails[cat.id] = {
                        is_flat_rate: isFlatRate,
                        items: catItems,
                        category_total: calculateCategoryTotal(cat)
                    };
                }
            });

            const payload = {
                project_name: project?.name,
                section_1_total: section1Total,
                section_2_total: section2Total,
                total_cost: grandTotal,
                order_details: orderDetails
            };

            const result = await equipmentConsumablesAPI.createOrder(payload);
            setEstimationResult(result);
            window.scrollTo(0, document.body.scrollHeight);
        } catch (err) {
            console.error('Error generating equipment estimation:', err);
            setError(err.response?.data?.detail || 'Failed to save estimation.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="equipment-container">
                <nav className="equipment-nav">
                    <Link to="/" className="nav-link">Home</Link>
                    <h1>Consumables & Equipment</h1>
                    <div style={{width: 100}}></div>
                </nav>
                <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2rem', color: '#666' }}>
                    Loading catalog data...
                </div>
            </div>
        );
    }

    return (
        <div className="equipment-container">
            <nav className="equipment-nav">
                <Link to="/" className="nav-link">Home</Link>
                <h1>Consumables & Equipment</h1>
                <button
                    className="view-estimations-btn"
                    onClick={() => navigate('/previous-estimates')}
                    style={{ padding: '8px 16px', background: 'transparent', border: '2px solid #3498db', color: '#3498db', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                >
                    View Previous Estimates
                </button>
            </nav>

            <ProjectHeader projectName={project?.name} moduleName="equipment" />

            <form onSubmit={handleSubmit}>
                {/* Section 1: Consumables & Materials */}
                <div className="equipment-section">
                    <h2>Section 1: Consumables & Materials</h2>
                    <p style={{ color: '#64748b', marginBottom: '20px' }}>
                        For each category, you can enter itemized quantities, OR select the "10% Flat Rate" option for a quick block estimate.
                    </p>
                    
                    {categories.filter(c => c.section === 1).map(category => {
                        const isFlatRate = flatRates[category.id] || false;
                        const categoryItems = items.filter(i => i.category_id === category.id);
                        const categoryTotal = calculateCategoryTotal(category);
                        const baseSum = calculateCategoryBaseSum(category.id);
                        
                        return (
                            <div key={category.id} className="equipment-category">
                                <div className="category-header">
                                    <h3>{category.name}</h3>
                                    <div className="flat-rate-toggle">
                                        <input 
                                            type="checkbox" 
                                            id={`flat-rate-${category.id}`}
                                            checked={isFlatRate}
                                            onChange={(e) => handleFlatRateToggle(category.id, e.target.checked)}
                                        />
                                        <label htmlFor={`flat-rate-${category.id}`}>Use 10% Flat Rate</label>
                                    </div>
                                </div>
                                
                                {isFlatRate && (
                                    <div className="flat-rate-active-notice">
                                        10% Flat Rate Active: Taking 10% of the sum of base unit costs (${baseSum.toFixed(2)} * 10% = ${categoryTotal.toFixed(2)}).
                                        <br/><small style={{opacity: 0.8}}>Manual quantities are ignored while flat rate is active.</small>
                                    </div>
                                )}
                                
                                <table className="equipment-table">
                                    <thead>
                                        <tr>
                                            <th>Description</th>
                                            <th>Unit</th>
                                            <th>Unit Cost</th>
                                            <th style={{ width: '120px' }}>Quantity</th>
                                            <th style={{ width: '120px', textAlign: 'right' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {categoryItems.map(item => {
                                            const qty = quantities[item.id] || 0;
                                            const itemTotal = qty * item.unit_cost;
                                            
                                            return (
                                                <tr key={item.id} style={{ opacity: isFlatRate ? 0.5 : 1 }}>
                                                    <td>{item.description}</td>
                                                    <td>{item.unit}</td>
                                                    <td>${item.unit_cost.toFixed(2)}</td>
                                                    <td>
                                                        <input 
                                                            type="number"
                                                            className="qty-input"
                                                            min="0"
                                                            step="0.5"
                                                            value={qty === 0 ? '' : qty}
                                                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                            disabled={isFlatRate}
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 500 }}>
                                                        ${isFlatRate ? '0.00' : itemTotal.toFixed(2)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {categoryItems.length === 0 && (
                                            <tr><td colSpan="5" style={{textAlign: 'center', color: '#999'}}>No items available in this category.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                                
                                <div className="category-summary">
                                    <span className="category-total-label">Category Subtotal:</span>
                                    <span className="category-total-value">${categoryTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        );
                    })}
                    
                    <div style={{ textAlign: 'right', fontSize: '1.3rem', fontWeight: 'bold', color: '#2c3e50', marginTop: '20px' }}>
                        Section 1 Total: <span style={{ color: '#3498db' }}>${section1Total.toFixed(2)}</span>
                    </div>
                </div>

                {/* Section 2: Equipment & Instrumentation */}
                <div className="equipment-section">
                    <h2>Section 2: Equipment & Instrumentation</h2>
                    <p style={{ color: '#64748b', marginBottom: '20px' }}>
                        Itemized entry only. Enter required quantities for instrumentation.
                    </p>
                    
                    {categories.filter(c => c.section === 2).map(category => {
                        const categoryItems = items.filter(i => i.category_id === category.id);
                        const categoryTotal = calculateCategoryTotal(category);
                        
                        return (
                            <div key={category.id} className="equipment-category">
                                <div className="category-header">
                                    <h3>{category.name}</h3>
                                </div>
                                
                                <table className="equipment-table">
                                    <thead>
                                        <tr>
                                            <th>Description</th>
                                            <th>Unit</th>
                                            <th>Unit Cost</th>
                                            <th style={{ width: '120px' }}>Quantity</th>
                                            <th style={{ width: '120px', textAlign: 'right' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {categoryItems.map(item => {
                                            const qty = quantities[item.id] || 0;
                                            const itemTotal = qty * item.unit_cost;
                                            
                                            return (
                                                <tr key={item.id}>
                                                    <td>{item.description}</td>
                                                    <td>{item.unit}</td>
                                                    <td>${item.unit_cost.toFixed(2)}</td>
                                                    <td>
                                                        <input 
                                                            type="number"
                                                            className="qty-input"
                                                            min="0"
                                                            step="0.5"
                                                            value={qty === 0 ? '' : qty}
                                                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 500 }}>
                                                        ${itemTotal.toFixed(2)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {categoryItems.length === 0 && (
                                            <tr><td colSpan="5" style={{textAlign: 'center', color: '#999'}}>No items available in this category.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                                
                                <div className="category-summary">
                                    <span className="category-total-label">Category Subtotal:</span>
                                    <span className="category-total-value">${categoryTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        );
                    })}
                    
                    <div style={{ textAlign: 'right', fontSize: '1.3rem', fontWeight: 'bold', color: '#2c3e50', marginTop: '20px' }}>
                        Section 2 Total: <span style={{ color: '#3498db' }}>${section2Total.toFixed(2)}</span>
                    </div>
                </div>

                {error && <div className="error-message">{error}</div>}

                <button type="submit" className="submit-btn" disabled={submitting}>
                    {submitting ? 'Saving Order...' : 'Generate Equipment Estimate'}
                </button>
            </form>

            {estimationResult && (
                <div className="results-card">
                    <h2>Equipment & Consumables Summary</h2>
                    <div className="results-row">
                        <span>Section 1 (Consumables & Materials)</span>
                        <span>${estimationResult.section_1_total.toFixed(2)}</span>
                    </div>
                    <div className="results-row">
                        <span>Section 2 (Equipment & Instrumentation)</span>
                        <span>${estimationResult.section_2_total.toFixed(2)}</span>
                    </div>
                    <div className="results-total">
                        <span>Grand Total</span>
                        <span>${estimationResult.total_cost.toFixed(2)}</span>
                    </div>
                    <div style={{ marginTop: '20px', color: '#cbd5e1', fontSize: '0.9rem' }}>
                        * This total has been synchronized to the Project Estimate Summary.
                    </div>
                </div>
            )}
        </div>
    );
};

export default EquipmentConsumables;
