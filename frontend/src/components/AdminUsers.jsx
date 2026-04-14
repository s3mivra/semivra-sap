import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { updateUser } from '../services/userService'; // Ensure this is imported!
import { Edit2, Trash2, X } from 'lucide-react';

const AdminUserManager = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [divisions, setDivisions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState({ type: '', message: '' });
    
    // 👇 NEW: Track if we are editing an existing user
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: '',
        division: ''
    });

    const loadData = async () => {
        try {
            const [usersRes, rolesRes, divRes] = await Promise.all([
                api.get('/users'),
                api.get('/roles'),
                api.get('/divisions')
            ]);
            setUsers(usersRes.data.data || usersRes.data);
            setRoles(rolesRes.data.data || rolesRes.data);
            setDivisions(divRes.data.data || divRes.data);
        } catch (error) {
            console.error('Failed to load data:', error);
            setStatus({ type: 'error', message: 'Failed to load system data.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    // 👇 NEW: Populate form when Edit is clicked
    const handleEditClick = (user) => {
        setEditingId(user._id);
        setFormData({
            name: user.name,
            email: user.email,
            role: user.role?._id || user.role || '',
            division: user.division?._id || user.division || '',
            password: '' // Never populate passwords! Leave blank unless they want to change it.
        });
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll up to the form
    };

    // 👇 NEW: Cancel Edit Mode
    const cancelEdit = () => {
        setEditingId(null);
        setFormData({ name: '', email: '', password: '', role: '', division: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ type: '', message: '' });

        try {
            if (editingId) {
                // 🔄 EDIT MODE: Send PUT request
                const updatePayload = {
                    name: formData.name,
                    email: formData.email,
                    roleId: formData.role, // Match what your backend expects!
                    division: formData.division
                };
                
                // Only send password if they actually typed a new one
                if (formData.password) updatePayload.password = formData.password;

                await updateUser(editingId, updatePayload);
                setStatus({ type: 'success', message: 'User updated successfully!' });
            } else {
                // ➕ CREATE MODE: Send POST request
                await api.post('/users', formData);
                setStatus({ type: 'success', message: 'User created successfully!' });
            }

            cancelEdit(); // Reset form
            loadData();   // Refresh table
        } catch (error) {
            setStatus({ type: 'error', message: error.response?.data?.message || 'Operation failed.' });
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
        try {
            await api.delete(`/users/${id}`);
            setStatus({ type: 'success', message: 'User deleted.' });
            loadData();
        } catch (error) {
            setStatus({ type: 'error', message: 'Failed to delete user.' });
        }
    };

    if (loading) return <div className="p-6 text-slate-500">Loading User Manager...</div>;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800 mb-6">Manage Users</h2>

            {status.message && (
                <div className={`p-4 mb-6 rounded-lg font-medium text-sm border ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {status.message}
                </div>
            )}

            {/* FORM: Dynamically switches between Create and Edit */}
            <form onSubmit={handleSubmit} className="bg-slate-50 p-5 rounded-lg border border-slate-200 mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-700">
                        {editingId ? '✏️ Edit User' : '➕ Add New User'}
                    </h3>
                    {editingId && (
                        <button type="button" onClick={cancelEdit} className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm font-medium">
                            <X className="w-4 h-4" /> Cancel Edit
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Full Name</label>
                        <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Email Address</label>
                        <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">
                            {editingId ? 'New Password (Leave blank to keep)' : 'Password'}
                        </label>
                        <input type="password" name="password" required={!editingId} value={formData.password} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">System Role</label>
                        <select name="role" required value={formData.role} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                            <option value="">Select a Role...</option>
                            {roles.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Assigned Division</label>
                        <select name="division" value={formData.division} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                            <option value="">Global / No Division</option>
                            {divisions.map(d => <option key={d._id} value={d._id}>{d.divisionName || d.name}</option>)}
                        </select>
                    </div>
                </div>
                <button type="submit" className={`px-4 py-2 text-white font-medium rounded-md shadow-sm transition-colors ${editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                    {editingId ? 'Update User Profile' : 'Create User'}
                </button>
            </form>

            {/* USERS TABLE */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                    <thead>
                        <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                            <th className="p-4 font-semibold">Name</th>
                            <th className="p-4 font-semibold">Email</th>
                            <th className="p-4 font-semibold">Role</th>
                            <th className="p-4 font-semibold">Division</th>
                            <th className="p-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u._id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-4 font-medium text-slate-900">{u.name}</td>
                                <td className="p-4 text-slate-600">{u.email}</td>
                                <td className="p-4">
                                    <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold border border-indigo-100">
                                        {u.role?.name || 'None'}
                                    </span>
                                </td>
                                <td className="p-4 text-slate-600">{u.division?.divisionName || u.division?.name || 'Global'}</td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    
                                    {/* 👇 NEW EDIT BUTTON 👇 */}
                                    <button 
                                        onClick={() => handleEditClick(u)}
                                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md border border-transparent hover:border-amber-200 transition-colors"
                                        title="Edit User"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>

                                    <button 
                                        onClick={() => handleDelete(u._id, u.name)}
                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-md border border-transparent hover:border-red-200 transition-colors"
                                        title="Delete User"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminUserManager;