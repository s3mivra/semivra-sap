import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { PlusCircle, Trash2 } from 'lucide-react';

const CreateInvoice = () => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [products, setProducts] = useState([]);
    
    // Fetch products when the page loads
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                // Adjust this path if your product route is different!
                const res = await api.get('/products'); 
                setProducts(res.data.data || res.data);
            } catch (err) {
                console.error("Failed to fetch products", err);
                setMessage({ type: 'error', text: 'Failed to load product catalog.' });
            }
        };
        fetchProducts();
    }, []);

    // Form State
    const [formData, setFormData] = useState({
        customerName: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        description: '',
        isVatable: true,
        items: [{ productId: '', quantity: 1, unitPrice: 0, name: '' }] // The new dynamic array!
    });

    // Real-time Math Engine
    const baseAmount = formData.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
    const vatAmount = formData.isVatable ? baseAmount * 0.12 : 0;
    const totalReceivable = baseAmount + vatAmount;

    // Line Item Handlers
    const handleAddItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { productId: '', quantity: 1, unitPrice: 0, name: '' }]
        });
    };

    const handleRemoveItem = (index) => {
        if (formData.items.length <= 1) return;
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;

        // Auto-fill price when a product is selected
        if (field === 'productId') {
            const selectedProduct = products.find(p => p._id === value);
            if (selectedProduct) {
                newItems[index].unitPrice = selectedProduct.price || selectedProduct.sellingPrice || 0;
                newItems[index].name = selectedProduct.name;
            } else {
                newItems[index].unitPrice = 0;
                newItems[index].name = '';
            }
        }
        
        setFormData({ ...formData, items: newItems });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        // Clean up items (remove empty rows)
        const validItems = formData.items.filter(item => item.productId !== '' && item.quantity > 0);

        if (validItems.length === 0) {
            return setMessage({ type: 'error', text: 'Please select at least one valid product.' });
        }

        setLoading(true);
        try {
            const payload = { ...formData, items: validItems };
            const res = await api.post('/sales/invoice', payload); // Hits your new COGS controller!
            
            setMessage({ 
                type: 'success', 
                text: `Success! Invoice generated and inventory deducted. Journal Entry ${res.data.data.journalId} posted.` 
            });
            
            // Reset form
            setFormData({
                customerName: '',
                invoiceDate: new Date().toISOString().split('T')[0],
                description: '',
                isVatable: true,
                items: [{ productId: '', quantity: 1, unitPrice: 0, name: '' }]
            });
        } catch (err) {
            setMessage({ 
                type: 'error', 
                text: err.response?.data?.message || 'Failed to generate invoice.' 
            });
        } finally {
            setLoading(false);
        }
    };

    const formatMoney = (amount) => `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                
                {/* Header */}
                <div className="bg-slate-50 border-b border-slate-200 p-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Record Sales Invoice</h2>
                        <p className="text-slate-500 text-sm mt-1">Automates Accounts Receivable, Revenue, Output VAT, and COGS.</p>
                    </div>
                    <div className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1.5 rounded-full">
                        PERPETUAL INVENTORY ACTIVE
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3">
                    {/* LEFT SIDE: The Input Form */}
                    <form onSubmit={handleSubmit} className="p-6 lg:col-span-2 border-r border-slate-100">
                        
                        {message.text && (
                            <div className={`p-4 mb-6 rounded-lg text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                {message.text}
                            </div>
                        )}

                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Customer / Client Name *</label>
                                    <input 
                                        type="text" required placeholder="e.g., Infusions Quarter"
                                        value={formData.customerName} onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                                        className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Invoice Date *</label>
                                    <input 
                                        type="date" required
                                        value={formData.invoiceDate} onChange={(e) => setFormData({...formData, invoiceDate: e.target.value})}
                                        className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Transaction Description *</label>
                                <input 
                                    type="text" required placeholder="e.g., Retail Sales - Order #1004"
                                    value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            {/* --- LINE ITEMS TABLE --- */}
                            <div className="mt-6 border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-100 text-slate-600 font-semibold">
                                        <tr>
                                            <th className="p-3">Product / Service</th>
                                            <th className="p-3 w-24">Qty</th>
                                            <th className="p-3 w-32 text-right">Unit Price</th>
                                            <th className="p-3 w-32 text-right">Line Total</th>
                                            <th className="p-3 w-12 text-center"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {formData.items.map((item, index) => (
                                            <tr key={index} className="hover:bg-slate-50">
                                                <td className="p-2">
                                                    <select 
                                                        required value={item.productId}
                                                        onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                                                        className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-indigo-500"
                                                    >
                                                        <option value="">-- Select Product --</option>
                                                        {products.map(p => (
                                                            <option key={p._id} value={p._id}>
                                                                {p.sku} - {p.name} ({p.currentStock > 0 ? `${p.currentStock} in stock` : 'Out/Digital'})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-2">
                                                    <input 
                                                        type="number" min="1" required value={item.quantity}
                                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                        className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-indigo-500 text-center"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input 
                                                        type="number" min="0" step="0.01" required value={item.unitPrice}
                                                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                                                        className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-indigo-500 text-right"
                                                    />
                                                </td>
                                                <td className="p-3 text-right font-medium text-slate-800">
                                                    {formatMoney(item.quantity * item.unitPrice)}
                                                </td>
                                                <td className="p-2 text-center">
                                                    <button 
                                                        type="button" onClick={() => handleRemoveItem(index)}
                                                        disabled={formData.items.length <= 1}
                                                        className="text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4 mx-auto" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="p-3 bg-slate-50 border-t border-slate-200">
                                    <button 
                                        type="button" onClick={handleAddItem}
                                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                    >
                                        <PlusCircle className="w-4 h-4" /> Add Line Item
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4">
                                <label className="flex items-center space-x-3 cursor-pointer group">
                                    <input 
                                        type="checkbox" checked={formData.isVatable}
                                        onChange={(e) => setFormData({...formData, isVatable: e.target.checked})}
                                        className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                    />
                                    <div>
                                        <div className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">Apply 12% Output VAT</div>
                                        <div className="text-xs text-slate-500">Subject this transaction to Philippine Value Added Tax</div>
                                    </div>
                                </label>
                            </div>

                            <div className="pt-6">
                                <button 
                                    type="submit" 
                                    disabled={loading || baseAmount <= 0}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all shadow-sm shadow-indigo-200"
                                >
                                    {loading ? 'Generating Ledger Entries...' : 'Create Invoice & Post to Ledger'}
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* RIGHT SIDE: Real-Time Tax Summary */}
                    <div className="bg-slate-50 p-6 flex flex-col border-t lg:border-t-0 border-slate-200">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Financial Impact</h3>
                        
                        <div className="space-y-4 flex-grow">
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                <div className="text-xs font-semibold text-slate-500 mb-1">Net Revenue (Credits)</div>
                                <div className="text-lg font-bold text-slate-900">{formatMoney(baseAmount)}</div>
                                <div className="text-[10px] text-slate-400 mt-1">Hits the P&L immediately</div>
                            </div>

                            {formData.isVatable && (
                                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-amber-500">
                                    <div className="text-xs font-semibold text-slate-500 mb-1">Output VAT Liability (Credits)</div>
                                    <div className="text-lg font-bold text-slate-900">{formatMoney(vatAmount)}</div>
                                    <div className="text-[10px] text-amber-600 font-medium mt-1">Due to BIR</div>
                                </div>
                            )}

                            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-sm mt-auto">
                                <div className="text-xs font-semibold text-slate-300 mb-1">Accounts Receivable (Debits)</div>
                                <div className="text-2xl font-black text-white">{formatMoney(totalReceivable)}</div>
                                <div className="text-[10px] text-emerald-400 font-medium mt-1">Total amount client must pay</div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CreateInvoice;