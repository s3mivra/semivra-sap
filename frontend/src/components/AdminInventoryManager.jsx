import React, { useState, useEffect } from 'react';
import { fetchWarehouses, createWarehouse, fetchStockHistory, recordMovement, fetchUnits } from '../services/inventoryService';
import { fetchProducts } from '../services/productService'; // We need the products to move them!
import { fetchCategories } from '../services/categoryService';

const AdminInventoryManager = () => {
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState({ type: '', message: '' });

    // Forms State
    const [warehouseForm, setWarehouseForm] = useState({ code: '', name: '', location: '' });
    const [movementForm, setMovementForm] = useState({ product: '', warehouse: '', type: 'IN', quantity: '', reference: '' });
    const [categories, setCategories] = useState([]);
    const [units, setUnits] = useState([]);

    const loadData = async () => {
        try {
            // 1. Add the new fetch calls to the Promise.all array
            const [whData, prodData, histData, catData, unitData] = await Promise.all([
                fetchWarehouses(),
                fetchProducts(),
                fetchStockHistory(),
                fetchCategories(), // <-- NEW: Fetch Categories
                fetchUnits()       // <-- NEW: Fetch Units
            ]);
            
            setWarehouses(whData.data);
            setProducts(prodData.data);
            setHistory(histData.data);
            
            // 2. Save the new data to your state
            setCategories(catData.data); // <-- NEW: Save Categories
            setUnits(unitData.data);     // <-- NEW: Save Units
            
            // Set defaults for the dropdowns if data exists
            if (prodData.data.length > 0) setMovementForm(prev => ({ ...prev, product: prodData.data[0]._id }));
            if (whData.data.length > 0) setMovementForm(prev => ({ ...prev, warehouse: whData.data[0]._id }));
            
        } catch (error) { console.error('Failed to load inventory data', error); } 
        finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, []);

    useEffect(() => { loadData(); }, []);

    // Handlers
    const handleWarehouseSubmit = async (e) => {
        e.preventDefault();
        try {
            await createWarehouse(warehouseForm);
            setStatus({ type: 'success', message: 'Warehouse created successfully!' });
            setWarehouseForm({ code: '', name: '', location: '' });
            loadData();
        } catch (error) { setStatus({ type: 'error', message: 'Failed to create warehouse.' }); }
    };

    const handleMovementSubmit = async (e) => {
        e.preventDefault();
        if (!movementForm.product || !movementForm.warehouse) {
            return setStatus({ type: 'error', message: 'Please select a product and a warehouse.' });
        }
        try {
            await recordMovement({ ...movementForm, quantity: Number(movementForm.quantity) });
            setStatus({ type: 'success', message: 'Stock movement recorded successfully!' });
            setMovementForm({ ...movementForm, quantity: '', reference: '' }); // Keep dropdowns selected
            loadData();
        } catch (error) { 
            const trueError = error.response?.data?.error || error.response?.data?.message || 'Failed to record movement.';
            setStatus({ type: 'error', message: `DB Error: ${trueError}` }); 
        }
    };

    const getTypeColor = (type) => {
        if (type === 'IN') return '#27ae60'; // Green
        if (type === 'OUT') return '#e74c3c'; // Red
        return '#f39c12'; // Orange for Adjustment/Transfer
    };

    if (loading) return <div>Loading Inventory System...</div>;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
            
            {/* LEFT COLUMN: Warehouse Management (UNCHANGED) */}
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', alignSelf: 'start' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Locations (Warehouses)</h3>
                
                <form onSubmit={handleWarehouseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                    <input type="text" placeholder="Code (e.g. MAIN)" required value={warehouseForm.code} onChange={e => setWarehouseForm({...warehouseForm, code: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', textTransform: 'uppercase' }} />
                    <input type="text" placeholder="Name (e.g. Main Distribution)" required value={warehouseForm.name} onChange={e => setWarehouseForm({...warehouseForm, name: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    <input type="text" placeholder="Location/City" value={warehouseForm.location} onChange={e => setWarehouseForm({...warehouseForm, location: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    <button type="submit" style={{ padding: '8px', backgroundColor: '#34495e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Add Location</button>
                </form>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {warehouses.map(wh => (
                        <li key={wh._id} style={{ padding: '10px', borderBottom: '1px solid #eee', fontSize: '14px' }}>
                            <strong>{wh.code}</strong> - {wh.name} <br/><span style={{ color: '#7f8c8d', fontSize: '12px' }}>{wh.location}</span>
                        </li>
                    ))}
                    {warehouses.length === 0 && <li style={{ fontSize: '12px', color: '#7f8c8d' }}>No warehouses configured.</li>}
                </ul>
            </div>

            {/* RIGHT COLUMN: Stock Movements (UNCHANGED) */}
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <h2 style={{ margin: '0 0 20px 0', color: '#2c3e50', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Stock Movements & Adjustments</h2>
                
                {status.message && (
                    <div style={{ padding: '10px', marginBottom: '20px', borderRadius: '4px', backgroundColor: status.type === 'success' ? '#e8f8f5' : '#fdedec', color: status.type === 'success' ? '#27ae60' : '#c0392b' }}>{status.message}</div>
                )}

                {/* Receive / Deduct Form */}
                <form onSubmit={handleMovementSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #eee', marginBottom: '20px' }}>
                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Product</label>
                        <select required value={movementForm.product} onChange={e => setMovementForm({...movementForm, product: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                            <option value="">-- Select Product --</option>
                            {products.map(p => <option key={p._id} value={p._id}>{p.sku} - {p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Warehouse</label>
                        <select required value={movementForm.warehouse} onChange={e => setMovementForm({...movementForm, warehouse: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                            <option value="">-- Select Location --</option>
                            {warehouses.map(w => <option key={w._id} value={w._id}>{w.code} - {w.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Movement Type</label>
                        <select value={movementForm.type} onChange={e => setMovementForm({...movementForm, type: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontWeight: 'bold', color: getTypeColor(movementForm.type) }}>
                            <option value="IN">Stock IN (Receive)</option>
                            <option value="OUT">Stock OUT (Deduct)</option>
                            <option value="ADJUSTMENT">Adjustment</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Quantity</label>
                        <input type="number" value={movementForm.quantity} onChange={e => setMovementForm({...movementForm, quantity: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Reference / Reason</label>
                        <input type="text" required placeholder="e.g. PO-1029 or Damaged" value={movementForm.reference} onChange={e => setMovementForm({...movementForm, reference: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                        <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#2980b9', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>Record Movement</button>
                    </div>
                </form>

                {/* History Table */}
                <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#7f8c8d' }}>Recent Activity</h3>
                <div style={{ overflowY: 'auto', maxHeight: '200px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff' }}>
                            <tr style={{ color: '#7f8c8d', borderBottom: '2px solid #eee' }}>
                                <th style={{ padding: '8px' }}>Date</th>
                                <th style={{ padding: '8px' }}>Product</th>
                                <th style={{ padding: '8px' }}>Type</th>
                                <th style={{ padding: '8px' }}>Qty</th>
                                <th style={{ padding: '8px' }}>Reference</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map(row => (
                                <tr key={row._id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '8px' }}>{new Date(row.createdAt).toLocaleDateString()}</td>
                                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{row.product?.name}</td>
                                    <td style={{ padding: '8px', color: getTypeColor(row.type), fontWeight: 'bold' }}>{row.type}</td>
                                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{row.quantity}</td>
                                    <td style={{ padding: '8px', color: '#7f8c8d' }}>{row.reference}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* NEW SECTION: GLOBAL INVENTORY LEVELS */}
            <div style={{ gridColumn: 'span 2', backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginTop: '10px' }}>
                <h2 style={{ margin: '0 0 15px 0', color: '#2c3e50', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Live Inventory Levels</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8f9fa', color: '#7f8c8d' }}>
                            <th style={{ padding: '12px', borderBottom: '2px solid #eee' }}>SKU</th>
                            <th style={{ padding: '12px', borderBottom: '2px solid #eee' }}>Product Name</th>
                            <th style={{ padding: '12px', borderBottom: '2px solid #eee' }}>Material Group</th>
                            <th style={{ padding: '12px', borderBottom: '2px solid #eee' }}>Unit</th>
                            <th style={{ padding: '12px', borderBottom: '2px solid #eee', textAlign: 'right' }}>Quantity on Hand</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.filter(p => p.isPhysical).length === 0 ? (
                            <tr><td colSpan="5" style={{ padding: '15px', textAlign: 'center', color: '#7f8c8d' }}>No physical products configured yet.</td></tr>
                        ) : (
                            products.filter(p => p.isPhysical).map(p => {
                                // 👇 1. EXTRACT AND FORCE IDS TO STRINGS
                                const catId = typeof p.category === 'object' ? p.category?._id : p.category;
                                const unitId = typeof p.unit === 'object' ? p.unit?._id : p.unit;

                                // 👇 2. SEARCH THE MASTER ARRAYS FOR MATCHING NAMES
                                const categoryName = categories.find(c => String(c._id) === String(catId))?.name || 'N/A';
                                const unitAbbreviation = units.find(u => String(u._id) === String(unitId))?.abbreviation || 'N/A';

                                return (
                                    <tr key={p._id} style={{ borderBottom: '1px solid #eee', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8f9fa'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                        <td style={{ padding: '12px', fontWeight: 'bold', fontFamily: 'monospace', color: '#34495e' }}>{p.sku}</td>
                                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#2c3e50' }}>{p.name}</td>
                                        
                                        {/* 👇 3. RENDER THE TRANSLATED NAMES */}
                                        <td style={{ padding: '12px', color: '#7f8c8d' }}>{categoryName}</td>
                                        <td style={{ padding: '12px', color: '#7f8c8d' }}>{unitAbbreviation}</td>
                                        
                                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '16px', color: p.currentStock > 0 ? '#27ae60' : '#e74c3c' }}>
                                            {p.currentStock || 0}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            
        </div>
    );
};

export default AdminInventoryManager;