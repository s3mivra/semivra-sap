import React, { useState, useEffect } from 'react';
import { fetchBusinessUnits, createBusinessUnit, fetchDepartments, createDepartment, fetchRoles, createRole } from '../services/orgService';
import { Building2, Network, ShieldCheck, Plus, CheckCircle, AlertCircle, Loader } from 'lucide-react';

// The master list of every permission your system will ever have
const AVAILABLE_PERMISSIONS = [
    'view_sales', 'create_sales', 'edit_sales', 'delete_sales',
    'view_inventory', 'manage_inventory', 'transfer_inventory',
    'view_reports', 'manage_users', 'manage_system'
];

const AdminOrganization = () => {
    const [activeTab, setActiveTab] = useState('units'); // 'units', 'departments', 'roles'
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState({ type: '', message: '' });

    // Data State
    const [businessUnits, setBusinessUnits] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [roles, setRoles] = useState([]);

    // Form States
    const [buForm, setBuForm] = useState({ name: '', code: '' });
    const [deptForm, setDeptForm] = useState({ name: '', code: '', businessUnitId: '' });
    const [roleForm, setRoleForm] = useState({ name: '', level: 10, permissions: [] });

    const loadData = async () => {
        try {
            const [buRes, deptRes, roleRes] = await Promise.all([
                fetchBusinessUnits(), fetchDepartments(), fetchRoles()
            ]);
            setBusinessUnits(buRes.data.data);
            setDepartments(deptRes.data.data);
            setRoles(roleRes.data.data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to load org data", error);
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // Form Handlers
    const handleCreateBU = async (e) => {
        e.preventDefault();
        try {
            await createBusinessUnit(buForm);
            setStatus({ type: 'success', message: 'Business Unit created!' });
            setBuForm({ name: '', code: '' });
            loadData();
        } catch (err) { setStatus({ type: 'error', message: err.response?.data?.error || 'Failed to create BU' }); }
    };

    const handleCreateDept = async (e) => {
        e.preventDefault();
        try {
            await createDepartment(deptForm);
            setStatus({ type: 'success', message: 'Department created!' });
            setDeptForm({ name: '', code: '', businessUnitId: '' });
            loadData();
        } catch (err) { setStatus({ type: 'error', message: err.response?.data?.error || 'Failed to create Dept' }); }
    };

    const handleCreateRole = async (e) => {
        e.preventDefault();
        try {
            await createRole(roleForm);
            setStatus({ type: 'success', message: 'Role created!' });
            setRoleForm({ name: '', level: 10, permissions: [] });
            loadData();
        } catch (err) { setStatus({ type: 'error', message: err.response?.data?.error || 'Failed to create Role' }); }
    };

    const togglePermission = (perm) => {
        if (roleForm.permissions.includes(perm)) {
            setRoleForm({ ...roleForm, permissions: roleForm.permissions.filter(p => p !== perm) });
        } else {
            setRoleForm({ ...roleForm, permissions: [...roleForm.permissions, perm] });
        }
    };

    if (loading) return <div className="p-8 flex items-center justify-center"><Loader className="animate-spin text-blue-500 w-8 h-8" /></div>;

    return (
        <div className="bg-slate-50 min-h-screen p-6 max-w-7xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-light text-slate-900 flex items-center gap-3">
                    <Network className="w-8 h-8 text-blue-600" />
                    Organization Architect
                </h1>
                <p className="text-slate-500 mt-2">Design your company's hierarchy, departments, and granular access roles.</p>
            </header>

            {status.message && (
                <div className={`p-4 mb-6 rounded-lg flex items-center gap-2 font-medium ${status.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {status.message}
                </div>
            )}

            {/* Custom Tabs */}
            <div className="flex border-b border-slate-200 mb-6 gap-6">
                <button onClick={() => setActiveTab('units')} className={`pb-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'units' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                    <div className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Business Units</div>
                </button>
                <button onClick={() => setActiveTab('departments')} className={`pb-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'departments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                    <div className="flex items-center gap-2"><Network className="w-4 h-4" /> Departments</div>
                </button>
                <button onClick={() => setActiveTab('roles')} className={`pb-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'roles' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                    <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Roles & Permissions</div>
                </button>
            </div>

            {/* TAB CONTENT: BUSINESS UNITS */}
            {activeTab === 'units' && (
                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                        <h3 className="font-bold text-slate-900 mb-4">New Business Unit</h3>
                        <form onSubmit={handleCreateBU} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Unit Name (e.g., Semivra Coffee)</label>
                                <input type="text" required value={buForm.name} onChange={e => setBuForm({...buForm, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Short Code (e.g., COF)</label>
                                <input type="text" required value={buForm.code} onChange={e => setBuForm({...buForm, code: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 flex justify-center items-center gap-2"><Plus className="w-4 h-4"/> Create Unit</button>
                        </form>
                    </div>
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                <tr><th className="p-4">Name</th><th className="p-4">Code</th><th className="p-4">Created</th></tr>
                            </thead>
                            <tbody>
                                {businessUnits.map(bu => (
                                    <tr key={bu._id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="p-4 font-bold text-slate-900">{bu.name}</td>
                                        <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded font-mono text-xs">{bu.code}</span></td>
                                        <td className="p-4 text-slate-500">{new Date(bu.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: DEPARTMENTS */}
            {activeTab === 'departments' && (
                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                        <h3 className="font-bold text-slate-900 mb-4">New Department</h3>
                        <form onSubmit={handleCreateDept} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Parent Business Unit</label>
                                <select required value={deptForm.businessUnitId} onChange={e => setDeptForm({...deptForm, businessUnitId: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500">
                                    <option value="">-- Select Unit --</option>
                                    {businessUnits.map(bu => <option key={bu._id} value={bu._id}>{bu.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Department Name (e.g., Sales)</label>
                                <input type="text" required value={deptForm.name} onChange={e => setDeptForm({...deptForm, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Code (e.g., SLS)</label>
                                <input type="text" required value={deptForm.code} onChange={e => setDeptForm({...deptForm, code: e.target.value})} className="w-full p-2 border border-slate-300 rounded" />
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 flex justify-center items-center gap-2"><Plus className="w-4 h-4"/> Create Department</button>
                        </form>
                    </div>
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                <tr><th className="p-4">Department</th><th className="p-4">Code</th><th className="p-4">Business Unit</th></tr>
                            </thead>
                            <tbody>
                                {departments.map(dept => (
                                    <tr key={dept._id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="p-4 font-bold text-slate-900">{dept.name}</td>
                                        <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded font-mono text-xs">{dept.code}</span></td>
                                        <td className="p-4 text-blue-600 text-xs font-bold">{dept.businessUnit?.name || 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: ROLES & PERMISSIONS */}
            {activeTab === 'roles' && (
                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                        <h3 className="font-bold text-slate-900 mb-4">Define Custom Role</h3>
                        <form onSubmit={handleCreateRole} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Role Title (e.g., Warehouse Manager)</label>
                                <input type="text" required value={roleForm.name} onChange={e => setRoleForm({...roleForm, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Hierarchy Level (1-100, 100 is God Mode)</label>
                                <input type="number" required min="1" max="100" value={roleForm.level} onChange={e => setRoleForm({...roleForm, level: Number(e.target.value)})} className="w-full p-2 border border-slate-300 rounded" />
                            </div>
                            
                            <div className="pt-2 border-t border-slate-200">
                                <label className="block text-xs font-bold text-slate-900 mb-3">Assign Permissions</label>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                    {AVAILABLE_PERMISSIONS.map(perm => (
                                        <label key={perm} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1 rounded">
                                            <input type="checkbox" checked={roleForm.permissions.includes(perm)} onChange={() => togglePermission(perm)} className="rounded text-blue-600" />
                                            <span className="text-slate-700 font-mono text-xs">{perm}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded font-bold hover:bg-slate-900 flex justify-center items-center gap-2"><ShieldCheck className="w-4 h-4"/> Save Role</button>
                        </form>
                    </div>
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                <tr><th className="p-4">Role</th><th className="p-4 text-center">Level</th><th className="p-4">Permissions Configured</th></tr>
                            </thead>
                            <tbody>
                                {roles.map(role => (
                                    <tr key={role._id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="p-4 font-bold text-slate-900">{role.name}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${role.level >= 80 ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                                Lvl {role.level}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-1">
                                                {role.permissions.map(p => (
                                                    <span key={p} className="bg-slate-100 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-mono">{p}</span>
                                                ))}
                                            </div>
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

export default AdminOrganization;