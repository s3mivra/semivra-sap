import React, { useState, useEffect } from 'react';
import { fetchAssets, registerAsset, runDepreciation } from '../services/fixedAssetService';
import { Monitor, CheckCircle, AlertTriangle, Plus, Settings } from 'lucide-react';

const AdminFixedAssets = () => {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isProcessing, setIsProcessing] = useState(false);

    // Form State
    const [form, setForm] = useState({
        assetName: '',
        purchaseDate: '',
        purchasePrice: '',
        salvageValue: '0',
        usefulLifeMonths: '60' // Default 5 years
    });
    
    const [depreciationPeriod, setDepreciationPeriod] = useState(new Date().toISOString().substring(0, 7));

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await fetchAssets();
            setAssets(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            setStatus({ type: 'error', message: 'Failed to load fixed assets.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        setStatus({ type: '', message: '' });

        try {
            await registerAsset({
                ...form,
                purchasePrice: Number(form.purchasePrice),
                salvageValue: Number(form.salvageValue),
                usefulLifeMonths: Number(form.usefulLifeMonths)
            });
            setStatus({ type: 'success', message: 'Asset registered successfully.' });
            setForm({ assetName: '', purchaseDate: '', purchasePrice: '', salvageValue: '0', usefulLifeMonths: '60' });
            loadData();
        } catch (error) {
            setStatus({ type: 'error', message: error.response?.data?.error || 'Failed to register asset.' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRunDepreciation = async () => {
        if(!window.confirm(`Run depreciation for period ${depreciationPeriod}? This will post to the General Ledger.`)) return;
        
        setIsProcessing(true);
        setStatus({ type: '', message: '' });

        try {
            const res = await runDepreciation(depreciationPeriod);
            setStatus({ type: 'success', message: res.message });
            loadData();
        } catch (error) {
            setStatus({ type: 'error', message: error.response?.data?.error || 'Failed to run depreciation.' });
        } finally {
            setIsProcessing(false);
        }
    };

    const formatMoney = (amount) => `$${(Number(amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    if (loading) return <div className="p-8 text-slate-500">Loading Asset Register...</div>;

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <Monitor className="text-indigo-600" size={32} />
                        Fixed Assets
                    </h1>
                    <p className="text-slate-500 mt-2">Manage company property and run automated depreciation schedules.</p>
                </div>
                
                {/* Depreciation Action Box */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Period</label>
                        <input 
                            type="month" 
                            value={depreciationPeriod}
                            onChange={(e) => setDepreciationPeriod(e.target.value)}
                            className="border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
                        />
                    </div>
                    <button 
                        onClick={handleRunDepreciation}
                        disabled={isProcessing}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 text-sm disabled:opacity-50"
                    >
                        <Settings size={16} />
                        Run Depreciation
                    </button>
                </div>
            </div>

            {status.message && (
                <div className={`p-4 rounded-lg mb-6 flex items-center gap-3 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {status.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                    <span className="font-semibold text-sm">{status.message}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Register Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-5 flex items-center gap-2">
                            <Plus size={20} className="text-indigo-500" />
                            Register New Asset
                        </h2>
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Asset Name</label>
                                <input required type="text" value={form.assetName} onChange={e => setForm({...form, assetName: e.target.value})} className="w-full border border-slate-300 p-2 rounded outline-none focus:border-indigo-500" placeholder="e.g., Delivery Truck #1" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Date</label>
                                <input required type="date" value={form.purchaseDate} onChange={e => setForm({...form, purchaseDate: e.target.value})} className="w-full border border-slate-300 p-2 rounded outline-none focus:border-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Price ($)</label>
                                <input required type="number" min="0" step="0.01" value={form.purchasePrice} onChange={e => setForm({...form, purchasePrice: e.target.value})} className="w-full border border-slate-300 p-2 rounded outline-none focus:border-indigo-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Salvage Value</label>
                                    <input required type="number" min="0" step="0.01" value={form.salvageValue} onChange={e => setForm({...form, salvageValue: e.target.value})} className="w-full border border-slate-300 p-2 rounded outline-none focus:border-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Life (Months)</label>
                                    <input required type="number" min="1" value={form.usefulLifeMonths} onChange={e => setForm({...form, usefulLifeMonths: e.target.value})} className="w-full border border-slate-300 p-2 rounded outline-none focus:border-indigo-500" />
                                </div>
                            </div>
                            <button type="submit" disabled={isProcessing} className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50">
                                Save Asset
                            </button>
                        </form>
                    </div>
                </div>

                {/* Asset Register Table */}
                <div className="lg:col-span-2">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="bg-slate-50 border-b border-slate-200 p-5">
                            <h2 className="text-lg font-bold text-slate-800">Asset Register</h2>
                        </div>
                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white sticky top-0 shadow-sm">
                                    <tr>
                                        <th className="py-3 px-4 font-bold text-slate-500 text-xs uppercase">Asset</th>
                                        <th className="py-3 px-4 font-bold text-slate-500 text-xs uppercase text-right">Cost</th>
                                        <th className="py-3 px-4 font-bold text-slate-500 text-xs uppercase text-right">Accum. Depr.</th>
                                        <th className="py-3 px-4 font-bold text-slate-500 text-xs uppercase text-right">Book Value</th>
                                        <th className="py-3 px-4 font-bold text-slate-500 text-xs uppercase text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {assets.length === 0 ? (
                                        <tr><td colSpan="5" className="p-8 text-center text-slate-500">No assets registered yet.</td></tr>
                                    ) : (
                                        assets.map(asset => (
                                            <tr key={asset._id} className="hover:bg-slate-50">
                                                <td className="py-3 px-4">
                                                    <div className="font-semibold text-slate-800">{asset.assetName}</div>
                                                    <div className="text-xs text-slate-500">Bought: {new Date(asset.purchaseDate).toLocaleDateString()}</div>
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono text-slate-600">{formatMoney(asset.purchasePrice)}</td>
                                                <td className="py-3 px-4 text-right font-mono text-red-500">{formatMoney(asset.accumulatedDepreciation)}</td>
                                                <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">{formatMoney(asset.currentBookValue)}</td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${asset.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                                                        {asset.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminFixedAssets;