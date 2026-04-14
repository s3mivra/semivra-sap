import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Monitor, TrendingDown, PlusCircle, AlertCircle, PlayCircle, CheckCircle2 } from 'lucide-react';

const AdminFixedAssets = () => {
    const [assets, setAssets] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [depreciating, setDepreciating] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [formData, setFormData] = useState({
        assetName: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        purchaseCost: '',
        salvageValue: '0',
        usefulLifeMonths: '36',
        assetAccount: '',
        expenseAccount: '',
        accumulatedDepreciationAccount: ''
    });

    const fetchData = async () => {
        try {
            const [assetsRes, accountsRes] = await Promise.all([
                api.get('/assets'),
                api.get('/accounting/accounts') // Fetches the CoA we built earlier!
            ]);
            setAssets(assetsRes.data.data || []);
            setAccounts(accountsRes.data.data || accountsRes.data || []);
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to load assets or accounts.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        
        try {
            await api.post('/assets', formData);
            setMessage({ type: 'success', text: 'Asset registered successfully.' });
            setFormData({
                ...formData,
                assetName: '',
                purchaseCost: '',
                salvageValue: '0'
            });
            fetchData(); // Refresh table
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to register asset.' });
        }
    };

    const handleRunDepreciation = async () => {
        if (!window.confirm("Are you sure? This will generate permanent Journal Entries for all active assets for this month.")) return;
        
        setDepreciating(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await api.post('/assets/depreciate');
            setMessage({ 
                type: 'success', 
                text: `${res.data.message} (Total Depreciated: ₱${res.data.totalDepreciated.toLocaleString()})` 
            });
            fetchData(); // Refresh to show new Net Book Values
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to run depreciation.' });
        } finally {
            setDepreciating(false);
        }
    };

    const formatMoney = (amount) => `₱${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-sm mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-light text-slate-900 mb-1">Fixed Assets & Depreciation</h1>
                    <p className="text-slate-500 text-sm">Register equipment and automate straight-line depreciation to the ledger.</p>
                </div>
                <button 
                    onClick={handleRunDepreciation}
                    disabled={depreciating || assets.length === 0}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-sm flex items-center gap-2"
                >
                    {depreciating ? <TrendingDown className="w-5 h-5 animate-pulse" /> : <PlayCircle className="w-5 h-5" />}
                    {depreciating ? 'Processing Ledger...' : 'Run Monthly Depreciation'}
                </button>
            </div>

            {message.text && (
                <div className={`p-4 mb-6 rounded-lg text-sm font-medium flex items-center gap-2 ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                    {message.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT: Asset Registration Form */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-fit">
                    <div className="bg-slate-50 border-b border-slate-200 p-4">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2">
                            <PlusCircle className="w-4 h-4 text-indigo-600" /> Capitalize New Asset
                        </h2>
                    </div>
                    <form onSubmit={handleSubmit} className="p-5 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Asset Name</label>
                            <input 
                                type="text" required placeholder="e.g., MacBook Pro M3"
                                value={formData.assetName} onChange={(e) => setFormData({...formData, assetName: e.target.value})}
                                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Purchase Cost</label>
                                <input 
                                    type="number" required min="1"
                                    value={formData.purchaseCost} onChange={(e) => setFormData({...formData, purchaseCost: e.target.value})}
                                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Date</label>
                                <input 
                                    type="date" required
                                    value={formData.purchaseDate} onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
                                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Salvage Value</label>
                                <input 
                                    type="number" required min="0"
                                    value={formData.salvageValue} onChange={(e) => setFormData({...formData, salvageValue: e.target.value})}
                                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Useful Life (Mo)</label>
                                <input 
                                    type="number" required min="1"
                                    value={formData.usefulLifeMonths} onChange={(e) => setFormData({...formData, usefulLifeMonths: e.target.value})}
                                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                            <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">Ledger Routing</label>
                            
                            <select required value={formData.assetAccount} onChange={(e) => setFormData({...formData, assetAccount: e.target.value})} className="w-full mb-2 border border-slate-300 rounded px-3 py-2 text-xs text-slate-600 focus:ring-1 focus:ring-indigo-500 outline-none">
                                <option value="">Select Asset Account (e.g. Office Equipment)</option>
                                {accounts.filter(a => a.accountType === 'Asset' || a.type === 'Asset').map(a => (
                                    <option key={a._id} value={a._id}>{a.accountCode || a.code} - {a.accountName || a.name}</option>
                                ))}
                            </select>

                            <select required value={formData.expenseAccount} onChange={(e) => setFormData({...formData, expenseAccount: e.target.value})} className="w-full mb-2 border border-slate-300 rounded px-3 py-2 text-xs text-slate-600 focus:ring-1 focus:ring-indigo-500 outline-none">
                                <option value="">Select Expense Account (e.g. Depreciation Exp)</option>
                                {accounts.filter(a => a.accountType === 'Expense' || a.type === 'Expense').map(a => (
                                    <option key={a._id} value={a._id}>{a.accountCode || a.code} - {a.accountName || a.name}</option>
                                ))}
                            </select>

                            <select required value={formData.accumulatedDepreciationAccount} onChange={(e) => setFormData({...formData, accumulatedDepreciationAccount: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2 text-xs text-slate-600 focus:ring-1 focus:ring-indigo-500 outline-none">
                                <option value="">Select Acc. Dep. Account (e.g. Acc. Dep. - Equip)</option>
                                {accounts.filter(a => a.accountType === 'Asset' || a.type === 'Asset').map(a => (
                                    <option key={a._id} value={a._id}>{a.accountCode || a.code} - {a.accountName || a.name}</option>
                                ))}
                            </select>
                        </div>

                        <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 rounded transition-colors mt-4">
                            Capitalize Asset
                        </button>
                    </form>
                </div>

                {/* RIGHT: Asset Register Table */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-200 p-4">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2">
                            <Monitor className="w-4 h-4 text-indigo-600" /> Active Asset Register
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white text-slate-500 border-b border-slate-100">
                                <tr>
                                    <th className="p-4 font-semibold">Asset Details</th>
                                    <th className="p-4 font-semibold text-right">Original Cost</th>
                                    <th className="p-4 font-semibold text-right">Acc. Depreciation</th>
                                    <th className="p-4 font-semibold text-right">Net Book Value</th>
                                    <th className="p-4 font-semibold text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {assets.length === 0 ? (
                                    <tr><td colSpan="5" className="p-8 text-center text-slate-400">No assets registered.</td></tr>
                                ) : (
                                    assets.map((asset) => (
                                        <tr key={asset._id} className="hover:bg-slate-50">
                                            <td className="p-4">
                                                <div className="font-bold text-slate-800">{asset.assetName}</div>
                                                <div className="text-xs text-slate-400">{asset.assetCode} | {asset.usefulLifeMonths} mo life</div>
                                            </td>
                                            <td className="p-4 text-right font-medium text-slate-600">{formatMoney(asset.purchaseCost)}</td>
                                            <td className="p-4 text-right text-rose-500 font-medium">({formatMoney(asset.accumulatedDepreciation)})</td>
                                            <td className="p-4 text-right font-black text-slate-900">{formatMoney(asset.netBookValue || (asset.purchaseCost - asset.accumulatedDepreciation))}</td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${asset.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
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
    );
};

export default AdminFixedAssets;