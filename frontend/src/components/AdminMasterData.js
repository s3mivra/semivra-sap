import React, { useState, useEffect } from 'react';
import { fetchCategories, createCategory } from '../services/categoryService';
import { fetchUnits, createUnit } from '../services/inventoryService'; // Import new unit services

const AdminMasterData = () => {
    // Categories State
    const [categories, setCategories] = useState([]);
    const [catForm, setCatForm] = useState({ name: '', code: '', description: '' });

    // Units State
    const [units, setUnits] = useState([]);
    const [unitForm, setUnitForm] = useState({ name: '', abbreviation: '' });

    const loadData = async () => {
        try {
            const [catData, unitData] = await Promise.all([fetchCategories(), fetchUnits()]);
            setCategories(catData.data);
            setUnits(unitData.data);
        } catch (error) { console.error('Failed to load master data'); }
    };

    useEffect(() => { loadData(); }, []);

    const handleCatSubmit = async (e) => {
        e.preventDefault();
        await createCategory(catForm);
        setCatForm({ name: '', code: '', description: '' });
        loadData();
    };

    const handleUnitSubmit = async (e) => {
        e.preventDefault();
        await createUnit(unitForm);
        setUnitForm({ name: '', abbreviation: '' });
        loadData();
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            
            {/* CATEGORY MASTER DATA */}
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#2c3e50', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Material Groups (Categories)</h3>
                <form onSubmit={handleCatSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                    <input type="text" placeholder="Name (e.g., Raw Materials)" required value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
                    <input type="text" placeholder="Code (e.g., RAW)" required value={catForm.code} onChange={e => setCatForm({...catForm, code: e.target.value})} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', textTransform: 'uppercase' }} />
                    <button type="submit" style={{ padding: '8px', backgroundColor: '#2980b9', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Add Category</button>
                </form>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px' }}>
                    {categories.map(cat => <li key={cat._id} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}><strong>{cat.code}</strong> - {cat.name}</li>)}
                </ul>
            </div>

            {/* UNIT MASTER DATA */}
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#2c3e50', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Units of Measurement</h3>
                <form onSubmit={handleUnitSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                    <input type="text" placeholder="Name (e.g., Kilogram)" required value={unitForm.name} onChange={e => setUnitForm({...unitForm, name: e.target.value})} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
                    <input type="text" placeholder="Abbreviation (e.g., kg)" required value={unitForm.abbreviation} onChange={e => setUnitForm({...unitForm, abbreviation: e.target.value})} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
                    <button type="submit" style={{ padding: '8px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Add Unit</button>
                </form>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px' }}>
                    {units.map(u => <li key={u._id} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}><strong>{u.name}</strong> ({u.abbreviation})</li>)}
                </ul>
            </div>
        </div>
    );
};

export default AdminMasterData;