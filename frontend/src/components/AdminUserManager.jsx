import React, { useEffect, useState } from 'react';
import { fetchUsers, deleteUser } from '../services/userService';
import api from '../services/api'; 
import { Users, UserPlus, Trash2, CheckCircle, AlertCircle, Loader, Shield, PlusCircle, ShieldCheck } from 'lucide-react';

// Define the available permissions for your ERP
const AVAILABLE_PERMISSIONS = [
    'View Reports', 'Manage Inventory', 'Process Sales', 
    'Approve POs', 'Manage Ledger', 'Configure Taxes'
];

const AdminUserManager = () => {
    // 🎛️ UI State
    const [activeTab, setActiveTab] = useState('users'); // 'users' or 'roles'
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    // 🗄️ Data State
    const [users, setUsers] = useState([]);
    const [divisions, setDivisions] = useState([]);
    const [roles, setRoles] = useState([]);
    
    // 📝 Form States
    const [userFormData, setUserFormData] = useState({ name: '', email: '', password: '', roleId: '', division: '' });
    const [roleFormData, setRoleFormData] = useState({ name: '', level: 10, permissions: [] });

    const loadData = async () => {
        try {
            const [usersRes, divRes, roleRes] = await Promise.all([
                fetchUsers(), 
                api.get('/divisions'), 
                api.get('/roles') // Now using standard API call for roles
            ]);
            
            setUsers(usersRes.data.data || usersRes.data || []); 
            setDivisions(divRes.data.data || []);
            setRoles(roleRes.data.data || []);
            
            if (roleRes.data.data?.length > 0 && !userFormData.roleId) {
                setUserFormData(prev => ({ ...prev, roleId: roleRes.data.data[0]._id }));
            }
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // ==========================================
    // USER MANAGEMENT LOGIC
    // ==========================================
    const handleCreateUser = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        
        const selectedRole = roles.find(r => r._id === userFormData.roleId);
        if (selectedRole && selectedRole.level !== 100 && !userFormData.division) {
            return setMessage({ type: 'error', text: 'A Division is required for all non-Super Admin users.' });
        }

        try {
            await api.post('/users', userFormData); 
            setMessage({ type: 'success', text: `Account created successfully!` });
            setUserFormData({ name: '', email: '', password: '', roleId: userFormData.roleId, division: '' }); 
            loadData();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to create user' });
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            await deleteUser(userId);
            setUsers(users.filter(u => u._id !== userId));
        } catch (err) { alert('Failed to delete user'); }
    };

    // ==========================================
    // ROLE MANAGEMENT LOGIC
    // ==========================================
    const handlePermissionToggle = (permission) => {
        setRoleFormData(prev => {
            const newPerms = prev.permissions.includes(permission)
                ? prev.permissions.filter(p => p !== permission)
                : [...prev.permissions, permission];
            return { ...prev, permissions: newPerms };
        });
    };

    const handleCreateRole = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        try {
            await api.post('/roles', roleFormData);
            setMessage({ type: 'success', text: `Role "${roleFormData.name}" created successfully!` });
            setRoleFormData({ name: '', level: 10, permissions: [] });
            loadData();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to create role' });
        }
    };

    const handleDeleteRole = async (roleId) => {
        if (!window.confirm("WARNING: Deleting a role may break users currently assigned to it. Proceed?")) return;
        try {
            await api.delete(`/roles/${roleId}`);
            setRoles(roles.filter(r => r._id !== roleId));
        } catch (err) { 
            alert(err.response?.data?.message || 'Failed to delete role'); 
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center p-8">
            <Loader className="w-6 h-6 animate-spin text-indigo-500" />
            <span className="ml-2 text-slate-600">Loading IAM System...</span>
        </div>
    );

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8 max-w-7xl mx-auto">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    <ShieldCheck className="w-8 h-8 text-indigo-600" />
                    <h2 className="text-2xl font-light text-slate-900 m-0">Identity & Access</h2>
                </div>
                
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => { setActiveTab('users'); setMessage({type:'', text:''}); }}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Users className="w-4 h-4" /> User Accounts
                    </button>
                    <button 
                        onClick={() => { setActiveTab('roles'); setMessage({type:'', text:''}); }}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'roles' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Shield className="w-4 h-4" /> Security Roles
                    </button>
                </div>
            </div>

            {/* Global Message Banner */}
            {message.text && (
                <div className={`p-4 rounded-lg mb-6 flex items-center gap-2 text-sm font-bold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {message.text}
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 1: USERS */}
            {/* ========================================================================= */}
            {activeTab === 'users' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-indigo-600" /> Provision New Account
                        </h3>
                        <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Full Name</label>
                                <input type="text" required value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Email Address</label>
                                <input type="email" required value={userFormData.email} onChange={e => setUserFormData({...userFormData, email: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Temporary Password</label>
                                <input type="password" required minLength="6" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none" />
                            </div>
                            <div className="border-t border-slate-200 pt-4 md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Assign Role</label>
                                    <select required value={userFormData.roleId} onChange={e => setUserFormData({...userFormData, roleId: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none">
                                        <option value="">-- Select Role --</option>
                                        {roles.map(r => <option key={r._id} value={r._id}>{r.name} (Lvl {r.level})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Assign Division (Data Silo)</label>
                                    <select value={userFormData.division} onChange={e => setUserFormData({...userFormData, division: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none">
                                        <option value="">-- Global Access (Super Admin Only) --</option>
                                        {divisions.map(div => <option key={div._id} value={div._id}>{div.divisionCode} - {div.divisionName}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="md:col-span-2 lg:col-span-3 mt-2">
                                <button type="submit" className="w-full py-3 bg-slate-800 text-white rounded font-bold hover:bg-slate-900 transition-colors">
                                    Create User
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                <tr>
                                    <th className="p-4 font-bold">Employee</th>
                                    <th className="p-4 font-bold">Security Role</th>
                                    <th className="p-4 font-bold">Division Silo</th>
                                    <th className="p-4 font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map(user => (
                                    <tr key={user._id} className="hover:bg-slate-50">
                                        <td className="p-4">
                                            <div className="font-bold text-slate-900">{user.name}</div>
                                            <div className="text-xs text-slate-500">{user.email}</div>
                                        </td>
                                        <td className="p-4">
                                            {user.role ? (
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${user.role.level >= 80 ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                                    {user.role.name}
                                                </span>
                                            ) : <span className="text-rose-500 text-xs italic">Missing</span>}
                                        </td>
                                        <td className="p-4">
                                            {user.division ? (
                                                <span className="font-medium text-slate-700 text-xs">{user.division.divisionName || user.division.divisionCode}</span>
                                            ) : <span className="text-slate-400 italic text-xs">Global Access</span>}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => handleDeleteUser(user._id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: ROLES */}
            {/* ========================================================================= */}
            {activeTab === 'roles' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <PlusCircle className="w-5 h-5 text-indigo-600" /> Define New Role
                        </h3>
                        <form onSubmit={handleCreateRole} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Role Name</label>
                                    <input type="text" required placeholder="e.g., Senior Accountant" value={roleFormData.name} onChange={e => setRoleFormData({...roleFormData, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Clearance Level (1-100)</label>
                                    <input type="number" required min="1" max="100" value={roleFormData.level} onChange={e => setRoleFormData({...roleFormData, level: parseInt(e.target.value)})} className="w-full p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none" />
                                    <p className="text-[10px] text-slate-500 mt-1">Level 100 bypasses all permission checks (God Mode).</p>
                                </div>
                            </div>
                            
                            {/* Permission Toggles */}
                            <div className="pt-2">
                                <label className="block text-xs font-bold text-slate-600 mb-2">Module Permissions</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {AVAILABLE_PERMISSIONS.map(perm => (
                                        <label key={perm} className="flex items-center gap-2 p-2 border border-slate-200 bg-white rounded cursor-pointer hover:bg-slate-50 transition-colors">
                                            <input 
                                                type="checkbox" 
                                                checked={roleFormData.permissions.includes(perm)}
                                                onChange={() => handlePermissionToggle(perm)}
                                                className="w-4 h-4 text-indigo-600 rounded"
                                            />
                                            <span className="text-sm font-medium text-slate-700">{perm}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <button type="submit" className="w-full mt-4 py-3 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 transition-colors">
                                Save Security Role
                            </button>
                        </form>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-800 text-white">
                                <tr>
                                    <th className="p-4 font-bold">Role Title</th>
                                    <th className="p-4 font-bold text-center">Clearance Level</th>
                                    <th className="p-4 font-bold">Active Permissions</th>
                                    <th className="p-4 font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {roles.map(role => (
                                    <tr key={role._id} className="hover:bg-slate-50">
                                        <td className="p-4 font-bold text-slate-900">{role.name}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-black ${role.level === 100 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                                                LVL {role.level}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {role.level === 100 ? (
                                                <span className="text-xs font-bold text-amber-600">God Mode (Bypasses Checks)</span>
                                            ) : (
                                                <div className="flex flex-wrap gap-1">
                                                    {role.permissions?.length > 0 ? role.permissions.map((p, idx) => (
                                                        <span key={idx} className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-bold">
                                                            {p}
                                                        </span>
                                                    )) : <span className="text-xs text-slate-400 italic">No permissions assigned</span>}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            {role.level !== 100 && (
                                                <button onClick={() => handleDeleteRole(role._id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUserManager;