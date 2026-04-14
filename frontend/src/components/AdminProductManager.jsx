import React, { useState, useEffect } from 'react';
import { fetchCategories } from '../services/categoryService';
import { fetchUnits } from '../services/inventoryService';
import { fetchSuppliers } from '../services/purchasingService';
import { fetchProducts, createProduct, updateProduct } from '../services/productService';
import { Package, Plus, CheckCircle, AlertCircle, Loader, Save, FileText, Edit2} from 'lucide-react';

const AdminProductManager = () => {
    const [categories, setCategories] = useState([]);
    const [units, setUnits] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [allProducts, setAllProducts] = useState([]); 
    
    // 1. SEPARATE YOUR LOADING STATES
    const [isPageLoading, setIsPageLoading] = useState(true); 
    const [isSubmitting, setIsSubmitting] = useState(false); // Use this strictly for the button!
    
    const [status, setStatus] = useState({ type: '', message: '' });
    const [editingId, setEditingId] = useState(null);

    // 2. ONLY ONE USE-EFFECT TO RULE THEM ALL
    useEffect(() => {
        const loadMasterData = async () => {
            setIsPageLoading(true);
            try {
                const [catData, unitData, supData, prodData] = await Promise.all([
                    fetchCategories(), fetchUnits(), fetchSuppliers(), fetchProducts()
                ]);
                
                setCategories(catData.data);
                setUnits(unitData.data);
                setSuppliers(supData.data);
                setAllProducts(prodData.data);
                
                if (catData.data.length > 0) setFormData(prev => ({ ...prev, category: catData.data[0]._id }));
                if (unitData.data.length > 0) setFormData(prev => ({ ...prev, unit: unitData.data[0]._id }));
            } catch (err) { 
                console.error('Failed to load master data', err); 
            } finally {
                setIsPageLoading(false);
            }
        };
        loadMasterData();
    }, []);

    const [formData, setFormData] = useState({
        name: '', description: '', sku: '', price: '', category: '', 
        isPhysical: true, unit: '', billingType: 'one-time', durationInDays: 365,
        // 👇 NEW: RECIPE FIELDS 👇
        isRecipe: false,
        ingredients: [] // Array to hold { product: ID, quantityNeeded: Number }
    });

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleNameBlur = () => {
        // Only auto-generate if they typed a name AND the SKU is currently empty
        if (formData.name && !formData.sku) {
            // Grab the first 3 letters of the name (pad with X if it's too short)
            const namePrefix = formData.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X').padEnd(3, 'X');
            // Generate a random 4 digit number
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            
            setFormData(prev => ({ ...prev, sku: `${namePrefix}-${randomNum}` }));
        }
    };

    const handleEditClick = (product) => {
        // Lock the UI into Edit Mode
        setEditingId(product._id);
        
        // Safely extract IDs in case Mongoose populated them
        const catId = typeof product.category === 'object' ? product.category._id : product.category;
        const unitId = product.unit ? (typeof product.unit === 'object' ? product.unit._id : product.unit) : '';

        // Throw the product data up into the form
        setFormData({
            name: product.name || '',
            description: product.description || '',
            sku: product.sku || '',
            price: product.price || '',
            category: catId || '',
            isPhysical: product.isPhysical,
            unit: unitId || '',
            billingType: product.billingType || 'one-time',
            durationInDays: product.durationInDays || 365
        });
        
        // Smoothly scroll the user back to the top to see the form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setFormData({ name: '', description: '', sku: '', price: '', category: categories[0]?._id || '', isPhysical: true, unit: units[0]?._id || '', billingType: 'one-time', durationInDays: 365 });
        setStatus({ type: '', message: '' });
    };

    // --- NEW: RECIPE INGREDIENT HANDLERS ---
    const addIngredientRow = () => {
        setFormData({
            ...formData,
            ingredients: [...formData.ingredients, { product: '', quantityNeeded: '' }]
        });
    };

    const removeIngredientRow = (index) => {
        const updatedIngredients = formData.ingredients.filter((_, i) => i !== index);
        setFormData({ ...formData, ingredients: updatedIngredients });
    };

    const handleIngredientChange = (index, field, value) => {
        const updatedIngredients = [...formData.ingredients];
        updatedIngredients[index][field] = value;
        setFormData({ ...formData, ingredients: updatedIngredients });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatus({ type: '', message: '' });

        if (formData.isPhysical && !formData.unit) {
            setIsSubmitting(false);
            return setStatus({ type: 'error', message: 'Physical goods require a Unit of Measurement.' });
        }

        try {
            const payload = {
                name: formData.name,
                description: formData.description,
                sku: formData.sku,
                price: Number(formData.price),
                category: formData.category,
                isPhysical: formData.isPhysical
            };

            if (formData.isPhysical) payload.unit = formData.unit;
            else {
                payload.billingType = formData.billingType;
                payload.durationInDays = Number(formData.durationInDays);
            }
            
            // 👇 THE SMART SUBMIT ROUTER 👇
            if (editingId) {
                await updateProduct(editingId, payload);
                setStatus({ type: 'success', message: `Successfully updated ${formData.name}!` });
                setEditingId(null); // Exit edit mode
            } else {
                await createProduct(payload);
                setStatus({ type: 'success', message: `Successfully created ${formData.isPhysical ? 'Physical' : 'Digital'} Product!` });
            }
            
            const updatedProducts = await fetchProducts();
            setAllProducts(updatedProducts.data);

            // Reset form
            setFormData(prev => ({ ...prev, name: '', description: '', sku: '', price: '' }));
        } catch (error) {
            const trueError = error.response?.data?.error || error.response?.data?.message || 'Failed to save product.';
            setStatus({ type: 'error', message: `DB Error: ${trueError}` });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isPageLoading) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Loading Master Data...</div>;
    }

    return (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '8px', border: '1px solid #eee' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', color: formData.isPhysical ? '#27ae60' : '#7f8c8d' }}>
                    <input type="radio" name="isPhysical" checked={formData.isPhysical} onChange={() => setFormData({...formData, isPhysical: true})} style={{ marginRight: '8px' }} />
                    <Package style={{ marginRight: '8px' }} />
                    Physical Good / Raw Material
                </label>
                <span style={{ margin: '0 20px', color: '#ccc' }}>|</span>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', color: !formData.isPhysical ? '#2980b9' : '#7f8c8d' }}>
                    <input type="radio" name="isPhysical" checked={!formData.isPhysical} onChange={() => setFormData({...formData, isPhysical: false})} style={{ marginRight: '8px' }} />
                    <FileText style={{ marginRight: '8px' }} />
                    Digital Product / License
                </label>
            </div>

            {status.message && (
                <div style={{ padding: '10px', marginBottom: '20px', borderRadius: '4px', backgroundColor: status.type === 'success' ? '#e8f8f5' : '#fdedec', color: status.type === 'success' ? '#27ae60' : '#c0392b' }}>{status.message}</div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Product Name</label>
                    <input 
                        type="text" 
                        name="name" 
                        value={formData.name} 
                        onChange={handleChange} 
                        onBlur={handleNameBlur} // <-- ADD THIS LINE
                        required 
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} 
                    />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Description</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} required rows="2" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>SKU {editingId && <span style={{color:'red'}}>(Locked)</span>}</label>
                    <input 
                        type="text" 
                        name="sku" 
                        value={formData.sku} 
                        onChange={handleChange} 
                        onBlur={handleNameBlur}
                        required 
                        disabled={!!editingId} // <-- LOCKS IT DURING EDIT
                        style={{ 
                            width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', textTransform: 'uppercase',
                            backgroundColor: editingId ? '#f1f2f6' : '#fff', // Turns grey when locked
                            cursor: editingId ? 'not-allowed' : 'text'
                        }} 
                    />
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

                {/* 1. THE RECIPE TOGGLE */}
                {formData.isPhysical && (
                    <div style={{ gridColumn: 'span 2', marginTop: '10px', padding: '15px', backgroundColor: formData.isRecipe ? '#fffbd5' : '#f8f9fa', borderRadius: '8px', border: '1px solid #ccc' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold', color: '#2c3e50' }}>
                            <input 
                                type="checkbox" 
                                checked={formData.isRecipe} 
                                onChange={e => setFormData({ ...formData, isRecipe: e.target.checked })} 
                                style={{ width: '18px', height: '18px' }}
                            />
                            This product is an Assembled Recipe (Bill of Materials)
                        </label>
                        <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '5px 0 0 28px' }}>
                            Enable this if this item is built from other raw materials (e.g., A Latte made of Coffee Beans + Milk).
                        </p>

                        {/* 2. THE DYNAMIC INGREDIENTS LIST */}
                        {formData.isRecipe && (
                            <div style={{ marginTop: '15px', paddingLeft: '28px' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#34495e' }}>Recipe Ingredients</h4>
                                
                                {formData.ingredients.map((ing, index) => (
                                    <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                                        
                                        {/* Select the Raw Material */}
                                        <select 
                                            required 
                                            value={ing.product} 
                                            onChange={(e) => handleIngredientChange(index, 'product', e.target.value)}
                                            style={{ flex: 2, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                                        >
                                            <option value="">-- Select Raw Material --</option>
                                            {/* Only show physical items as ingredients! */}
                                            {allProducts.filter(p => p.isPhysical && p._id !== editingId).map(p => (
                                                <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                                            ))}
                                        </select>

                                        {/* Enter the Amount Needed */}
                                        <input 
                                            type="number" 
                                            required 
                                            step="any" // Allows decimals (e.g. 0.018 kg)
                                            min="0.001"
                                            placeholder="Qty Needed" 
                                            value={ing.quantityNeeded} 
                                            onChange={(e) => handleIngredientChange(index, 'quantityNeeded', e.target.value)}
                                            style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                                        />

                                        {/* Delete Row Button */}
                                        <button 
                                            type="button" 
                                            onClick={() => removeIngredientRow(index)}
                                            style={{ padding: '8px 12px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            X
                                        </button>
                                    </div>
                                ))}

                                {/* Add New Row Button */}
                                <button 
                                    type="button" 
                                    onClick={addIngredientRow}
                                    style={{ marginTop: '5px', padding: '6px 12px', backgroundColor: '#f39c12', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                >
                                    + Add Ingredient
                                </button>
                            </div>
                        )}
                    </div>
                )}

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

                <div style={{ gridColumn: 'span 2', marginTop: '10px', display: 'flex', gap: '10px' }}>
                    
                    {/* THE SMART SUBMIT BUTTON */}
                    <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '12px', backgroundColor: formData.isPhysical ? '#27ae60' : '#2980b9', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
                        {isSubmitting ? 'Processing...' : (editingId ? 'Update Product' : `Save ${formData.isPhysical ? 'Physical Item' : 'Digital License'}`)}
                    </button>
                    
                    {/* THE MISSING CANCEL BUTTON! */}
                    {editingId && (
                        <button type="button" onClick={cancelEdit} style={{ padding: '12px 20px', backgroundColor: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                            Cancel Edit
                        </button>
                    )}
                    
                </div>
            </form>

            {/* THE MASTER DATA SUPPLY CHAIN DIRECTORY */}
            <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '2px solid #eee' }}>
                <h2 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Product Supply Chain Directory</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                    <thead style={{ backgroundColor: '#f8f9fa', color: '#7f8c8d' }}>
                        <tr>
                            <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>SKU & Product</th>
                            <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>Master Details</th>
                            <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>Approved Suppliers & Pricing</th>
                            <th style={{ padding: '15px', borderBottom: '2px solid #eee', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allProducts.length === 0 ? (
                            <tr><td colSpan="4" style={{ padding: '15px', textAlign: 'center' }}>No products found.</td></tr>
                        ) : (
                            allProducts.map(product => {
                                // 1. 🔥 THE SUPPLIER FIX: Force strings to match!
                                const productSuppliers = suppliers.filter(s => 
                                    s.catalog && s.catalog.some(c => String(c.product._id || c.product) === String(product._id))
                                );

                                // 2. 🔥 THE UNIT & CATEGORY FIX: Map IDs to Names
                                const catId = typeof product.category === 'object' ? product.category?._id : product.category;
                                const unitId = typeof product.unit === 'object' ? product.unit?._id : product.unit;

                                const categoryName = categories.find(c => String(c._id) === String(catId))?.name || 'N/A';
                                const unitName = units.find(u => String(u._id) === String(unitId))?.abbreviation || 'N/A';

                                return (
                                    <tr key={product._id} style={{ borderBottom: '1px solid #eee', backgroundColor: editingId === product._id ? '#fffbd5' : 'transparent' }}>
                                        <td style={{ padding: '15px' }}>
                                            <div style={{ fontWeight: 'bold', color: '#2c3e50', fontSize: '16px' }}>{product.name}</div>
                                            <div style={{ fontFamily: 'monospace', color: '#7f8c8d' }}>{product.sku}</div>
                                        </td>
                                        
                                        {/* NEW: Master Details Column showing Category and Unit! */}
                                        <td style={{ padding: '15px' }}>
                                            <div style={{ marginBottom: '4px' }}>
                                                <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', backgroundColor: product.isPhysical ? '#e8f8f5' : '#ebf5fb', color: product.isPhysical ? '#27ae60' : '#2980b9' }}>
                                                    {product.isPhysical ? 'Physical Goods' : 'Digital License'}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '6px' }}>
                                                <strong>Grp:</strong> {categoryName}
                                            </div>
                                            {product.isPhysical && (
                                                <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                                                    <strong>UoM:</strong> {unitName}
                                                </div>
                                            )}
                                            
                                            {/* 👇 ADD THIS NEW BLOCK FOR CURRENT STOCK 👇 */}
                                            <div style={{ fontSize: '12px', color: '#27ae60', marginTop: '6px', fontWeight: 'bold' }}>
                                                In Stock: {product.currentStock || 0}
                                            </div>
                                            {/* 👆 ===================================== 👆 */}
                                        </td>
                                        
                                        <td style={{ padding: '15px' }}>
                                            {productSuppliers.length === 0 ? (
                                                <span style={{ color: '#e74c3c', fontSize: '12px' }}>No linked suppliers</span>
                                            ) : (
                                                <ul style={{ margin: 0, paddingLeft: '15px', color: '#34495e' }}>
                                                    {productSuppliers.map(sup => {
                                                        // Use the string trick here too just to be safe!
                                                        const catalogItem = sup.catalog.find(c => String(c.product._id || c.product) === String(product._id));
                                                        return (
                                                            <li key={sup._id} style={{ marginBottom: '4px' }}>
                                                                <strong>{sup.name}</strong> - ${catalogItem?.defaultCost.toFixed(2)}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </td>
                                        
                                        {/* THE EDIT BUTTON */}
                                        <td style={{ padding: '15px', textAlign: 'right' }}>
                                            <button 
                                                onClick={() => handleEditClick(product)}
                                                style={{ padding: '6px 12px', backgroundColor: '#34495e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', marginLeft: 'auto' }}
                                            >
                                                <Edit2 size={14} /> Edit
                                            </button>
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