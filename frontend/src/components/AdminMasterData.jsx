import React, { useState, useEffect } from 'react';
// Make sure these paths match your actual service files!
import { fetchCategories, createCategory } from '../services/categoryService';
import { fetchUnits, createUnit } from '../services/inventoryService'; 

const AdminMasterData = () => {
    const [categories, setCategories] = useState([]);
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState({ type: '', message: '' });

    // Form States
    const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
    const [unitForm, setUnitForm] = useState({ name: '', abbreviation: '' });

    const loadData = async () => {
        try {
            const [catData, unitData] = await Promise.all([
                fetchCategories(),
                fetchUnits()
            ]);
            setCategories(catData.data);
            setUnits(unitData.data);
        } catch (error) {
            console.error('Failed to load master data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // Handlers
    const handleCategorySubmit = async (e) => {
        e.preventDefault();
        try {
            await createCategory(categoryForm);
            setStatus({ type: 'success', message: 'Material Group created!' });
            setCategoryForm({ name: '', description: '' });
            loadData();
        } catch (error) {
            setStatus({ type: 'error', message: 'Failed to create Material Group.' });
        }
    };

    const handleUnitSubmit = async (e) => {
        e.preventDefault();
        try {
            await createUnit(unitForm);
            setStatus({ type: 'success', message: 'Unit of Measurement created!' });
            setUnitForm({ name: '', abbreviation: '' });
            loadData();
        } catch (error) {
            setStatus({ type: 'error', message: 'Failed to create Unit.' });
        }
    };

    if (loading) return <div>Loading Master Data...</div>;

    return (
        <div>
            <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
                System Master Data
            </h2>

            {status.message && (
                <div style={{ padding: '10px', marginBottom: '20px', borderRadius: '4px', backgroundColor: status.type === 'success' ? '#e8f8f5' : '#fdedec', color: status.type === 'success' ? '#27ae60' : '#c0392b' }}>
                    {status.message}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                
                {/* LEFT COLUMN: Material Groups */}
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#34495e' }}>Material Groups (Categories)</h3>
                    <p style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '15px' }}>e.g., Raw Ingredients, Packaging, Finished Goods</p>
                    
                    <form onSubmit={handleCategorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                        <input type="text" placeholder="Group Name" required value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                        <input type="text" placeholder="Description (Optional)" value={categoryForm.description} onChange={e => setCategoryForm({...categoryForm, description: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                        <button type="submit" style={{ padding: '8px', backgroundColor: '#2980b9', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Add Group</button>
                    </form>

                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: '1px solid #eee', paddingTop: '10px' }}>
                        {categories.map(cat => (
                            <li key={cat._id} style={{ padding: '8px 0', borderBottom: '1px solid #f8f9fa', fontSize: '14px', color: '#2c3e50' }}>
                                <strong>{cat.name}</strong> <span style={{ color: '#bdc3c7', fontSize: '12px', marginLeft: '10px' }}>{cat.description}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* RIGHT COLUMN: Units of Measurement */}
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#34495e' }}>Units of Measurement (UoM)</h3>
                    <p style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '15px' }}>e.g., Grams (g), Milliliters (ml), Pieces (pcs)</p>

                    <form onSubmit={handleUnitSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                        <input type="text" placeholder="Unit Name (e.g., Kilogram)" required value={unitForm.name} onChange={e => setUnitForm({...unitForm, name: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                        <input type="text" placeholder="Abbreviation (e.g., kg)" required value={unitForm.abbreviation} onChange={e => setUnitForm({...unitForm, abbreviation: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                        <button type="submit" style={{ padding: '8px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Add Unit</button>
                    </form>

                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: '1px solid #eee', paddingTop: '10px' }}>
                        {units.map(unit => (
                            <li key={unit._id} style={{ padding: '8px 0', borderBottom: '1px solid #f8f9fa', fontSize: '14px', color: '#2c3e50' }}>
                                <strong>{unit.name}</strong> <span style={{ color: '#7f8c8d', fontSize: '12px', backgroundColor: '#eee', padding: '2px 6px', borderRadius: '4px', marginLeft: '10px' }}>{unit.abbreviation}</span>
                            </li>
                        ))}
                    </ul>
                </div>

            </div>
        </div>
    );
};

export default AdminMasterData;