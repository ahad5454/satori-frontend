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

    if (loading) {
        return (
            <div className="admin-dashboard">
                <div className="admin-loading">Loading users...</div>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            <div className="admin-header">
                <button className="back-button" onClick={() => navigate('/')}>
                    ← Back to Home
                </button>
                <h1>User Management</h1>
                <button className="add-user-btn" onClick={() => setShowAddModal(true)}>
                    + Add New User
                </button>
            </div>

            {error && <div className="admin-error">{error}</div>}

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
        </div>
    );
};

export default AdminDashboard;
