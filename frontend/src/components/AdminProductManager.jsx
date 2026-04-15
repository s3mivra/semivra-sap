import React, { useState, useEffect } from 'react';
import { fetchCategories } from '../services/categoryService';
import { fetchUnits } from '../services/inventoryService';
import { fetchSuppliers } from '../services/purchasingService';
import { fetchProducts, createProduct, updateProduct, deleteProduct } from '../services/productService';
import {  Trash2, X, Package, Plus, CheckCircle, AlertCircle, Loader, Save, FileText, Edit2} from 'lucide-react';

const AdminProductManager = () => {
    const [categories, setCategories] = useState([]);
    const [units, setUnits] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [allProducts, setAllProducts] = useState([]); 
    
    const [isPageLoading, setIsPageLoading] = useState(true); 
    const [isSubmitting, setIsSubmitting] = useState(false); 
    
    const [status, setStatus] = useState({ type: '', message: '' });
    const [editingId, setEditingId] = useState(null);

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
        isRecipe: false,
        ingredients: [] 
    });

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleNameBlur = () => {
        if (formData.name && !formData.sku) {
            const namePrefix = formData.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X').padEnd(3, 'X');
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            setFormData(prev => ({ ...prev, sku: `${namePrefix}-${randomNum}` }));
        }
    };

    const handleEditClick = (product) => {
        setEditingId(product._id);
        
        const catId = typeof product.category === 'object' ? product.category._id : product.category;
        const unitId = product.unit ? (typeof product.unit === 'object' ? product.unit._id : product.unit) : '';

        // Safely map ingredients without conversion math
        const mappedIngredients = product.ingredients ? product.ingredients.map(ing => ({
            rawMaterial: typeof ing.rawMaterial === 'object' ? ing.rawMaterial._id : ing.rawMaterial,
            quantityNeeded: ing.quantityNeeded,
            uom: typeof ing.uom === 'object' ? ing.uom._id : ing.uom
        })) : [];

        setFormData({
            name: product.name || '',
            description: product.description || '',
            sku: product.sku || '',
            price: product.price || '',
            category: catId || '',
            isPhysical: product.isPhysical,
            unit: unitId || '',
            billingType: product.billingType || 'one-time',
            durationInDays: product.durationInDays || 365,
            isRecipe: product.isRecipe || false,
            ingredients: mappedIngredients
        });
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setFormData({ name: '', description: '', sku: '', price: '', category: categories[0]?._id || '', isPhysical: true, unit: units[0]?._id || '', billingType: 'one-time', durationInDays: 365, isRecipe: false, ingredients: [] });
        setStatus({ type: '', message: '' });
    };

    // --- BOM / RECIPE HANDLERS ---
    const addIngredientRow = () => {
        setFormData({
            ...formData,
            // Simplified array addition
            ingredients: [...formData.ingredients, { rawMaterial: '', quantityNeeded: '', uom: units[0]?._id || '' }]
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

        if (formData.isPhysical && !formData.unit && !formData.isRecipe) {
            setIsSubmitting(false);
            return setStatus({ type: 'error', message: 'Physical goods require a Base Unit of Measurement.' });
        }

        try {
            const payload = {
                name: formData.name,
                description: formData.description,
                sku: formData.sku,
                price: Number(formData.price),
                category: formData.category,
                isPhysical: formData.isPhysical,
                isRecipe: formData.isPhysical ? formData.isRecipe : false,
                // Pass clean ingredient array to backend
                ingredients: formData.isRecipe ? formData.ingredients.map(ing => ({
                    rawMaterial: ing.rawMaterial,
                    quantityNeeded: Number(ing.quantityNeeded),
                    uom: ing.uom
                })) : []
            };

            if (formData.isPhysical) payload.unit = formData.unit;
            else {
                payload.billingType = formData.billingType;
                payload.durationInDays = Number(formData.durationInDays);
            }
            
            if (editingId) {
                await updateProduct(editingId, payload);
                setStatus({ type: 'success', message: `Successfully updated ${formData.name}!` });
                setEditingId(null);
            } else {
                await createProduct(payload);
                setStatus({ type: 'success', message: `Successfully created ${formData.isPhysical ? 'Physical' : 'Digital'} Product!` });
            }
            
            const updatedProducts = await fetchProducts();
            setAllProducts(updatedProducts.data);

            setFormData(prev => ({ ...prev, name: '', description: '', sku: '', price: '', isRecipe: false, ingredients: [] }));
        } catch (error) {
            const trueError = error.response?.data?.error || error.response?.data?.message || 'Failed to save product.';
            setStatus({ type: 'error', message: `DB Error: ${trueError}` });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Add import { Trash2 } from 'lucide-react';

    const handleDeleteProduct = async (product, linkedSuppliersCount) => {
        let message = `Are you sure you want to PERMANENTLY delete ${product.name}? This action cannot be undone.`;
        
        // 🚨 The Extreme Warning
        if (linkedSuppliersCount > 0) {
            message = `🚨 CRITICAL WARNING: ${product.name} is currently linked to ${linkedSuppliersCount} Supplier Catalog(s).\n\nProceeding will PERMANENTLY wipe this product from the database AND automatically delete it from all connected supplier catalogs.\n\nAre you absolutely sure you want to destroy this data?`;
        }

        if (!window.confirm(message)) return;

        try {
            await deleteProduct(product._id);
            const updatedProducts = await fetchProducts();
            setAllProducts(updatedProducts.data);
            setStatus({ type: 'success', message: `${product.name} successfully deleted from database and supplier links.` });
        } catch (error) {
            setStatus({ type: 'error', message: 'Failed to delete product.' });
        }
    };

    if (isPageLoading) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Loading Master Data...</div>;
    }

    // 🧠 THE MATH ENGINE: Calculates how many recipes we can make based on raw materials
    const calculateAvailableStock = (product) => {
        // If it's a normal item, just return its actual stock
        if (!product.isRecipe || !product.ingredients || product.ingredients.length === 0) {
            return product.currentStock || 0;
        }

        let maxCanMake = Infinity;

        // Loop through every ingredient required for this recipe
        for (let ing of product.ingredients) {
            const rawId = typeof ing.rawMaterial === 'object' ? ing.rawMaterial._id : ing.rawMaterial;
            
            // Find the raw material in our master list
            const rawMaterial = allProducts.find(p => String(p._id) === String(rawId));

            if (!rawMaterial) return 0; // If an ingredient is missing, we can make 0

            // How many times does the required quantity fit into our current stock?
            const yieldFromThisIngredient = Math.floor((rawMaterial.currentStock || 0) / ing.quantityNeeded);
            
            // The bottleneck (lowest yield) is the maximum amount we can make
            if (yieldFromThisIngredient < maxCanMake) {
                maxCanMake = yieldFromThisIngredient;
            }
        }

        return maxCanMake === Infinity ? 0 : maxCanMake;
    };

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
                    <input type="text" name="name" value={formData.name} onChange={handleChange} onBlur={handleNameBlur} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Description</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} required rows="2" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>SKU {editingId && <span style={{color:'red'}}>(Locked)</span>}</label>
                    <input type="text" name="sku" value={formData.sku} onChange={handleChange} onBlur={handleNameBlur} required disabled={!!editingId} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', textTransform: 'uppercase', backgroundColor: editingId ? '#f1f2f6' : '#fff', cursor: editingId ? 'not-allowed' : 'text' }} />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Base Price (PHP)</label>
                    <input type="number" name="price" value={formData.price} onChange={handleChange} required min="0" step="0.01" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
                {/* SPLIT INTO TWO COLUMNS: Category and Base Unit */}
                <div>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Material Group (Category)</label>
                    <select name="category" value={formData.category} onChange={handleChange} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                        {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name} ({cat.code})</option>)}
                    </select>
                </div>

                {formData.isPhysical ? (
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', color: '#27ae60', fontWeight: 'bold' }}>Base Unit (Inventory UoM)</label>
                        <select name="unit" value={formData.unit} onChange={handleChange} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #27ae60', backgroundColor: '#e8f8f5' }}>
                            <option value="">-- Select Inventory Unit --</option>
                            {units.map(u => <option key={u._id} value={u._id}>{u.name} ({u.abbreviation})</option>)}
                        </select>
                    </div>
                ) : (
                    <div /> /* Empty div to keep the CSS grid perfectly aligned for Digital Products */
                )}

                {formData.isPhysical && (
                    <div style={{ gridColumn: 'span 2', marginTop: '10px', padding: '15px', backgroundColor: formData.isRecipe ? '#fffbd5' : '#f8f9fa', borderRadius: '8px', border: '1px solid #ccc' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold', color: '#2c3e50' }}>
                            <input type="checkbox" checked={formData.isRecipe} onChange={e => setFormData({ ...formData, isRecipe: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                            This product is an Assembled Recipe (Bill of Materials)
                        </label>
                        <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '5px 0 0 28px' }}>
                            Enable this if this item is built from other raw materials (e.g., A Latte made of Coffee Beans + Milk).
                        </p>

                        {/* SIMPLIFIED BOM / RECIPE BUILDER UI */}
                        {formData.isRecipe && (
                            <div style={{ marginTop: '15px', paddingLeft: '28px' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#34495e' }}>Recipe Ingredients</h4>
                                
                                {formData.ingredients.map((ing, index) => {
                                    return (
                                        <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center', backgroundColor: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}>
                                            
                                            {/* Raw Material Selection */}
                                            <div style={{ flex: 2 }}>
                                                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#7f8c8d', marginBottom: '2px' }}>Raw Material</label>
                                                <select required value={ing.rawMaterial} onChange={(e) => handleIngredientChange(index, 'rawMaterial', e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}>
                                                    <option value="">-- Select Material --</option>
                                                    {allProducts.filter(p => p.isPhysical && p._id !== editingId).map(p => (
                                                        <option key={p._id} value={p._id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Recipe Quantity */}
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#7f8c8d', marginBottom: '2px' }}>Qty Needed</label>
                                                <input type="number" required step="any" min="0.001" value={ing.quantityNeeded} onChange={(e) => handleIngredientChange(index, 'quantityNeeded', e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} />
                                            </div>

                                            {/* Custom Recipe Unit (UOM) */}
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#7f8c8d', marginBottom: '2px' }}>Recipe Unit</label>
                                                <select required value={ing.uom} onChange={(e) => handleIngredientChange(index, 'uom', e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}>
                                                    {units.map(u => <option key={u._id} value={u._id}>{u.abbreviation}</option>)}
                                                </select>
                                            </div>

                                            <button type="button" onClick={() => removeIngredientRow(index)} style={{ alignSelf: 'flex-end', padding: '6px 10px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', height: '30px' }}>
                                                X
                                            </button>
                                        </div>
                                    )
                                })}

                                <button type="button" onClick={addIngredientRow} style={{ marginTop: '5px', padding: '6px 12px', backgroundColor: '#f39c12', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
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
                    <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '12px', backgroundColor: formData.isPhysical ? '#27ae60' : '#2980b9', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
                        {isSubmitting ? 'Processing...' : (editingId ? 'Update Product' : `Save ${formData.isPhysical ? 'Physical Item' : 'Digital License'}`)}
                    </button>
                    {editingId && (
                        <button type="button" onClick={cancelEdit} style={{ padding: '12px 20px', backgroundColor: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                            Cancel Edit
                        </button>
                    )}
                </div>
            </form>

            {/* PRODUCT DIRECTORY TABLE */}
            <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '2px solid #eee' }}>
                <h2 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Product Supply Chain Directory</h2>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                        <thead style={{ backgroundColor: '#f8f9fa', color: '#7f8c8d' }}>
                            <tr>
                                <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>SKU & Product</th>
                                <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>Type & Details</th>
                                <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>Stock & Recipe</th>
                                <th style={{ padding: '15px', borderBottom: '2px solid #eee', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allProducts.length === 0 ? (
                                <tr><td colSpan="4" style={{ padding: '15px', textAlign: 'center' }}>No products found.</td></tr>
                            ) : (
                                allProducts.map(product => {
                                    const catId = typeof product.category === 'object' ? product.category?._id : product.category;
                                    const unitId = typeof product.unit === 'object' ? product.unit?._id : product.unit;

                                    const categoryName = categories.find(c => String(c._id) === String(catId))?.name || 'N/A';
                                    const unitName = units.find(u => String(u._id) === String(unitId))?.abbreviation || 'N/A';

                                    // 🛡️ THE FIX: Add this specific block right here!
                                    const productSuppliers = suppliers.filter(s => 
                                        s.catalog && s.catalog.some(c => String(c.product._id || c.product) === String(product._id))
                                    );

                                    return (
                                        <tr key={product._id} style={{ borderBottom: '1px solid #eee', backgroundColor: editingId === product._id ? '#fffbd5' : 'transparent' }}>
                                            <td style={{ padding: '15px' }}>
                                                <div style={{ fontWeight: 'bold', color: '#2c3e50', fontSize: '16px' }}>{product.name}</div>
                                                <div style={{ fontFamily: 'monospace', color: '#7f8c8d' }}>{product.sku}</div>
                                            </td>
                                            
                                            <td style={{ padding: '15px' }}>
                                                <div style={{ marginBottom: '4px' }}>
                                                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', backgroundColor: product.isPhysical ? '#e8f8f5' : '#ebf5fb', color: product.isPhysical ? '#27ae60' : '#2980b9' }}>
                                                        {product.isPhysical ? (product.isRecipe ? 'Assembled Recipe' : 'Physical Goods') : 'Digital License'}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '6px' }}>
                                                    <strong>Grp:</strong> {categoryName}
                                                </div>
                                            </td>
                                            
                                            <td style={{ padding: '15px' }}>
                                                {product.isPhysical ? (
                                                    <>
                                                        <div style={{ fontSize: '13px', color: '#27ae60', fontWeight: 'bold' }}>
                                                            {/* 🛡️ THE FIX: Use the smart calculation! */}
                                                            In Stock: {calculateAvailableStock(product)} {unitName}
                                                            {product.isRecipe && <span style={{ color: '#7f8c8d', fontSize: '11px', marginLeft: '5px' }}>(Calculated Yield)</span>}
                                                        </div>
                                                        {/* ... ingredients map ... */}
                                                        {product.isRecipe && product.ingredients && (
                                                            <div style={{ fontSize: '11px', color: '#e67e22', marginTop: '4px' }}>
                                                                Requires {product.ingredients.length} raw materials
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Unlimited (Digital)</div>
                                                )}
                                            </td>
                                            
                                            <td style={{ padding: '15px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button onClick={() => handleEditClick(product)} style={{ padding: '6px 12px', backgroundColor: '#34495e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <Edit2 size={14} /> Edit
                                                </button>
                                                <button onClick={() => handleDeleteProduct(product, productSuppliers.length)} style={{ padding: '6px 12px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <Trash2 size={14} /> Delete
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
        </div>
    );
};

export default AdminProductManager;