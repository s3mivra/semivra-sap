import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Building2, PlusCircle, Power, Loader } from 'lucide-react';

const AdminDivisions = () => {
    const [divisions, setDivisions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({ divisionName: '', divisionCode: '', baseCurrency: 'PHP' });

    const fetchDivisions = async () => {
        try {
            const res = await api.get('/divisions');
            setDivisions(res.data.data || res.data || []);
        } catch (err) {
            console.error("Failed to fetch divisions:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        fetchDivisions(); 
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/divisions', formData);
            setFormData({ divisionName: '', divisionCode: '', baseCurrency: 'PHP' });
            fetchDivisions(); // Refresh the table
        } catch (error) {
            alert(error.response?.data?.message || "Failed to create division");
        }
    };

    const toggleStatus = async (id) => {
        if (!window.confirm("Are you sure you want to toggle this division's access?")) return;
        try {
            await api.put(`/divisions/${id}/toggle`);
            fetchDivisions(); // Refresh the table
        } catch (error) {
            alert("Failed to toggle status");
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center p-8">
            <Loader className="w-6 h-6 animate-spin text-indigo-500" />
            <span className="ml-2 text-slate-600">Loading Division Silos...</span>
        </div>
    );

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-3xl font-light text-slate-900 mb-6 flex items-center gap-3">
                <Building2 className="w-8 h-8 text-indigo-600" /> Enterprise Silo Management
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* LEFT: CREATE FORM */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
                    <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <PlusCircle className="w-4 h-4 text-indigo-600" /> Initialize New Division
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Division Name</label>
                            <input 
                                required type="text" placeholder="e.g., Semivra Cebu" 
                                value={formData.divisionName} 
                                onChange={(e) => setFormData({...formData, divisionName: e.target.value})} 
                                className="w-full border border-slate-300 p-2 rounded text-sm outline-none focus:border-indigo-500" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Division Code (Unique)</label>
                            <input 
                                required type="text" placeholder="e.g., CEB-01" 
                                value={formData.divisionCode} 
                                onChange={(e) => setFormData({...formData, divisionCode: e.target.value.toUpperCase()})} 
                                className="w-full border border-slate-300 p-2 rounded text-sm outline-none focus:border-indigo-500 uppercase font-mono" 
                            />
                        </div>
                        <button type="submit" className="w-full bg-slate-800 text-white font-bold py-3 rounded hover:bg-slate-900 transition-colors mt-2">
                            Deploy Database Silo
                        </button>
                    </form>
                </div>

                {/* RIGHT: DIVISION TABLE */}
                <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                            <tr>
                                <th className="p-4 font-semibold">Division Code</th>
                                <th className="p-4 font-semibold">Division Name</th>
                                <th className="p-4 font-semibold text-center">Status</th>
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {divisions.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-slate-400 italic">
                                        No divisions initialized yet.
                                    </td>
                                </tr>
                            ) : (
                                divisions.map((div) => (
                                    <tr key={div._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-mono font-bold text-slate-700">{div.divisionCode}</td>
                                        <td className="p-4 font-medium text-slate-900">{div.divisionName}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-[10px] tracking-wider font-bold uppercase ${div.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                {div.isActive ? 'Active' : 'Offline'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => toggleStatus(div._id)} 
                                                title={div.isActive ? "Deactivate Division" : "Activate Division"}
                                                className={`p-2 rounded transition-colors ${div.isActive ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                            >
                                                <Power className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDivisions;