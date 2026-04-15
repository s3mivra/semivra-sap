import React, { useState, useEffect } from 'react';
import { fetchProducts } from '../services/productService';
import { fetchWarehouses } from '../services/inventoryService';
import { processCheckout } from '../services/posService';
import { ShoppingCart, Package, Plus, Minus, Trash2, User, Search, Barcode, DollarSign, CreditCard, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const AdminPOS = () => {
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Checkout State
    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [taxRate, setTaxRate] = useState(12); 
    const [discountAmount, setDiscountAmount] = useState(''); // <-- NEW
    const [status, setStatus] = useState({ type: '', message: '', receipt: null });
    const [customerName, setCustomerName] = useState(''); // Track who is buying
    const [heldCarts, setHeldCarts] = useState([]); // Array to store parked carts
    const [receiptData, setReceiptData] = useState(null);

    const [barcodeInput, setBarcodeInput] = useState(''); // Tracking manual barcode entry
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [catalogSearch, setCatalogSearch] = useState('');

    const loadData = async () => {
        try {
            // Pass the current page and search term to the backend
            const [prodData, whData] = await Promise.all([
                fetchProducts({ page: currentPage, limit: 12, search: catalogSearch }), 
                fetchWarehouses()
            ]);
            
            // Because we filter out inactive products, do it here
            setProducts(prodData.data.filter(p => p.isActive)); 
            
            // Save the pagination data!
            if (prodData.pagination) {
                setTotalPages(prodData.pagination.totalPages);
            }

            setWarehouses(whData.data);
            if (whData.data.length > 0) setSelectedWarehouse(whData.data[0]._id);
        } catch (error) {
            console.error("Failed to load POS data", error);
        } finally {
            setLoading(false);
        }
    };

    // Make sure useEffect re-runs whenever currentPage or catalogSearch changes!
    useEffect(() => {
        loadData();
    }, [currentPage, catalogSearch]);

    // --- BARCODE SCANNER LISTENER ---
    useEffect(() => {
        let barcodeBuffer = '';
        let barcodeTimeout = null;

        const handleKeyDown = (e) => {
            // Ignore if the cashier is actively typing in an input field (like Customer Name)
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            // If the scanner hits "Enter", process the barcode!
            if (e.key === 'Enter') {
                if (barcodeBuffer) {
                    processBarcode(barcodeBuffer);
                    barcodeBuffer = ''; // Clear the buffer
                }
                return;
            }

            // If it's a normal character, add it to our buffer
            if (e.key.length === 1) {
                barcodeBuffer += e.key;
                
                // THE SPEED TEST: Scanners type instantly. Humans are slow.
                // If 50ms passes without a keystroke, it was a human. Clear the buffer.
                clearTimeout(barcodeTimeout);
                barcodeTimeout = setTimeout(() => {
                    barcodeBuffer = '';
                }, 50); 
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        
        // Cleanup listener when component unmounts
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            clearTimeout(barcodeTimeout);
        };
    }, [products, cart]); // Re-run if products or cart change so we have fresh data

    // The function that finds the product and adds it
    const processBarcode = (scannedCode) => {
        // Search by SKU. (If you add a specific 'barcode' field to your DB later, add it here!)
        const targetProduct = products.find(p => p.sku.toLowerCase() === scannedCode.toLowerCase());
        
        if (targetProduct) {
            addToCart(targetProduct);
            
            // Optional: Play a tiny "Beep" sound for that Enterprise feel!
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioCtx.createOscillator();
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(200, audioCtx.currentTime); // 800Hz Beep
                oscillator.connect(audioCtx.destination);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.1); // Beep for 0.1 seconds
            } catch (err) { /* Ignore if browser blocks audio */ }
            
        } else {
            setStatus({ type: 'error', message: `Barcode not recognized: ${scannedCode}` });
        }
    };

    // Handles manual typing or pasting into the barcode bar!
    const handleManualBarcodeSubmit = (e) => {
        e.preventDefault();
        if (!barcodeInput.trim()) return;
        
        processBarcode(barcodeInput.trim());
        setBarcodeInput(''); // Instantly clear the box for the next scan!
    };

    // --- CART LOGIC ---
    const addToCart = (product) => {
        setStatus({ type: '', message: '', receipt: null }); // Clear previous success messages
        const existingItem = cart.find(item => item.product._id === product._id);
        
        if (existingItem) {
            setCart(cart.map(item => 
                item.product._id === product._id 
                ? { ...item, quantity: item.quantity + 1 } 
                : item
            ));
        } else {
            setCart([...cart, { product, quantity: 1, price: product.price }]);
        }
    };

    const updateQuantity = (productId, newQuantity) => {
        if (newQuantity < 1) return removeFromCart(productId);
        setCart(cart.map(item => 
            item.product._id === productId 
            ? { ...item, quantity: Number(newQuantity) } 
            : item
        ));
    };

    const removeFromCart = (productId) => setCart(cart.filter(item => item.product._id !== productId));

    const handleHoldCart = () => {
        if (cart.length === 0) return;
        const newHeldCart = {
            id: Date.now(),
            time: new Date().toLocaleTimeString(),
            customer: customerName || 'Walk-in',
            items: [...cart]
        };
        setHeldCarts([...heldCarts, newHeldCart]);
        setCart([]); // Clear screen for next customer
        setCustomerName('');
        setStatus({ type: 'success', message: 'Cart put on hold.' });
    };

    const handleRestoreCart = (heldId) => {
        const targetCart = heldCarts.find(c => c.id === heldId);
        if (targetCart) {
            setCart(targetCart.items);
            setCustomerName(targetCart.customer !== 'Walk-in' ? targetCart.customer : '');
            setHeldCarts(heldCarts.filter(c => c.id !== heldId)); // Remove from hold queue
            setStatus({ type: '', message: '' });
        }
    };

    // --- LIVE CART MATH (TAX-EXCLUSIVE + DISCOUNTS) ---
    const grossSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const netSubtotal = Math.max(0, grossSubtotal - (Number(discountAmount) || 0));
    const decimalTax = Number(taxRate) / 100;
    const vatAmount = netSubtotal * decimalTax;
    const totalAmount = netSubtotal + vatAmount;
    
    const hasPhysicalItems = cart.some(item => item.product.isPhysical);

    // --- CHECKOUT LOGIC ---
    const handleCheckout = async () => {
        if (cart.length === 0) return setStatus({ type: 'error', message: 'Cart is empty!' });
        if (hasPhysicalItems && !selectedWarehouse) return setStatus({ type: 'error', message: 'Please select a warehouse to deduct physical stock from.' });

        setStatus({ type: '', message: '', receipt: null });

        try {
            const payload = {
                items: cart.map(item => ({ product: item.product._id, quantity: item.quantity, price: item.price, name: item.product.name })), // Passed name for the receipt!
                paymentMethod,
                warehouseId: hasPhysicalItems ? selectedWarehouse : null,
                taxRate: Number(taxRate),
                discountAmount: Number(discountAmount) || 0,
                customerName: customerName || 'Walk-in'
            };

            const response = await processCheckout(payload);
            
            // FIXED: Removed the extra .data that was causing the frontend to crash!
            setStatus({ type: 'success', message: 'Checkout Successful!', receipt: response.data.orNumber });
            
            // NEW: Save the receipt data and pop the modal!
            const saleData = response.data;
            saleData.populatedItems = cart; 
            setReceiptData(saleData);

            // Clear the screen for the next customer
            setCart([]); 
            setCustomerName('');
            setDiscountAmount('');
            
            const updatedProds = await fetchProducts();
            setProducts(updatedProds.data.filter(p => p.isActive));

        } catch (error) {
            const trueError = error.response?.data?.error || error.response?.data?.message || 'Checkout failed.';
            setStatus({ type: 'error', message: `Checkout Error: ${trueError}` });
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center p-8">
            <Loader className="w-6 h-6 animate-spin text-slate-400" />
            <span className="ml-2 text-slate-600">Loading POS System...</span>
        </div>
    );

    return (
        <>
            {/* 1. Add className="no-print" to the main POS wrapper so it completely disappears on print */}
            <div className="no-print bg-slate-100 rounded-xl shadow-lg overflow-hidden" style={{ minHeight: 'calc(100vh - 120px)', maxHeight: 'calc(100vh - 120px)' }}>
                
                {/* ZONE 1: TOP CONTROL BAR */}
                <div style={{ backgroundColor: '#2c3e50', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        Terminal 1 
                        {status.message && (
                            <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', backgroundColor: status.type === 'success' ? '#27ae60' : '#e74c3c', marginLeft: '15px' }}>
                                {status.message}
                            </span>
                        )}
                    </div>
                    
                    {/* Parked Sales Queue */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', color: '#bdc3c7', textTransform: 'uppercase', letterSpacing: '1px' }}>Parked Queues:</span>
                        {heldCarts.length === 0 ? (
                            <span style={{ fontSize: '13px', color: '#7f8c8d', fontStyle: 'italic' }}>None</span>
                        ) : (
                            heldCarts.map(hc => (
                                <button key={hc.id} onClick={() => handleRestoreCart(hc.id)} style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#f39c12', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                                    {hc.customer} ({hc.time})
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* MAIN WORKING AREA */}
                <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100% - 60px)' }}>
                    
                    {/* ZONE 2: LEFT SIDE (Product Grid) */}
                    <div style={{ flex: 7, backgroundColor: '#f8f9fa', padding: '20px', overflowY: 'auto', borderRight: '2px solid #ddd' }}>
                        <h2 style={{ margin: '0 0 20px 0', color: '#34495e' }}>Product Catalog</h2>
                        {/* NEW: Text Search & Pagination Controls */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            
                            {/* Live Search Box */}
                            <input 
                                type="text" 
                                placeholder="Search products by name..." 
                                value={catalogSearch}
                                onChange={(e) => {
                                    setCatalogSearch(e.target.value);
                                    setCurrentPage(1); // Reset to page 1 when searching
                                }}
                                style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc', marginRight: '15px' }}
                            />

                            {/* Pagination Buttons */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#fff', padding: '5px 10px', borderRadius: '4px', border: '1px solid #ddd' }}>
                                
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    style={{ border: 'none', background: 'none', cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer', color: (currentPage === totalPages || totalPages === 0) ? '#bdc3c7' : '#2980b9', fontWeight: 'bold' }}
                                >
                                    Next ▶
                                </button>
                            </div>
                        </div>
                        {/* NEW: THE MANUAL BARCODE / SKU BAR */}
                        <form onSubmit={handleManualBarcodeSubmit} style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                            <input 
                                type="text" 
                                placeholder="Scan or Type Barcode / SKU and hit Enter..." 
                                value={barcodeInput}
                                onChange={(e) => setBarcodeInput(e.target.value)}
                                style={{ flex: 1, padding: '12px 15px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#fff', color: '#2c3e50' }}
                                autoFocus // Keeps the cursor here by default!
                            />
                            <button type="submit" style={{ padding: '0 20px', backgroundColor: '#2980b9', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                                Add
                            </button>
                        </form>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
                            {products.map(p => (
                                <div key={p._id} onClick={() => addToCart(p)} 
                                     style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', cursor: 'pointer', border: '1px solid #ddd', transition: 'transform 0.1s' }}
                                     onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                                     onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <div style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '5px' }}>{p.sku}</div>
                                    <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '10px', color: '#2c3e50', minHeight: '40px' }}>{p.name}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 'bold', color: '#2c3e50', fontSize: '16px' }}>₱{p.price.toFixed(2)}</span>
                                        {p.isPhysical && (
                                            <span style={{ fontSize: '11px', backgroundColor: '#f8f9fa', padding: '3px 6px', borderRadius: '4px', color: '#6c757d', fontWeight: 'bold' }}>
                                                Stock: {p.currentStock}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ZONE 3: RIGHT SIDE (The Active Ticket) */}
                    <div style={{ flex: 4, backgroundColor: '#fff', display: 'flex', flexDirection: 'column', padding: '0' }}>
                        <div style={{ padding: '20px', borderBottom: '2px solid #eee', backgroundColor: '#fdfefe' }}>
                            <input type="text" placeholder="Customer Name (Walk-in)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontWeight: 'bold', fontSize: '16px', backgroundColor: '#fff', color: '#2c3e50' }} />
                        </div>

                        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '20px' }}>
                            {cart.length === 0 ? (
                                <div style={{ textAlign: 'center', color: '#95a5a6', marginTop: '40px' }}>Cart is empty.<br/>Tap items to add.</div>
                            ) : (
                                cart.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#2c3e50' }}>{item.product.name}</div>
                                            <div style={{ color: '#7f8c8d', fontSize: '12px' }}>₱{item.price.toFixed(2)}</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input type="number" min="1" value={item.quantity} onChange={(e) => updateQuantity(item.product._id, e.target.value)} style={{ width: '50px', padding: '6px', textAlign: 'center', border: '1px solid #ccc', borderRadius: '4px' }} />
                                            <div style={{ fontWeight: 'bold', width: '65px', textAlign: 'right', color: '#2c3e50' }}>₱{(item.price * item.quantity).toFixed(2)}</div>
                                            <button onClick={() => removeFromCart(item.product._id)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '18px', padding: '0 5px' }}>×</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div style={{ padding: '20px', backgroundColor: '#fdfefe', borderTop: '2px solid #eee', boxShadow: '0 -4px 10px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '11px', color: '#7f8c8d', marginBottom: '4px', textTransform: 'uppercase' }}>Tax (%)</label>
                                    <input type="number" min="0" step="0.1" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', textAlign: 'center' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '11px', color: '#8e44ad', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>Discount (₱)</label>
                                    <input type="number" min="0" step="0.01" placeholder="0.00" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #8e44ad', textAlign: 'center', backgroundColor: '#f5eef8' }} />
                                </div>
                                <div style={{ flex: 2 }}>
                                    <label style={{ display: 'block', fontSize: '11px', color: '#7f8c8d', marginBottom: '4px', textTransform: 'uppercase' }}>Payment Type</label>
                                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontWeight: 'bold' }}>
                                        <option value="Cash">Cash</option>
                                        <option value="Card">Card</option>
                                        <option value="GCash">GCash</option>
                                        <option value="AR">Charge (AR)</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ backgroundColor: '#f4f6f7', padding: '15px', borderRadius: '6px', marginBottom: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#7f8c8d', marginBottom: '6px' }}>
                                    <span>Gross Subtotal:</span><span>₱{grossSubtotal.toFixed(2)}</span>
                                </div>
                                {Number(discountAmount) > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#e74c3c', marginBottom: '6px', fontWeight: 'bold' }}>
                                        <span>Discount Applied:</span><span>-₱{Number(discountAmount).toFixed(2)}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#7f8c8d', marginBottom: '6px' }}>
                                    <span>Vatable Sales:</span><span>₱{netSubtotal.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#7f8c8d', paddingBottom: '10px', borderBottom: '1px dashed #ccc', marginBottom: '10px' }}>
                                    <span>VAT ({taxRate}%):</span><span>₱{vatAmount.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '26px', fontWeight: '900', color: '#2c3e50' }}>
                                    <span>Total:</span><span>₱{totalAmount.toFixed(2)}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={handleHoldCart} disabled={cart.length === 0} style={{ flex: 1, padding: '15px', backgroundColor: cart.length === 0 ? '#ecf0f1' : '#f39c12', color: cart.length === 0 ? '#95a5a6' : 'white', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: 'bold', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', transition: '0.2s' }}>
                                    Hold
                                </button>
                                <button onClick={handleCheckout} disabled={cart.length === 0} style={{ flex: 3, padding: '15px', backgroundColor: cart.length === 0 ? '#bdc3c7' : '#27ae60', color: 'white', border: 'none', borderRadius: '6px', fontSize: '18px', fontWeight: 'bold', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', transition: '0.2s', boxShadow: cart.length > 0 ? '0 4px 15px rgba(39, 174, 96, 0.3)' : 'none' }}>
                                    Checkout & Pay
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Modal is now placed OUTSIDE the POS container so it doesn't inherit display rules */}
            {receiptData && (
                <div className="receipt-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                    
                    <div id="printable-area" style={{ backgroundColor: 'white', width: '320px', padding: '20px', borderRadius: '4px', fontFamily: 'monospace', color: 'black', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        
                        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                            <h2 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>ENTERPRISE ERP INC.</h2>
                            <div style={{ fontSize: '12px' }}>123 Business Road, City</div>
                            <div style={{ fontSize: '12px' }}>VAT REG TIN: 000-123-456-000</div>
                        </div>

                        <div style={{ fontSize: '12px', marginBottom: '15px', borderBottom: '1px dashed black', paddingBottom: '10px' }}>
                            <div><strong>OR Number:</strong> {receiptData.orNumber}</div>
                            <div><strong>Date:</strong> {new Date(receiptData.createdAt).toLocaleString()}</div>
                            <div><strong>Customer:</strong> {receiptData.customerName}</div>
                            <div><strong>Cashier:</strong> System Admin</div>
                        </div>

                        <table style={{ width: '100%', fontSize: '12px', marginBottom: '15px', borderBottom: '1px dashed black', paddingBottom: '10px' }}>
                            <tbody>
                                {receiptData.populatedItems.map((item, idx) => (
                                    <tr key={idx}>
                                        <td style={{ paddingBottom: '5px' }}>
                                            <div>{item.product.name}</div>
                                            <div>{item.quantity} x ₱{item.price.toFixed(2)}</div>
                                        </td>
                                        <td style={{ textAlign: 'right', verticalAlign: 'bottom', paddingBottom: '5px' }}>
                                            ₱{(item.quantity * item.price).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div style={{ fontSize: '12px', borderBottom: '1px dashed black', paddingBottom: '10px', marginBottom: '15px' }}>
                            {receiptData.discountAmount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Discount:</span><span>-₱{receiptData.discountAmount.toFixed(2)}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Vatable Sales:</span><span>₱{receiptData.vatableSales.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>VAT Amount:</span><span>₱{receiptData.vatAmount.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px', marginTop: '5px' }}>
                                <span>TOTAL DUE:</span><span>₱{receiptData.totalAmount.toFixed(2)}</span>
                            </div>
                        </div>

                        <div style={{ fontSize: '12px', textAlign: 'center' }}>
                            <div>Payment Method: <strong>{receiptData.paymentMethod}</strong></div>
                            <div style={{ marginTop: '10px' }}>THIS IS AN OFFICIAL RECEIPT</div>
                            <div>Thank you for your business!</div>
                        </div>

                        <div className="no-print" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button onClick={() => window.print()} style={{ flex: 1, padding: '10px', backgroundColor: '#2c3e50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>🖨️ Print OR</button>
                            <button onClick={() => setReceiptData(null)} style={{ flex: 1, padding: '10px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. The bulletproof CSS print reset */}
            <style>{`
                @media print {
                    /* Erase everything marked no-print entirely */
                    .no-print { display: none !important; }
                    
                    /* Strip browser margins and colors */
                    body, html { background-color: white !important; margin: 0; padding: 0; }
                    
                    /* Make the receipt fill the printable page cleanly without shadows */
                    #printable-area { 
                        box-shadow: none !important; 
                        margin: 0 auto !important;
                        width: 100% !important;
                        max-width: 350px;
                    }
                }
            `}</style>
        </>
    );
};

export default AdminPOS;