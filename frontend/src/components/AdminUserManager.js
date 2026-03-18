import React, { useEffect, useState } from 'react';
import { fetchUsers, updateUserRole, deleteUser, createUser } from '../services/userService';

const AdminUserManager = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // New form state
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'User' });
    const [formStatus, setFormStatus] = useState({ type: '', message: '' });

    const [status, setStatus] = useState({ type: '', message: '' });

    const loadUsers = async () => {
        try {
            const data = await fetchUsers();
            setUsers(data.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => { loadUsers(); }, []);

    // Handle User Creation
    const handleCreateUser = async (e) => {
        e.preventDefault();
        setFormStatus({ type: '', message: '' });
        try {
            const newUserData = await createUser(formData);
            setUsers([newUserData.data, ...users]); // Add to top of list
            setFormStatus({ type: 'success', message: `Successfully created ${formData.role} account!` });
            setFormData({ name: '', email: '', password: '', role: 'User' }); // Reset form
        } catch (err) {
            setFormStatus({ type: 'error', message: err.response?.data?.message || 'Failed to create user' });
        }
    };

    // Add this near your handleSubmit and handleDelete functions
    const handleRoleChange = async (userId, newRole) => {
        try {
            await updateUserRole(userId, newRole);
            setStatus({ type: 'success', message: 'User role updated successfully!' });
            loadUsers(); // Refresh the table
        } catch (error) {
            setStatus({ type: 'error', message: error.response?.data?.message || 'Failed to update role.' });
        }
    };

    const handleDelete = async (userId) => {
        if (!window.confirm("Are you sure? This cannot be undone.")) return;
        try {
            await deleteUser(userId);
            setUsers(users.filter(u => u._id !== userId));
        } catch (err) { alert('Failed to delete user'); }
    };

    if (loading) return <div>Loading Users...</div>;

    return (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#2c3e50', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                User Management (CRUD)
            </h2>

            {/* CREATE USER FORM */}
            <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #eee' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#34495e' }}>Provision New Account</h3>
                {formStatus.message && (
                    <div style={{ padding: '10px', marginBottom: '15px', borderRadius: '4px', backgroundColor: formStatus.type === 'success' ? '#e8f8f5' : '#fdedec', color: formStatus.type === 'success' ? '#27ae60' : '#c0392b', fontSize: '14px' }}>
                        {formStatus.message}
                    </div>
                )}
                <form onSubmit={handleCreateUser} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Name</label>
                        <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Email</label>
                        <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Password</label>
                        <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: '100px' }}>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Role</label>
                        <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                            <option value="User">User</option>
                            <option value="Admin">Admin</option>
                            <option value="Super Admin">Super Admin</option>
                        </select>
                    </div>
                    <button type="submit" style={{ padding: '9px 15px', backgroundColor: '#2ecc71', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                        Add Account
                    </button>
                </form>
            </div>

            {/* USER TABLE (Same as before) */}
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', color: '#7f8c8d', fontSize: '14px' }}>
                        <th style={{ padding: '12px', borderBottom: '2px solid #eee' }}>Name</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #eee' }}>Email</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #eee' }}>Role</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #eee' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user._id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '12px', fontSize: '14px' }}>{user.name}</td>
                            <td style={{ padding: '12px', fontSize: '14px' }}>{user.email}</td>
                            <td style={{ padding: '12px' }}>
                                <select value={user.role} onChange={(e) => handleRoleChange(user._id, e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}>
                                    <option value="User">User</option>
                                    <option value="Admin">Admin</option>
                                    <option value="Super Admin">Super Admin</option>
                                </select>
                            </td>
                            <td style={{ padding: '12px' }}>
                                <button onClick={() => handleDelete(user._id)} style={{ padding: '6px 12px', backgroundColor: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default AdminUserManager;