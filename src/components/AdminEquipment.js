import React, { useState, useEffect } from 'react';
import { equipmentConsumablesAPI } from '../services/api';
import './AdminDashboard.css';

const AdminEquipment = () => {
    const [categories, setCategories] = useState([]);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modals
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showItemModal, setShowItemModal] = useState(false);
    
    const [editingCategory, setEditingCategory] = useState(null);
    const [editingItem, setEditingItem] = useState(null);

    const [categoryForm, setCategoryForm] = useState({ name: '', section: 1 });
    const [itemForm, setItemForm] = useState({ category_id: '', description: '', unit: '', unit_cost: 0 });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [cats, itms] = await Promise.all([
                equipmentConsumablesAPI.getCategories(),
                equipmentConsumablesAPI.getItems()
            ]);
            setCategories(cats);
            setItems(itms);
        } catch (err) {
            console.error(err);
            setError('Failed to load equipment data.');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCategory = async (e) => {
        e.preventDefault();
        try {
            if (editingCategory) {
                await equipmentConsumablesAPI.updateCategory(editingCategory.id, categoryForm);
            } else {
                await equipmentConsumablesAPI.createCategory(categoryForm);
            }
            setShowCategoryModal(false);
            setEditingCategory(null);
            setCategoryForm({ name: '', section: 1 });
            fetchData();
        } catch (err) {
            setError('Failed to save category.');
        }
    };

    const handleDeleteCategory = async (id) => {
        if (!window.confirm('Delete this category and all its items?')) return;
        try {
            await equipmentConsumablesAPI.deleteCategory(id);
            fetchData();
        } catch (err) {
            setError('Failed to delete category.');
        }
    };

    const handleSaveItem = async (e) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await equipmentConsumablesAPI.updateItem(editingItem.id, itemForm);
            } else {
                await equipmentConsumablesAPI.createItem(itemForm);
            }
            setShowItemModal(false);
            setEditingItem(null);
            setItemForm({ category_id: '', description: '', unit: '', unit_cost: 0 });
            fetchData();
        } catch (err) {
            setError('Failed to save item.');
        }
    };

    const handleDeleteItem = async (id) => {
        if (!window.confirm('Delete this item?')) return;
        try {
            await equipmentConsumablesAPI.deleteItem(id);
            fetchData();
        } catch (err) {
            setError('Failed to delete item.');
        }
    };

    const openCategoryModal = (cat = null) => {
        if (cat) {
            setEditingCategory(cat);
            setCategoryForm({ name: cat.name, section: cat.section });
        } else {
            setEditingCategory(null);
            setCategoryForm({ name: '', section: 1 });
        }
        setShowCategoryModal(true);
    };

    const openItemModal = (itm = null) => {
        if (itm) {
            setEditingItem(itm);
            setItemForm({ category_id: itm.category_id, description: itm.description, unit: itm.unit, unit_cost: itm.unit_cost });
        } else {
            setEditingItem(null);
            setItemForm({ category_id: categories.length ? categories[0].id : '', description: '', unit: '', unit_cost: 0 });
        }
        setShowItemModal(true);
    };

    if (loading) return <div>Loading equipment configuration...</div>;

    return (
        <div className="admin-section">
            <div className="section-header-bar">
                <h2>Equipment & Consumables Management</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="add-user-btn" onClick={() => openCategoryModal()}>+ Add Category</button>
                    <button className="add-user-btn" onClick={() => openItemModal()} style={{ backgroundColor: '#3498db' }}>+ Add Item</button>
                </div>
            </div>

            {error && <div className="admin-error">{error}</div>}

            <div className="equipment-admin-container" style={{ display: 'flex', flexDirection: 'column', gap: '30px', marginTop: '20px' }}>
                {[1, 2].map(section => (
                    <div key={section} className="equipment-section">
                        <h3>{section === 1 ? 'Section 1: Consumables & Materials' : 'Section 2: Equipment & Instrumentation'}</h3>
                        
                        {categories.filter(c => c.section === section).map(cat => (
                            <div key={cat.id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '15px', marginBottom: '15px', backgroundColor: '#f9f9f9' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px solid #ddd', paddingBottom: '10px' }}>
                                    <h4 style={{ margin: 0, color: '#2c3e50', fontSize: '1.1rem' }}>{cat.name}</h4>
                                    <div>
                                        <button className="edit-btn" onClick={() => openCategoryModal(cat)} style={{ marginRight: '10px' }}>✏️ Edit</button>
                                        <button className="delete-btn" onClick={() => handleDeleteCategory(cat.id)}>🗑️</button>
                                    </div>
                                </div>
                                
                                <table className="users-table" style={{ marginTop: '10px' }}>
                                    <thead>
                                        <tr>
                                            <th>Description</th>
                                            <th>Unit</th>
                                            <th>Unit Cost</th>
                                            <th style={{ width: '150px' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.filter(i => i.category_id === cat.id).map(item => (
                                            <tr key={item.id}>
                                                <td>{item.description}</td>
                                                <td>{item.unit}</td>
                                                <td>${item.unit_cost.toFixed(2)}</td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button className="edit-btn" onClick={() => openItemModal(item)}>✏️</button>
                                                        <button className="delete-btn" onClick={() => handleDeleteItem(item.id)}>🗑️</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {items.filter(i => i.category_id === cat.id).length === 0 && (
                                            <tr>
                                                <td colSpan="4" style={{ textAlign: 'center', color: '#999', padding: '10px' }}>No items in this category.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Category Modal */}
            {showCategoryModal && (
                <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
                        <form onSubmit={handleSaveCategory}>
                            <div className="form-group">
                                <label>Section</label>
                                <select 
                                    value={categoryForm.section} 
                                    onChange={(e) => setCategoryForm({ ...categoryForm, section: parseInt(e.target.value) })}
                                    required
                                >
                                    <option value={1}>1: Consumables & Materials (10% Flat Rate Allowed)</option>
                                    <option value={2}>2: Equipment & Instrumentation (Itemized Only)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Category Name</label>
                                <input 
                                    type="text" 
                                    value={categoryForm.name} 
                                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                    required
                                    placeholder="e.g. PPE"
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowCategoryModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn">Save Category</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Item Modal */}
            {showItemModal && (
                <div className="modal-overlay" onClick={() => setShowItemModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>{editingItem ? 'Edit Item' : 'Add Item'}</h2>
                        <form onSubmit={handleSaveItem}>
                            <div className="form-group">
                                <label>Category</label>
                                <select 
                                    value={itemForm.category_id} 
                                    onChange={(e) => setItemForm({ ...itemForm, category_id: parseInt(e.target.value) })}
                                    required
                                >
                                    <option value="">-- Select Category --</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.section === 1 ? '[S1]' : '[S2]'} {c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <input 
                                    type="text" 
                                    value={itemForm.description} 
                                    onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                                    required
                                    placeholder="e.g. Tyvek Coveralls"
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Unit</label>
                                    <input 
                                        type="text" 
                                        value={itemForm.unit} 
                                        onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                                        required
                                        placeholder="e.g. Day, Box, Each"
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Unit Cost ($)</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        min="0"
                                        value={itemForm.unit_cost} 
                                        onChange={(e) => setItemForm({ ...itemForm, unit_cost: parseFloat(e.target.value) })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowItemModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn">Save Item</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminEquipment;
