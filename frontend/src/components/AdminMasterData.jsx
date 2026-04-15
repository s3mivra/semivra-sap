import React, { useState, useEffect } from 'react';
import { fetchCategories, createCategory, updateCategory, deleteCategory } from '../services/categoryService';
import { fetchUnits, createUnit, updateUnit, deleteUnit } from '../services/inventoryService'; 
import { Edit2, Trash2, X, Database, Plus, Loader, CheckCircle, AlertTriangle } from 'lucide-react';

const AdminMasterData = () => {
    const [categories, setCategories] = useState([]);
    const [units, setUnits] = useState([]);
    
    // Loading States
    const [loading, setLoading] = useState(true);
    const [submittingCat, setSubmittingCat] = useState(false);
    const [submittingUnit, setSubmittingUnit] = useState(false);
    
    const [status, setStatus] = useState({ type: '', message: '' });

    // 🛡️ THE FIX: Added 'code' to the category form state
    const [categoryForm, setCategoryForm] = useState({ name: '', code: '', description: '' });
    const [unitForm, setUnitForm] = useState({ name: '', abbreviation: '' });

    const [editingCatId, setEditingCatId] = useState(null);
    const [editingUnitId, setEditingUnitId] = useState(null);

    const loadData = async () => {
        try {
            const [catData, unitData] = await Promise.all([
                fetchCategories(),
                fetchUnits()
            ]);
            
            const extractArray = (res) => {
                if (Array.isArray(res)) return res;
                if (res?.data && Array.isArray(res.data)) return res.data;
                if (res?.data?.data && Array.isArray(res.data.data)) return res.data.data;
                return [];
            };

            setCategories(extractArray(catData));
            setUnits(extractArray(unitData));

        } catch (error) {
            console.error('Failed to load master data:', error);
            setStatus({ type: 'error', message: 'Network error: Failed to fetch master data.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // --- HANDLERS ---
    const handleCategorySubmit = async (e) => {
        e.preventDefault();
        setSubmittingCat(true);
        setStatus({ type: '', message: '' });
        try {
            await createCategory(categoryForm);
            setStatus({ type: 'success', message: 'Material Group created successfully!' });
            // 🛡️ Reset the code field too
            setCategoryForm({ name: '', code: '', description: '' });
            await loadData(); 
        } catch (error) {
            const msg = error.response?.data?.error || error.response?.data?.message || 'Failed to create Material Group.';
            setStatus({ type: 'error', message: msg });
        } finally {
            setSubmittingCat(false);
        }
    };

    const handleUnitSubmit = async (e) => {
        e.preventDefault();
        setSubmittingUnit(true);
        setStatus({ type: '', message: '' });
        try {
            await createUnit(unitForm);
            setStatus({ type: 'success', message: 'Unit of Measurement created successfully!' });
            setUnitForm({ name: '', abbreviation: '' });
            await loadData(); 
        } catch (error) {
            const msg = error.response?.data?.error || error.response?.data?.message || 'Failed to create Unit.';
            setStatus({ type: 'error', message: msg });
        } finally {
            setSubmittingUnit(false);
        }
    };

    const handleDeleteCategory = async (id) => {
        if (!window.confirm("Are you sure? This will hide the category from all future menus.")) return;
        try {
            await deleteCategory(id);
            await loadData();
            setStatus({ type: 'success', message: 'Category archived.' });
        } catch (err) { setStatus({ type: 'error', message: 'Failed to delete.'}); }
    };

    const handleDeleteUnit = async (id) => {
        if (!window.confirm("Are you sure? This will hide the unit from future menus.")) return;
        try {
            await deleteUnit(id);
            await loadData();
            setStatus({ type: 'success', message: 'Unit archived.' });
        } catch (err) { setStatus({ type: 'error', message: 'Failed to delete.'}); }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12 text-indigo-600">
                <Loader className="animate-spin w-8 h-8" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            
            {/* Header */}
            <div className="mb-8 border-b border-slate-200 pb-5">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2.5 rounded-lg text-indigo-600">
                        <Database className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-light tracking-tight text-slate-900 m-0">System Master Data</h1>
                        <p className="text-sm text-slate-500 mt-1">Manage global categories and measurement units.</p>
                    </div>
                </div>
            </div>

            {/* Status Banner */}
            {status.message && (
                <div className={`mb-6 p-4 rounded-lg border text-sm flex items-center gap-3 ${status.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    <span className="font-medium">{status.message}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* LEFT COLUMN: Material Groups */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-slate-800 m-0">Material Groups (Categories)</h3>
                        <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">e.g., Raw Ingredients, Finished Goods</p>
                    </div>
                    
                    <form onSubmit={handleCategorySubmit} className="space-y-4 mb-6">
                        <input 
                            type="text" 
                            placeholder="Group Name (e.g., Raw Materials)" 
                            required 
                            value={categoryForm.name} 
                            onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} 
                            className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" 
                        />
                        {/* 🛡️ THE FIX: Added Code Input */}
                        <input 
                            type="text" 
                            placeholder="Group Code (e.g., RAW)" 
                            required 
                            value={categoryForm.code} 
                            onChange={e => setCategoryForm({...categoryForm, code: e.target.value.toUpperCase()})} 
                            className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors uppercase" 
                        />
                        <input 
                            type="text" 
                            placeholder="Description (Optional)" 
                            value={categoryForm.description} 
                            onChange={e => setCategoryForm({...categoryForm, description: e.target.value})} 
                            className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" 
                        />
                        <button 
                            type="submit" 
                            disabled={submittingCat}
                            className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {submittingCat ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            {submittingCat ? 'Saving...' : 'Add Category'}
                        </button>
                    </form>

                    <div className="flex-1 overflow-y-auto border border-slate-100 rounded-lg bg-slate-50">
                        <ul className="divide-y divide-slate-200 m-0 p-0">
                            {categories.map(cat => (
                                <li key={cat._id} className="p-4 hover:bg-slate-100 transition-colors flex justify-between items-center">
                                    {editingCatId === cat._id ? (
                                        /* INLINE EDIT MODE */
                                        <div className="flex-1 flex gap-2 mr-2">
                                            <input type="text" defaultValue={cat.name} id={`cat-name-${cat._id}`} className="border p-1 text-sm rounded w-full" />
                                            <button onClick={() => {
                                                updateCategory(cat._id, { name: document.getElementById(`cat-name-${cat._id}`).value }).then(loadData);
                                                setEditingCatId(null);
                                            }} className="bg-indigo-600 text-white px-3 py-1 rounded text-xs font-bold">Save</button>
                                            <button onClick={() => setEditingCatId(null)} className="text-slate-500"><X size={16} /></button>
                                        </div>
                                    ) : (
                                        /* NORMAL DISPLAY MODE */
                                        <>
                                            <div>
                                                <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                                    {cat.name} 
                                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">{cat.code}</span>
                                                </div>
                                                {cat.description && <div className="text-xs text-slate-500 mt-1">{cat.description}</div>}
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setEditingCatId(cat._id)} className="text-slate-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                                                <button onClick={() => handleDeleteCategory(cat._id)} className="text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                            </div>
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* RIGHT COLUMN: Units of Measurement */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-slate-800 m-0">Units of Measurement (UoM)</h3>
                        <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">e.g., Grams (g), Pieces (pcs)</p>
                    </div>

                    <form onSubmit={handleUnitSubmit} className="space-y-4 mb-6">
                        <input 
                            type="text" 
                            placeholder="Unit Name (e.g., Kilogram)" 
                            required 
                            value={unitForm.name} 
                            onChange={e => setUnitForm({...unitForm, name: e.target.value})} 
                            className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors" 
                        />
                        <input 
                            type="text" 
                            placeholder="Abbreviation (e.g., kg)" 
                            required 
                            value={unitForm.abbreviation} 
                            onChange={e => setUnitForm({...unitForm, abbreviation: e.target.value})} 
                            className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors" 
                        />
                        <button 
                            type="submit" 
                            disabled={submittingUnit}
                            className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {submittingUnit ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            {submittingUnit ? 'Saving...' : 'Add Unit'}
                        </button>
                    </form>

                    <div className="flex-1 overflow-y-auto border border-slate-100 rounded-lg bg-slate-50">
                        <ul className="divide-y divide-slate-200 m-0 p-0">
                            {units.length === 0 ? (
                                <li className="p-6 text-center text-sm text-slate-400">No active units found.</li>
                            ) : (
                                units.map(unit => (
                                    <li key={unit._id} className="p-4 hover:bg-slate-100 transition-colors flex justify-between items-center">
                                        {editingUnitId === unit._id ? (
                                            /* ✏️ INLINE EDIT MODE (Requires 2 inputs for Name and Abbreviation) */
                                            <div className="flex-1 flex gap-2 mr-2">
                                                <input 
                                                    type="text" 
                                                    defaultValue={unit.name} 
                                                    id={`unit-name-${unit._id}`} 
                                                    className="border border-slate-300 p-1.5 text-sm rounded w-1/2 focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                                                    placeholder="Name"
                                                />
                                                <input 
                                                    type="text" 
                                                    defaultValue={unit.abbreviation} 
                                                    id={`unit-abbr-${unit._id}`} 
                                                    className="border border-slate-300 p-1.5 text-sm rounded w-1/4 focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                                                    placeholder="Abbr"
                                                />
                                                <button onClick={async () => {
                                                    const newName = document.getElementById(`unit-name-${unit._id}`).value;
                                                    const newAbbr = document.getElementById(`unit-abbr-${unit._id}`).value;
                                                    try {
                                                        await updateUnit(unit._id, { name: newName, abbreviation: newAbbr });
                                                        await loadData();
                                                        setEditingUnitId(null);
                                                        setStatus({ type: 'success', message: 'Unit updated successfully!' });
                                                    } catch (err) {
                                                        setStatus({ type: 'error', message: 'Failed to update unit.' });
                                                    }
                                                }} className="bg-emerald-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-emerald-700 transition-colors">Save</button>
                                                <button onClick={() => setEditingUnitId(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={16} /></button>
                                            </div>
                                        ) : (
                                            /* 👁️ NORMAL DISPLAY MODE */
                                            <>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-slate-800 text-sm">{unit.name}</span>
                                                    <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                                                        {unit.abbreviation}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => setEditingUnitId(unit._id)} className="text-slate-400 hover:text-emerald-600 transition-colors"><Edit2 size={16}/></button>
                                                    <button onClick={() => handleDeleteUnit(unit._id)} className="text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16}/></button>
                                                </div>
                                            </>
                                        )}
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminMasterData;