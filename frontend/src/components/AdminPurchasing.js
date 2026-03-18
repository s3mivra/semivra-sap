import React, { useState, useEffect } from 'react';
import { fetchSuppliers, createSupplier, fetchPOs, createPO, receivePO, addSupplierCatalogItem } from '../services/purchasingService';
import { fetchProducts } from '../services/productService';
import { fetchWarehouses } from '../services/inventoryService';

const AdminPurchasing = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]); 
    const [warehouses, setWarehouses] = useState([]);
    const [pos, setPos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState({ type: '', message: '' });

    // Forms & State
    const [supplierForm, setSupplierForm] = useState({ name: '', contactName: '', email: '' });
    const [catalogForm, setCatalogForm] = useState({ supplierId: '', productId: '', defaultCost: '' });
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [receiveWarehouseSelections, setReceiveWarehouseSelections] = useState({});

    // --- NEW: PO CART LOGIC ---
    const [poCart, setPoCart] = useState([]);

    const addToCart = (product) => {
        const existingItem = poCart.find(item => item.product._id === product._id);
        if (existingItem) {
            setPoCart(poCart.map(item => 
                item.product._id === product._id 
                ? { ...item, quantity: item.quantity + 1 } 
                : item
            ));
        } else {
            // Find if this supplier has a negotiated catalog price!
            const activeSupplier = suppliers.find(s => s._id === selectedSupplier);
            let defaultCost = product.averageCost > 0 ? product.averageCost : product.price;
            
            if (activeSupplier && activeSupplier.catalog) {
                const catalogItem = activeSupplier.catalog.find(c => c.product._id === product._id);
                if (catalogItem) defaultCost = catalogItem.defaultCost;
            }

            setPoCart([...poCart, { product, quantity: 1, unitCost: defaultCost }]);
        }
    };

    const updateQuantity = (productId, newQuantity) => {
        if (newQuantity < 1) return removeFromCart(productId);
        setPoCart(poCart.map(item => 
            item.product._id === productId ? { ...item, quantity: Number(newQuantity) } : item
        ));
    };

    const updateUnitCost = (productId, newCost) => {
        setPoCart(poCart.map(item => 
            item.product._id === productId ? { ...item, unitCost: Number(newCost) } : item
        ));
    };

    const removeFromCart = (productId) => setPoCart(poCart.filter(item => item.product._id !== productId));

    // --- DATA LOADING ---
    const loadData = async () => {
        try {
            const [supData, prodData, whData, poData] = await Promise.all([
                fetchSuppliers(), fetchProducts(), fetchWarehouses(), fetchPOs()
            ]);
            setSuppliers(supData.data);
            setProducts(prodData.data.filter(p => p.isPhysical));
            setWarehouses(whData.data);
            setPos(poData.data);
            if (supData.data.length > 0) setSelectedSupplier(supData.data[0]._id);
        } catch (error) { console.error('Failed to load purchasing data'); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, []);

    // --- HANDLERS ---
    const handleSupplierSubmit = async (e) => {
        e.preventDefault();
        try {
            await createSupplier(supplierForm);
            setStatus({ type: 'success', message: 'Supplier added!' });
            setSupplierForm({ name: '', contactName: '', email: '' });
            loadData();
        } catch (error) { setStatus({ type: 'error', message: 'Failed to add supplier' }); }
    };

    const handleCatalogSubmit = async (e) => {
        e.preventDefault();
        try {
            await addSupplierCatalogItem(catalogForm.supplierId, { productId: catalogForm.productId, defaultCost: Number(catalogForm.defaultCost) });
            setStatus({ type: 'success', message: 'Product linked to supplier catalog!' });
            setCatalogForm({ supplierId: '', productId: '', defaultCost: '' });
            loadData();
        } catch (error) { setStatus({ type: 'error', message: 'Failed to link product' }); }
    };

    const totalPoAmount = poCart.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

    const handlePOSubmit = async () => {
        setStatus({ type: '', message: '' });
        if (!selectedSupplier) return setStatus({ type: 'error', message: 'Please select a supplier.' });
        if (poCart.length === 0) return setStatus({ type: 'error', message: 'Add at least one item to the PO.' });

        try {
            const payload = {
                supplier: selectedSupplier,
                items: poCart.map(i => ({ product: i.product._id, quantity: i.quantity, unitCost: i.unitCost })),
                totalAmount: totalPoAmount
            };
            await createPO(payload);
            setStatus({ type: 'success', message: 'Purchase Order created successfully!' });
            setPoCart([]); // Clear cart
            loadData();
        } catch (error) { 
            setStatus({ type: 'error', message: `PO Error: ${error.response?.data?.error || 'Failed to create PO'}` }); 
        }
    };

    const handleReceive = async (poId) => {
        const warehouseId = receiveWarehouseSelections[poId];
        if (!warehouseId) return setStatus({ type: 'error', message: 'Please select a receiving warehouse.' });
        try {
            await receivePO(poId, warehouseId);
            setStatus({ type: 'success', message: 'PO Received! Inventory and Ledger updated automatically.' });
            loadData();
        } catch (error) {
            setStatus({ type: 'error', message: `Receive Error: ${error.response?.data?.error || 'Failed to receive PO'}` }); 
        }
    };

    if (loading) return <div>Loading Purchasing Module...</div>;

    // THE SMART FILTER: Only show products in the left grid if the selected supplier sells them.
    const activeSupplier = suppliers.find(s => String(s._id) === String(selectedSupplier));
    const catalogProductIds = activeSupplier && activeSupplier.catalog ? activeSupplier.catalog.map(c => String(c.product._id || c.product)) : [];
    const availableProducts = selectedSupplier ? products.filter(p => catalogProductIds.includes(String(p._id))) : products;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', backgroundColor: '#ecf0f1', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            
            {/* TOP BAR: Supplier Selection & Setup */}
            <div style={{ backgroundColor: '#2c3e50', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '18px' }}>📥 Purchasing</span>
                    <select value={selectedSupplier} onChange={e => { setSelectedSupplier(e.target.value); setPoCart([]); }} style={{ padding: '8px', borderRadius: '4px', border: 'none', fontWeight: 'bold', minWidth: '200px' }}>
                        <option value="">-- Choose Supplier --</option>
                        {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                </div>
                {status.message && (
                    <span style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '4px', backgroundColor: status.type === 'success' ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>
                        {status.message}
                    </span>
                )}
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                
                {/* LEFT SIDE: Catalog Grid & Supplier Setup */}
                <div style={{ flex: 7, backgroundColor: '#f8f9fa', padding: '20px', overflowY: 'auto', borderRight: '2px solid #ddd' }}>
                    
                    {/* The Product Grid (Click to add to PO) */}
                    <h2 style={{ margin: '0 0 20px 0', color: '#34495e' }}>Supplier Catalog</h2>
                    {!selectedSupplier ? (
                        <div style={{ padding: '20px', backgroundColor: '#fef9e7', borderLeft: '4px solid #f39c12', color: '#d35400', marginBottom: '30px' }}>Please select a supplier from the top bar to view their catalog.</div>
                    ) : availableProducts.length === 0 ? (
                        <div style={{ padding: '20px', backgroundColor: '#fef9e7', borderLeft: '4px solid #f39c12', color: '#d35400', marginBottom: '30px' }}>This supplier has no products linked. Use the form below to link products.</div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px', marginBottom: '40px' }}>
                            {availableProducts.map(p => {
                                const catItem = activeSupplier?.catalog.find(c => String(c.product._id || c.product) === String(p._id));
                                return (
                                    <div key={p._id} onClick={() => addToCart(p)} 
                                         style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', cursor: 'pointer', borderTop: '4px solid #2980b9', transition: 'transform 0.1s' }}
                                         onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                                         onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <div style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '5px' }}>{p.sku}</div>
                                        <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '10px', color: '#2c3e50', minHeight: '40px' }}>{p.name}</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 'bold', color: '#2980b9', fontSize: '16px' }}>
                                                ${catItem ? catItem.defaultCost.toFixed(2) : p.averageCost.toFixed(2)}
                                            </span>
                                            <span style={{ fontSize: '11px', backgroundColor: '#ecf0f1', padding: '3px 6px', borderRadius: '4px', color: '#34495e' }}>In Stock: {p.currentStock}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Admin Setup Forms (Collapsed to bottom) */}
                    <div style={{ display: 'flex', gap: '20px', borderTop: '2px solid #ddd', paddingTop: '20px' }}>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50', fontSize: '14px' }}>Add New Supplier</h4>
                            <form onSubmit={handleSupplierSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <input type="text" placeholder="Company Name" required value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                                <input type="text" placeholder="Contact Person" value={supplierForm.contactName} onChange={e => setSupplierForm({...supplierForm, contactName: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                                <button type="submit" style={{ padding: '8px', backgroundColor: '#34495e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Create</button>
                            </form>
                        </div>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50', fontSize: '14px' }}>Link Product to Vendor</h4>
                            <form onSubmit={handleCatalogSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <select required value={catalogForm.supplierId} onChange={e => setCatalogForm({...catalogForm, supplierId: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                                    <option value="">-- Select Supplier --</option>
                                    {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                </select>
                                <select required value={catalogForm.productId} onChange={e => setCatalogForm({...catalogForm, productId: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                                    <option value="">-- Select Product --</option>
                                    {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                                </select>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input type="number" step="0.01" min="0" placeholder="Neg. Cost" required value={catalogForm.defaultCost} onChange={e => setCatalogForm({...catalogForm, defaultCost: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                                    <button type="submit" style={{ padding: '8px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Link</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE: The Draft PO & History */}
                <div style={{ flex: 4, backgroundColor: '#fff', display: 'flex', flexDirection: 'column', padding: '0' }}>
                    
                    <div style={{ padding: '20px', borderBottom: '2px solid #eee', backgroundColor: '#fdfefe' }}>
                        <h3 style={{ margin: 0, color: '#2c3e50' }}>Draft Purchase Order</h3>
                    </div>

                    <div style={{ flexGrow: 1, overflowY: 'auto', padding: '20px', backgroundColor: '#fdfefe' }}>
                        {poCart.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#95a5a6', marginTop: '40px' }}>Cart is empty.<br/>Tap items on the left to add.</div>
                        ) : (
                            poCart.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', borderBottom: '1px solid #eee' }}>
                                    
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#2c3e50' }}>{item.product.name}</div>
                                        <div style={{ color: '#7f8c8d', fontSize: '12px' }}>SKU: {item.product.sku}</div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <label style={{ fontSize: '10px', color: '#7f8c8d', textTransform: 'uppercase' }}>Qty</label>
                                            <input type="number" min="1" value={item.quantity} onChange={(e) => updateQuantity(item.product._id, e.target.value)} style={{ width: '60px', padding: '8px', textAlign: 'center', border: '1px solid #ccc', borderRadius: '4px' }} />
                                        </div>
                                        <span style={{ color: '#bdc3c7', fontSize: '14px', marginTop: '15px' }}>@</span>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <label style={{ fontSize: '10px', color: '#2980b9', textTransform: 'uppercase', fontWeight: 'bold' }}>Unit Cost</label>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '8px', top: '10px', color: '#7f8c8d', fontSize: '14px' }}>$</span>
                                                <input type="number" min="0.01" step="0.01" value={item.unitCost} onChange={(e) => updateUnitCost(item.product._id, e.target.value)} style={{ width: '90px', padding: '8px 8px 8px 20px', border: '2px solid #3498db', borderRadius: '4px', fontWeight: 'bold', color: '#2980b9', backgroundColor: '#ebf5fb' }} />
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '80px' }}>
                                            <label style={{ fontSize: '10px', color: '#7f8c8d', textTransform: 'uppercase' }}>Total</label>
                                            <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#2c3e50', marginTop: '8px' }}>${(item.unitCost * item.quantity).toFixed(2)}</div>
                                        </div>
                                        <button onClick={() => removeFromCart(item.product._id)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '20px', padding: '0 5px', marginTop: '15px' }}>×</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div style={{ padding: '20px', backgroundColor: '#fdfefe', borderTop: '2px solid #eee', boxShadow: '0 -4px 10px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '24px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '20px' }}>
                            <span>Total PO Amount:</span>
                            <span>${totalPoAmount.toFixed(2)}</span>
                        </div>
                        <button onClick={handlePOSubmit} disabled={poCart.length === 0} style={{ width: '100%', padding: '15px', backgroundColor: poCart.length === 0 ? '#bdc3c7' : '#2980b9', color: 'white', border: 'none', borderRadius: '4px', fontSize: '18px', fontWeight: 'bold', cursor: poCart.length === 0 ? 'not-allowed' : 'pointer' }}>
                            Submit Purchase Order
                        </button>
                    </div>

                    {/* PO History Queue (Collapsible or Scrollable area at the bottom) */}
                    <div style={{ borderTop: '4px solid #34495e', backgroundColor: '#f4f6f7', padding: '20px', maxHeight: '300px', overflowY: 'auto' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Pending & Received Orders</h4>
                        {pos.length === 0 ? (
                            <div style={{ fontSize: '13px', color: '#7f8c8d' }}>No orders history.</div>
                        ) : (
                            pos.map(po => (
                                <div key={po._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '10px', borderRadius: '4px', marginBottom: '10px', border: '1px solid #ddd' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontFamily: 'monospace', fontSize: '14px' }}>{po.poNumber}</div>
                                        <div style={{ fontSize: '12px', color: '#7f8c8d' }}>{po.supplier?.name} - ${po.totalAmount.toFixed(2)}</div>
                                    </div>
                                    <div>
                                        {po.status === 'Ordered' ? (
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <select value={receiveWarehouseSelections[po._id] || ''} onChange={e => setReceiveWarehouseSelections({...receiveWarehouseSelections, [po._id]: e.target.value})} style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px' }}>
                                                    <option value="">Receive to...</option>
                                                    {warehouses.map(w => <option key={w._id} value={w._id}>{w.code}</option>)}
                                                </select>
                                                <button onClick={() => handleReceive(po._id)} style={{ padding: '4px 8px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Receive</button>
                                            </div>
                                        ) : (
                                            <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#e8f8f5', color: '#27ae60' }}>RECEIVED</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPurchasing;