import React, { useState, useEffect } from 'react';
import { fetchCategories } from '../services/categoryService';
import { fetchUnits } from '../services/inventoryService'; // Import units
import { fetchSuppliers } from '../services/purchasingService'; // <-- Add this import
import { fetchProducts, createProduct } from '../services/productService';

const AdminProductManager = () => {
    const [categories, setCategories] = useState([]);
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [suppliers, setSuppliers] = useState([]); // <-- NEW STATE
    const [allProducts, setAllProducts] = useState([]); // <-- NEW STATE to hold existing products

    useEffect(() => {
        const loadMasterData = async () => {
            try {
                // Fetch everything, including the new suppliers!
                const [catData, unitData, supData, prodData] = await Promise.all([
                    fetchCategories(), fetchUnits(), fetchSuppliers(), fetchProducts()
                ]);
                setCategories(catData.data);
                setUnits(unitData.data);
                setSuppliers(supData.data);
                setAllProducts(prodData.data);
                
                if (catData.data.length > 0) setFormData(prev => ({ ...prev, category: catData.data[0]._id }));
                if (unitData.data.length > 0) setFormData(prev => ({ ...prev, unit: unitData.data[0]._id }));
            } catch (err) { console.error('Failed to load master data'); }
        };
        loadMasterData();
    }, []);

    // The Universal Form Data
    const [formData, setFormData] = useState({
        name: '', description: '', sku: '', price: '', category: '',
        isPhysical: true, // Default to physical now!
        unit: '', 
        billingType: 'one-time', durationInDays: 365 
    });

    useEffect(() => {
        const loadMasterData = async () => {
            try {
                const [catData, unitData] = await Promise.all([fetchCategories(), fetchUnits()]);
                setCategories(catData.data);
                setUnits(unitData.data);
                
                // Set defaults if data exists
                if (catData.data.length > 0) setFormData(prev => ({ ...prev, category: catData.data[0]._id }));
                if (unitData.data.length > 0) setFormData(prev => ({ ...prev, unit: unitData.data[0]._id }));
            } catch (err) { console.error('Failed to load master data'); }
        };
        loadMasterData();
    }, []);

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: '', message: '' });

        if (formData.isPhysical && !formData.unit) return setStatus({ type: 'error', message: 'Physical goods require a Unit of Measurement.' });

        try {
            // 1. Build the base payload that BOTH types share
            const payload = {
                name: formData.name,
                description: formData.description,
                sku: formData.sku,
                price: Number(formData.price),
                category: formData.category,
                isPhysical: formData.isPhysical
            };

            // 2. Conditionally attach the specific fields so we don't send 'null'
            if (formData.isPhysical) {
                payload.unit = formData.unit;
            } else {
                payload.billingType = formData.billingType;
                payload.durationInDays = Number(formData.durationInDays);
            }
            
            // 3. Send it to the backend!
            await createProduct(payload);
            
            setStatus({ type: 'success', message: `Successfully created ${formData.isPhysical ? 'Physical' : 'Digital'} Product!` });
            
            // Reset basic fields
            setFormData(prev => ({ ...prev, name: '', description: '', sku: '', price: '' }));
        } catch (error) {
            // Now it will grab the exact Mongoose validation error!
            const trueError = error.response?.data?.error || error.response?.data?.message || 'Failed to create product.';
            setStatus({ type: 'error', message: `DB Error: ${trueError}` });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
            
            {/* THE SMART TOGGLE */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '8px', border: '1px solid #eee' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', color: formData.isPhysical ? '#27ae60' : '#7f8c8d' }}>
                    <input type="radio" name="isPhysical" checked={formData.isPhysical} onChange={() => setFormData({...formData, isPhysical: true})} style={{ marginRight: '8px' }} />
                    📦 Physical Good / Raw Material
                </label>
                <span style={{ margin: '0 20px', color: '#ccc' }}>|</span>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', color: !formData.isPhysical ? '#2980b9' : '#7f8c8d' }}>
                    <input type="radio" name="isPhysical" checked={!formData.isPhysical} onChange={() => setFormData({...formData, isPhysical: false})} style={{ marginRight: '8px' }} />
                    💻 Digital Product / License
                </label>
            </div>

            {status.message && (
                <div style={{ padding: '10px', marginBottom: '20px', borderRadius: '4px', backgroundColor: status.type === 'success' ? '#e8f8f5' : '#fdedec', color: status.type === 'success' ? '#27ae60' : '#c0392b' }}>{status.message}</div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                {/* UNIVERSAL FIELDS (Always Show) */}
                <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Product Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>

                {/* THE MISSING DESCRIPTION FIELD: Add this right here! */}
                <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Description</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} required rows="2" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>SKU</label>
                    <input type="text" name="sku" value={formData.sku} onChange={handleChange} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', textTransform: 'uppercase' }} />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Base Price (USD)</label>
                    <input type="number" name="price" value={formData.price} onChange={handleChange} required min="0" step="0.01" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Material Group (Category)</label>
                    <select name="category" value={formData.category} onChange={handleChange} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                        {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name} ({cat.code})</option>)}
                    </select>
                </div>

                {/* DYNAMIC FIELDS: PHYSICAL ONLY */}
                {formData.isPhysical && (
                    <div style={{ gridColumn: 'span 2', backgroundColor: '#e8f8f5', padding: '15px', borderRadius: '8px', border: '1px solid #a3e4d7' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#27ae60' }}>Physical Inventory Settings</h4>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Unit of Measurement</label>
                        <select name="unit" value={formData.unit} onChange={handleChange} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                            <option value="">-- Select Unit --</option>
                            {units.map(u => <option key={u._id} value={u._id}>{u.name} ({u.abbreviation})</option>)}
                        </select>
                    </div>
                )}

                {/* DYNAMIC FIELDS: DIGITAL ONLY */}
                {!formData.isPhysical && (
                    <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', backgroundColor: '#ebf5fb', padding: '15px', borderRadius: '8px', border: '1px solid #a9cce3' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#2980b9', gridColumn: 'span 2' }}>Digital Licensing Settings</h4>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Billing Type</label>
                            <select name="billingType" value={formData.billingType} onChange={handleChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                                <option value="one-time">One-Time</option>
                                <option value="subscription">Subscription</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Duration (Days)</label>
                            <input type="number" name="durationInDays" value={formData.durationInDays} onChange={handleChange} min="1" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                        </div>
                    </div>
                )}

                <div style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                    <button type="submit" disabled={loading} style={{ padding: '12px', width: '100%', backgroundColor: formData.isPhysical ? '#27ae60' : '#2980b9', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
                        {loading ? 'Processing...' : `Save ${formData.isPhysical ? 'Physical Item' : 'Digital License'}`}
                    </button>
                </div>
            </form>
            {/* NEW: THE MASTER DATA SUPPLY CHAIN DIRECTORY */}
            <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '2px solid #eee' }}>
                <h2 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Product Supply Chain Directory</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                    <thead style={{ backgroundColor: '#f8f9fa', color: '#7f8c8d' }}>
                        <tr>
                            <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>SKU & Product</th>
                            <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>Type</th>
                            <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>Approved Suppliers & Pricing</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allProducts.length === 0 ? (
                            <tr><td colSpan="3" style={{ padding: '15px', textAlign: 'center' }}>No products found.</td></tr>
                        ) : (
                            allProducts.map(product => {
                                // Find every supplier that has this product in their catalog
                                const productSuppliers = suppliers.filter(s => 
                                    s.catalog.some(c => (c.product._id || c.product) === product._id)
                                );

                                return (
                                    <tr key={product._id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '15px' }}>
                                            <div style={{ fontWeight: 'bold', color: '#2c3e50', fontSize: '16px' }}>{product.name}</div>
                                            <div style={{ fontFamily: 'monospace', color: '#7f8c8d' }}>{product.sku}</div>
                                        </td>
                                        <td style={{ padding: '15px' }}>
                                            <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', backgroundColor: product.isPhysical ? '#e8f8f5' : '#ebf5fb', color: product.isPhysical ? '#27ae60' : '#2980b9' }}>
                                                {product.isPhysical ? 'Physical Goods' : 'Digital License'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '15px' }}>
                                            {productSuppliers.length === 0 ? (
                                                <span style={{ color: '#e74c3c', fontSize: '12px' }}>No linked suppliers</span>
                                            ) : (
                                                <ul style={{ margin: 0, paddingLeft: '15px', color: '#34495e' }}>
                                                    {productSuppliers.map(sup => {
                                                        const catalogItem = sup.catalog.find(c => (c.product._id || c.product) === product._id);
                                                        return (
                                                            <li key={sup._id} style={{ marginBottom: '4px' }}>
                                                                <strong>{sup.name}</strong> - ${catalogItem.defaultCost.toFixed(2)}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
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

export default AdminProductManager;