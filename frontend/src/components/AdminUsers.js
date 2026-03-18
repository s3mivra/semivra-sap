import React, { useState, useEffect } from 'react';
import { fetchUsers, createUser, deleteUser } from '../services/userService';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState({ type: '', message: '' });
    
    // Grab current user to prevent them from deleting themselves
    const currentUser = JSON.parse(localStorage.getItem('user')) || {};

    const [userForm, setUserForm] = useState({
        name: '',
        email: '',
        password: '',
        role: 'Cashier' // Default role for safety
    });

    const loadUsers = async () => {
        try {
            const res = await fetchUsers();
            setUsers(res.data);
        } catch (error) {
            setStatus({ type: 'error', message: 'Failed to load users. Are you a Super Admin?' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadUsers(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ type: '', message: '' });
        
        try {
            await createUser(userForm);
            setStatus({ type: 'success', message: `User ${userForm.name} created successfully!` });
            setUserForm({ name: '', email: '', password: '', role: 'Cashier' });
            loadUsers();
        } catch (error) {
            setStatus({ type: 'error', message: error.response?.data?.message || 'Failed to create user.' });
        }
    };

    const handleDelete = async (userId, userName) => {
        if (!window.confirm(`Are you sure you want to permanently delete ${userName}'s account?`)) return;
        
        try {
            await deleteUser(userId);
            setStatus({ type: 'success', message: 'User deleted successfully.' });
            loadUsers();
        } catch (error) {
            setStatus({ type: 'error', message: error.response?.data?.message || 'Failed to delete user.' });
        }
    };

    if (loading) return <div style={{ padding: '20px' }}>Loading User Management...</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
            <h1 style={{ color: '#2c3e50', borderBottom: '2px solid #eee', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                👥 Manage System Users
            </h1>

            {status.message && (
                <div style={{ padding: '15px', marginBottom: '20px', borderRadius: '4px', backgroundColor: status.type === 'success' ? '#e8f8f5' : '#fdedec', color: status.type === 'success' ? '#27ae60' : '#c0392b', fontWeight: 'bold' }}>
                    {status.message}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
                
                {/* LEFT SIDE: Create User Form */}
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', height: 'fit-content' }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#34495e' }}>Add New Employee</h3>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#7f8c8d', marginBottom: '5px' }}>Full Name</label>
                            <input type="text" required value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#7f8c8d', marginBottom: '5px' }}>Email Address</label>
                            <input type="email" required value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#7f8c8d', marginBottom: '5px' }}>Temporary Password</label>
                            <input type="password" required minLength="6" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#7f8c8d', marginBottom: '5px' }}>System Role</label>
                            <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '2px solid #3498db', fontWeight: 'bold', color: '#2c3e50' }}>
                                <option value="Cashier">Cashier (POS Only)</option>
                                <option value="Admin">Admin (Inventory, Purchasing, Analytics)</option>
                                <option value="Super Admin">Super Admin (Full Access & Users)</option>
                            </select>
                        </div>
                        <button type="submit" style={{ padding: '12px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
                            Create Account
                        </button>
                    </form>
                </div>

                {/* RIGHT SIDE: Active Users Directory */}
                <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    <div style={{ backgroundColor: '#f8f9fa', padding: '15px 20px', borderBottom: '1px solid #eee' }}>
                        <h3 style={{ margin: 0, color: '#34495e' }}>Active Directory</h3>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                        <thead style={{ color: '#7f8c8d', backgroundColor: '#fdfefe' }}>
                            <tr>
                                <th style={{ padding: '12px 20px', borderBottom: '2px solid #eee' }}>Name</th>
                                <th style={{ padding: '12px 20px', borderBottom: '2px solid #eee' }}>Email</th>
                                <th style={{ padding: '12px 20px', borderBottom: '2px solid #eee' }}>Role</th>
                                <th style={{ padding: '12px 20px', borderBottom: '2px solid #eee', textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user._id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '12px 20px', fontWeight: 'bold', color: '#2c3e50' }}>{user.name}</td>
                                    <td style={{ padding: '12px 20px', color: '#7f8c8d' }}>{user.email}</td>
                                    <td style={{ padding: '12px 20px' }}>
                                        <span style={{ 
                                            padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                                            backgroundColor: user.role === 'Super Admin' ? '#f5eef8' : user.role === 'Admin' ? '#ebf5fb' : '#eafaf1',
                                            color: user.role === 'Super Admin' ? '#8e44ad' : user.role === 'Admin' ? '#2980b9' : '#27ae60'
                                        }}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                                        {currentUser._id !== user._id && currentUser.id !== user._id ? (
                                            <button 
                                                onClick={() => handleDelete(user._id, user.name)}
                                                style={{ padding: '6px 12px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                            >
                                                Delete
                                            </button>
                                        ) : (
                                            <span style={{ fontSize: '12px', color: '#bdc3c7', fontStyle: 'italic' }}>You</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminUsers;