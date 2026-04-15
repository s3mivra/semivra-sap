import React, { useState, useEffect } from 'react';
import { fetchSuppliers, createSupplier, fetchPOs, createPO, receivePO, addSupplierCatalogItem } from '../services/purchasingService';
import { fetchProducts } from '../services/productService';
import { fetchWarehouses } from '../services/inventoryService';
import { Truck, Plus, Package, DollarSign, CheckCircle, AlertCircle, Loader, Building, User, Mail, ShoppingCart, FileText, TrendingUp, X } from 'lucide-react';

const AdminPurchasing = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]); 
    const [warehouses, setWarehouses] = useState([]);
    const [pos, setPos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [paymentMethod, setPaymentMethod] = useState('Cash');

    // Forms & State
    const [supplierForm, setSupplierForm] = useState({ name: '', contactName: '', email: '' });
    const [catalogForm, setCatalogForm] = useState({ supplierId: '', productId: '', defaultCost: '' });
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [receiveWarehouseSelections, setReceiveWarehouseSelections] = useState({});
    const [receivingId, setReceivingId] = useState(null);

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

    const handleProductSelection = (e) => {
        const selectedProductId = e.target.value;
        
        // Find the product they just clicked on from your loaded products array
        const selectedProduct = products.find(p => p._id === selectedProductId);

        // Update the form with BOTH the new Product ID and its Master Data Price
        setCatalogForm({
            ...catalogForm,
            productId: selectedProductId,
            defaultCost: selectedProduct ? selectedProduct.price : ''
        });
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
                totalAmount: totalPoAmount,
                paymentMethod: paymentMethod
            };
            console.log("🚨 DATA LEAVING BROWSER:", payload);
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
        
        // 1. Lock the specific button
        setReceivingId(poId); 
        
        try {
            await receivePO(poId, warehouseId);
            setStatus({ type: 'success', message: 'PO Received! Inventory and Ledger updated automatically.' });
            loadData();
        } catch (error) {
            setStatus({ type: 'error', message: `Receive Error: ${error.response?.data?.error || 'Failed to receive PO'}` }); 
        } finally {
            // 2. Unlock the button when finished
            setReceivingId(null); 
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center p-8">
            <Loader className="w-6 h-6 animate-spin text-slate-400" />
            <span className="ml-2 text-slate-600">Loading Purchasing System...</span>
        </div>
    );

    // THE SMART FILTER: Only show products in the left grid if the selected supplier sells them.
    const activeSupplier = suppliers.find(s => String(s._id) === String(selectedSupplier));
    const catalogProductIds = activeSupplier && activeSupplier.catalog ? activeSupplier.catalog.map(c => String(c.product._id || c.product)) : [];
    const availableProducts = selectedSupplier ? products.filter(p => catalogProductIds.includes(String(p._id))) : products;

    return (
        <div className="bg-slate-50 min-h-screen p-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <Truck className="w-8 h-8 text-slate-400" />
                    <h1 className="text-3xl font-light tracking-tight text-slate-900 m-0">Purchasing & Procurement</h1>
                </div>
                <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">Supply Chain Management</div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium text-slate-700">Select Supplier:</label>
                        <select 
                            value={selectedSupplier} 
                            onChange={(e) => setSelectedSupplier(e.target.value)} 
                            className="px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200"
                        >
                            <option value="">-- Choose Supplier --</option>
                            {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                        {selectedSupplier && (
                            <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                                {activeSupplier?.catalog?.length || 0} catalog items
                            </span>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-600">
                            <span className="font-medium text-slate-900">{suppliers.length}</span> suppliers,
                            <span className="font-medium text-slate-900 ml-1">{pos.length}</span> POs
                        </span>
                    </div>
                </div>
                {status.message && (
                    <div className={`mt-4 p-3 rounded-lg flex items-center gap-3 text-sm font-medium ${
                        status.type === 'success' 
                            ? 'bg-green-50 border border-green-200 text-green-700' 
                            : 'bg-red-50 border border-red-200 text-red-700'
                    }`}>
                        {status.type === 'success' ? (
                            <CheckCircle className="w-4 h-4" />
                        ) : (
                            <AlertCircle className="w-4 h-4" />
                        )}
                        {status.message}
                    </div>
                )}
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* LEFT SIDE: Catalog Grid & Supplier Setup */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    
                    {/* The Product Grid (Click to add to PO) */}
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                        <Package className="w-6 h-6 text-slate-400" />
                        <h2 className="text-xl font-medium text-slate-900 m-0">Supplier Catalog</h2>
                    </div>
                    {!selectedSupplier ? (
                        <div className="p-4 bg-amber-50 border-l-4 border-amber-400 text-amber-800 mb-6 rounded">
                            <p className="text-sm font-medium">Please select a supplier from the top bar to view their catalog.</p>
                        </div>
                    ) : availableProducts.length === 0 ? (
                        <div className="p-4 bg-amber-50 border-l-4 border-amber-400 text-amber-800 mb-6 rounded">
                            <p className="text-sm font-medium">This supplier has no products linked. Use the form below to link products.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                            {availableProducts.map(p => {
                                const catItem = activeSupplier?.catalog.find(c => String(c.product._id || c.product) === String(p._id));
                                return (
                                    <div key={p._id} onClick={() => addToCart(p)} 
                                         className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200 hover:scale-105 border-t-4 border-t-blue-500"
                                    >
                                        <div className="text-xs text-slate-500 mb-2 font-mono">{p.sku}</div>
                                        <div className="font-bold text-slate-900 text-sm mb-3 min-h-[2.5rem]">{p.name}</div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-blue-600 text-base">
                                                ₱{catItem ? catItem.defaultCost.toFixed(2) : p.averageCost.toFixed(2)}
                                            </span>
                                            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">Stock: {p.currentStock}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Admin Setup Forms (Collapsed to bottom) */}
                    <div className="border-t border-slate-200 pt-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Building className="w-5 h-5 text-slate-400" />
                                    <h4 className="text-lg font-medium text-slate-900 m-0">Add New Supplier</h4>
                                </div>
                                <form onSubmit={handleSupplierSubmit} className="space-y-3">
                                    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg">
                                        <Building className="w-4 h-4 text-slate-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Company Name" 
                                            required 
                                            value={supplierForm.name} 
                                            onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} 
                                            className="flex-1 outline-none bg-transparent text-sm" 
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg">
                                        <User className="w-4 h-4 text-slate-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Contact Person" 
                                            value={supplierForm.contactName} 
                                            onChange={e => setSupplierForm({...supplierForm, contactName: e.target.value})} 
                                            className="flex-1 outline-none bg-transparent text-sm" 
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg">
                                        <Mail className="w-4 h-4 text-slate-400" />
                                        <input 
                                            type="email" 
                                            placeholder="Email" 
                                            value={supplierForm.email} 
                                            onChange={e => setSupplierForm({...supplierForm, email: e.target.value})} 
                                            className="flex-1 outline-none bg-transparent text-sm" 
                                        />
                                    </div>
                                    <button 
                                        type="submit" 
                                        className="w-full py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Supplier
                                    </button>
                                </form>
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Package className="w-5 h-5 text-slate-400" />
                                    <h4 className="text-lg font-medium text-slate-900 m-0">Link Product to Supplier</h4>
                                </div>
                                <form onSubmit={handleCatalogSubmit} className="space-y-3">
                                    <select 
                                        value={catalogForm.supplierId} 
                                        onChange={e => setCatalogForm({...catalogForm, supplierId: e.target.value})} 
                                        required
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                                    >
                                        <option value="">Select Supplier</option>
                                        {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                    </select>
                                    <select 
                                        value={catalogForm.productId} 
                                        // 👉 CHANGE THIS LINE BELOW:
                                        onChange={handleProductSelection} 
                                        required
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                                    >
                                        <option value="">Select Product</option>
                                        {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.sku}) - Base: ₱{p.price}</option>)}
                                    </select>
                                    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg">
                                        <DollarSign className="w-4 h-4 text-slate-400" />
                                        <input 
                                            type="number" 
                                            placeholder="Default Cost" 
                                            required 
                                            min="0.01" 
                                            step="0.01" 
                                            value={catalogForm.defaultCost} 
                                            onChange={e => setCatalogForm({...catalogForm, defaultCost: e.target.value})} 
                                            className="flex-1 outline-none bg-transparent text-sm" 
                                        />
                                    </div>
                                    <button 
                                        type="submit" 
                                        className="w-full py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Link Product
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE: PO Cart & History */}
                <div className="w-full lg:w-96 space-y-6">
                    
                    {/* PO Cart */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-200">
                            <ShoppingCart className="w-6 h-6 text-slate-400" />
                            <h3 className="text-lg font-medium text-slate-900 m-0">Purchase Order Cart</h3>
                        </div>
                        
                        {poCart.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                <p className="text-sm">Click products to add to cart</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                                    {poCart.map(item => (
                                        <div key={item.product._id} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1">
                                                    <div className="font-medium text-slate-900 text-sm">{item.product.name}</div>
                                                    <div className="text-xs text-slate-500 font-mono">{item.product.sku}</div>
                                                </div>
                                                <button 
                                                    onClick={() => removeFromCart(item.product._id)}
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" 
                                                    min="1" 
                                                    value={item.quantity} 
                                                    onChange={(e) => updateQuantity(item.product._id, e.target.value)} 
                                                    className="w-16 px-2 py-1 border border-slate-300 rounded text-center text-sm"
                                                />
                                                <span className="text-slate-400">×</span>
                                                <input 
                                                    type="number" 
                                                    min="0.01" 
                                                    step="0.01" 
                                                    value={item.unitCost} 
                                                    onChange={(e) => updateUnitCost(item.product._id, e.target.value)} 
                                                    className="w-20 px-2 py-1 border border-blue-300 rounded text-center text-sm font-medium text-blue-600 bg-blue-50"
                                                />
                                                <span className="font-medium text-slate-900 ml-auto">
                                                    ₱{(item.quantity * item.unitCost).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', fontWeight: 'bold' }}>Payment Method</label>
                                    <select 
                                        value={paymentMethod} 
                                        onChange={e => setPaymentMethod(e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: paymentMethod === 'Terms' ? '#fdf2e9' : '#e8f8f5' }}
                                    >
                                        <option value="Cash">Cash / Bank Transfer</option>
                                        <option value="Terms">Terms / Accounts Payable</option>
                                    </select>
                                </div>
                                <div className="border-t border-slate-200 pt-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-lg font-bold text-slate-900">Total:</span>
                                        <span className="text-lg font-bold text-blue-600">₱{totalPoAmount.toFixed(2)}</span>
                                    </div>
                                    <button 
                                        onClick={handlePOSubmit}
                                        className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <FileText className="w-4 h-4" />
                                        Create Purchase Order
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* PO History */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-200">
                            <TrendingUp className="w-6 h-6 text-slate-400" />
                            <h3 className="text-lg font-medium text-slate-900 m-0">Order History</h3>
                        </div>
                        
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {pos.length === 0 ? (
                                <div className="text-center py-4 text-slate-500 text-sm">No orders yet</div>
                            ) : (
                                pos.map(po => (
                                    <div key={po._id} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="font-medium text-slate-900 text-sm font-mono">{po.poNumber}</div>
                                                <div className="text-xs text-slate-500">{po.supplier?.name}</div>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                po.status === 'Ordered' 
                                                    ? 'bg-yellow-100 text-yellow-800' 
                                                    : 'bg-green-100 text-green-800'
                                            }`}>
                                                {po.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-slate-900">₱{po.totalAmount.toFixed(2)}</span>
                                            {po.status === 'Ordered' && (
                                                <select 
                                                    value={receiveWarehouseSelections[po._id] || ''} 
                                                    onChange={e => setReceiveWarehouseSelections({...receiveWarehouseSelections, [po._id]: e.target.value})} 
                                                    className="text-xs px-2 py-1 border border-slate-300 rounded"
                                                >
                                                    <option value="">Select warehouse</option>
                                                    {warehouses.map(w => <option key={w._id} value={w._id}>{w.code}</option>)}
                                                </select>
                                            )}
                                            {po.status === 'Ordered' && (
                                                <button 
                                                    onClick={() => handleReceive(po._id)}
                                                    disabled={receivingId === po._id} 
                                                    className={`text-xs px-3 py-1 text-white rounded transition-colors ${
                                                        receivingId === po._id 
                                                        ? 'bg-slate-400 cursor-not-allowed' 
                                                        : 'bg-green-500 hover:bg-green-600'
                                                    }`}
                                                >
                                                    {receivingId === po._id ? 'Receiving...' : 'Receive'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPurchasing;