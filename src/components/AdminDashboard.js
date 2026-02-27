import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userManagementAPI } from '../services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', password: '', role: 'user' });
    const [submitting, setSubmitting] = useState(false);

    // Labor rates state
    const [laborRates, setLaborRates] = useState([]);
    const [laborRatesLoading, setLaborRatesLoading] = useState(true);
    const [editingRateId, setEditingRateId] = useState(null);
    const [editingRate, setEditingRate] = useState({ labor_role: '', hourly_rate: '' });
    const [showAddRateModal, setShowAddRateModal] = useState(false);
    const [newRate, setNewRate] = useState({ labor_role: '', hourly_rate: '' });
    const [rateSubmitting, setRateSubmitting] = useState(false);

    // Active tab
    const [activeTab, setActiveTab] = useState('users');

    // Get token and role from localStorage
    const token = localStorage.getItem('access_token');
    const userRole = localStorage.getItem('user_role');

    useEffect(() => {
        // Check if user is admin
        if (userRole !== 'admin') {
            navigate('/');
            return;
        }
        fetchUsers();
        fetchLaborRates();
    }, [userRole, navigate]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await userManagementAPI.listUsers(token);
            setUsers(data);
            setError(null);
        } catch (err) {
            setError('Failed to load users. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLaborRates = async () => {
        try {
            setLaborRatesLoading(true);
            const data = await userManagementAPI.getLaborRates();
            setLaborRates(data);
        } catch (err) {
            console.error('Error fetching labor rates:', err);
        } finally {
            setLaborRatesLoading(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await userManagementAPI.createUser(newUser, token);
            setShowAddModal(false);
            setNewUser({ email: '', password: '', role: 'user' });
            fetchUsers(); // Refresh list
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create user.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteUser = async (userId, userEmail) => {
        if (!window.confirm(`Are you sure you want to delete ${userEmail}?`)) {
            return;
        }
        try {
            await userManagementAPI.deleteUser(userId, token);
            fetchUsers(); // Refresh list
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to delete user.');
        }
    };

    const getRoleBadgeClass = (role) => {
        switch (role) {
            case 'admin': return 'badge-admin';
            case 'manager': return 'badge-manager';
            default: return 'badge-user';
        }
    };

    // --- Labor Rate Handlers ---
    const handleEditRate = (rate) => {
        setEditingRateId(rate.id);
        setEditingRate({ labor_role: rate.labor_role, hourly_rate: rate.hourly_rate.toString() });
    };

    const handleCancelEdit = () => {
        setEditingRateId(null);
        setEditingRate({ labor_role: '', hourly_rate: '' });
    };

    const handleSaveRate = async (rateId) => {
        try {
            await userManagementAPI.updateLaborRate(rateId, {
                labor_role: editingRate.labor_role,
                hourly_rate: parseFloat(editingRate.hourly_rate)
            });
            setEditingRateId(null);
            setEditingRate({ labor_role: '', hourly_rate: '' });
            fetchLaborRates();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to update labor rate.');
        }
    };

    const handleAddRate = async (e) => {
        e.preventDefault();
        setRateSubmitting(true);
        try {
            await userManagementAPI.createLaborRate({
                labor_role: newRate.labor_role,
                hourly_rate: parseFloat(newRate.hourly_rate)
            });
            setShowAddRateModal(false);
            setNewRate({ labor_role: '', hourly_rate: '' });
            fetchLaborRates();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create labor rate.');
        } finally {
            setRateSubmitting(false);
        }
    };

    const handleDeleteRate = async (rateId, roleName) => {
        if (!window.confirm(`Are you sure you want to delete the "${roleName}" role? This may affect existing estimates.`)) {
            return;
        }
        try {
            await userManagementAPI.deleteLaborRate(rateId);
            fetchLaborRates();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to delete labor rate.');
        }
    };

    if (loading && laborRatesLoading) {
        return (
            <div className="admin-dashboard">
                <div className="admin-loading">Loading...</div>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            <div className="admin-header">
                <button className="back-button" onClick={() => navigate('/')}>
                    ← Back to Home
                </button>
                <h1>Admin Dashboard</h1>
                <div style={{ width: '140px' }}></div>
            </div>

            {error && <div className="admin-error">{error}</div>}

            {/* Tab Navigation */}
            <div className="admin-tabs">
                <button
                    className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    👥 User Management
                </button>
                <button
                    className={`admin-tab ${activeTab === 'rates' ? 'active' : ''}`}
                    onClick={() => setActiveTab('rates')}
                >
                    💰 Staff Titles & Billing Rates
                </button>
            </div>

            {/* User Management Tab */}
            {activeTab === 'users' && (
                <div className="admin-section">
                    <div className="section-header-bar">
                        <h2>User Management</h2>
                        <button className="add-user-btn" onClick={() => setShowAddModal(true)}>
                            + Add New User
                        </button>
                    </div>

                    <div className="users-table-container">
                        <table className="users-table">
                            <thead>
                                <tr>
                                    <th>Email</th>
                                    <th>Username</th>
                                    <th>Role</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id}>
                                        <td>{user.email}</td>
                                        <td>{user.username}</td>
                                        <td>
                                            <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className="delete-btn"
                                                onClick={() => handleDeleteUser(user.id, user.email)}
                                                title="Delete User"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Staff Titles & Billing Rates Tab */}
            {activeTab === 'rates' && (
                <div className="admin-section">
                    <div className="section-header-bar">
                        <h2>Staff Titles & Billing Rates</h2>
                        <button className="add-user-btn" onClick={() => setShowAddRateModal(true)}>
                            + Add New Role
                        </button>
                    </div>
                    <p className="section-description">
                        Manage staff titles and their hourly billing rates. These rates are used across all estimator modules (HRS, Lab Fees, Logistics).
                    </p>

                    {laborRatesLoading ? (
                        <div className="admin-loading">Loading billing rates...</div>
                    ) : (
                        <div className="users-table-container">
                            <table className="users-table">
                                <thead>
                                    <tr>
                                        <th>Staff Title / Role</th>
                                        <th>Hourly Rate</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {laborRates.map((rate) => (
                                        <tr key={rate.id}>
                                            <td>
                                                {editingRateId === rate.id ? (
                                                    <input
                                                        type="text"
                                                        value={editingRate.labor_role}
                                                        onChange={(e) => setEditingRate({ ...editingRate, labor_role: e.target.value })}
                                                        className="inline-edit-input"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span className="rate-role-name">{rate.labor_role}</span>
                                                )}
                                            </td>
                                            <td>
                                                {editingRateId === rate.id ? (
                                                    <div className="rate-edit-field">
                                                        <span className="currency-prefix">$</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={editingRate.hourly_rate}
                                                            onChange={(e) => setEditingRate({ ...editingRate, hourly_rate: e.target.value })}
                                                            className="inline-edit-input rate-input"
                                                        />
                                                        <span className="rate-suffix">/hr</span>
                                                    </div>
                                                ) : (
                                                    <span className="rate-value">${rate.hourly_rate.toFixed(2)}/hr</span>
                                                )}
                                            </td>
                                            <td>
                                                {editingRateId === rate.id ? (
                                                    <div className="action-buttons">
                                                        <button
                                                            className="save-btn"
                                                            onClick={() => handleSaveRate(rate.id)}
                                                            title="Save Changes"
                                                        >
                                                            ✓ Save
                                                        </button>
                                                        <button
                                                            className="cancel-edit-btn"
                                                            onClick={handleCancelEdit}
                                                            title="Cancel"
                                                        >
                                                            ✕ Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="action-buttons">
                                                        <button
                                                            className="edit-btn"
                                                            onClick={() => handleEditRate(rate)}
                                                            title="Edit Rate"
                                                        >
                                                            ✏️ Edit
                                                        </button>
                                                        <button
                                                            className="delete-btn"
                                                            onClick={() => handleDeleteRate(rate.id, rate.labor_role)}
                                                            title="Delete Role"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {laborRates.length === 0 && (
                                        <tr>
                                            <td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                                                No staff roles configured. Click "+ Add New Role" to create one.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Add User Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Add New User</h2>
                        <form onSubmit={handleAddUser}>
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    required
                                    placeholder="user@example.com"
                                />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    required
                                    placeholder="Initial password"
                                    minLength={6}
                                />
                            </div>
                            <div className="form-group">
                                <label>Role</label>
                                <select
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                >
                                    <option value="user">User (Staff)</option>
                                    <option value="manager">Manager</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowAddModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="submit-btn" disabled={submitting}>
                                    {submitting ? 'Creating...' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Rate Modal */}
            {showAddRateModal && (
                <div className="modal-overlay" onClick={() => setShowAddRateModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Add New Staff Role</h2>
                        <form onSubmit={handleAddRate}>
                            <div className="form-group">
                                <label>Staff Title / Role</label>
                                <input
                                    type="text"
                                    value={newRate.labor_role}
                                    onChange={(e) => setNewRate({ ...newRate, labor_role: e.target.value })}
                                    required
                                    placeholder="e.g., Senior Consultant"
                                />
                            </div>
                            <div className="form-group">
                                <label>Hourly Rate ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={newRate.hourly_rate}
                                    onChange={(e) => setNewRate({ ...newRate, hourly_rate: e.target.value })}
                                    required
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowAddRateModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="submit-btn" disabled={rateSubmitting}>
                                    {rateSubmitting ? 'Creating...' : 'Create Role'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
