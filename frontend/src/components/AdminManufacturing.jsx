import React, { useState, useEffect } from 'react';
import { getManufacturedProducts, executeProductionRun } from '../services/manufacturingService';
import { CheckCircle, Settings, AlertTriangle } from 'lucide-react';

const AdminManufacturing = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [form, setForm] = useState({
        documentDate: new Date().toISOString().split('T')[0],
        finishedProductId: '',
        quantityProduced: ''
    });

    useEffect(() => {
        const loadProducts = async () => {
            try {
                const data = await getManufacturedProducts();
                // Filter for products that have a BOM / are manufactured
                const manufacturedGoods = Array.isArray(data.data || data) 
                    ? (data.data || data).filter(p => p.isManufactured || (p.bom && p.bom.length > 0))
                    : [];
                setProducts(manufacturedGoods);
            } catch (error) {
                console.error('Failed to load products for manufacturing');
                setStatus({ type: 'error', message: 'Failed to load product catalog.' });
            } finally {
                setLoading(false);
            }
        };
        loadProducts();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ type: '', message: '' });
        
        if (Number(form.quantityProduced) <= 0) {
            return setStatus({ type: 'error', message: 'Quantity must be greater than zero.' });
        }

        setIsSubmitting(true);
        try {
            // Derive the financial period (YYYY-MM) from the document date
            const period = form.documentDate.substring(0, 7);

            const payload = {
                finishedProductId: form.finishedProductId,
                quantityProduced: Number(form.quantityProduced),
                period: period
            };

            const result = await executeProductionRun(payload);
            
            setStatus({ type: 'success', message: result.message || 'Production run completed! Inventory and ledgers updated.' });
            
            // Reset form
            setForm({ ...form, finishedProductId: '', quantityProduced: '' });
        } catch (error) {
            setStatus({ type: 'error', message: error.response?.data?.error || error.response?.data?.message || 'Production run failed.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-slate-500">Loading Manufacturing Module...</div>;

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                    <Settings className="text-indigo-600" size={32} />
                    Production & Manufacturing
                </h1>
                <p className="text-slate-500 mt-2">Execute multi-level BOM backflushing to update inventory and financial ledgers.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* LEFT COLUMN: Production Form */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">Execute Production Run</h2>
                    
                    {status.message && (
                        <div className={`p-4 rounded-lg mb-6 flex items-center gap-3 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {status.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                            <span className="font-semibold text-sm">{status.message}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Production Date</label>
                                <input 
                                    type="date" 
                                    required
                                    value={form.documentDate}
                                    onChange={(e) => setForm({...form, documentDate: e.target.value})}
                                    className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                <p className="text-xs text-slate-400 mt-1">Dictates the financial posting period.</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Finished Good (Assembly)</label>
                            <select 
                                required
                                value={form.finishedProductId}
                                onChange={(e) => setForm({...form, finishedProductId: e.target.value})}
                                className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                            >
                                <option value="">-- Select Product to Manufacture --</option>
                                {products.map(p => (
                                    <option key={p._id} value={p._id}>{p.code || p.sku} - {p.name}</option>
                                ))}
                            </select>
                            {products.length === 0 && (
                                <p className="text-xs text-red-500 mt-1 font-semibold">No manufactured products found in catalog. Create a product with a BOM first.</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Yield (Quantity Produced)</label>
                            <input 
                                type="number" 
                                min="0.01" step="0.01"
                                required
                                placeholder="e.g., 100"
                                value={form.quantityProduced}
                                onChange={(e) => setForm({...form, quantityProduced: e.target.value})}
                                className="w-full md:w-1/2 p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-lg"
                            />
                        </div>

                        <div className="pt-6 border-t border-slate-100 flex justify-end">
                            <button 
                                type="submit" 
                                disabled={isSubmitting || products.length === 0}
                                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Processing Run...' : 'Execute Backflush & Post Ledgers'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* RIGHT COLUMN: Instructions/Warning */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 h-fit">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-200 pb-2 mb-4">System Workflow</h3>
                    <ul className="space-y-4 text-sm text-slate-600">
                        <li className="flex gap-3">
                            <span className="font-bold text-indigo-600">1.</span>
                            <p><strong>BOM Resolution:</strong> The system recursively calculates all raw materials needed for the requested yield.</p>
                        </li>
                        <li className="flex gap-3">
                            <span className="font-bold text-indigo-600">2.</span>
                            <p><strong>Inventory Update:</strong> Raw materials are deducted from stock. The Finished Good inventory is increased.</p>
                        </li>
                        <li className="flex gap-3">
                            <span className="font-bold text-indigo-600">3.</span>
                            <p><strong>Financial Posting:</strong> An ACID-compliant journal entry automatically Debits FG Inventory and Credits RM Inventory based on moving average costs.</p>
                        </li>
                    </ul>
                </div>

            </div>
        </div>
    );
};

export default AdminManufacturing;