import React, { useState, useEffect } from 'react';
import { fetchAssets, registerAsset, runDepreciation } from '../services/fixedAssetService';
import { Monitor, CheckCircle, AlertTriangle, Plus, Settings, Loader } from 'lucide-react';

const AdminFixedAssets = () => {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isProcessing, setIsProcessing] = useState(false);

    const [form, setForm] = useState({
        assetCode: '',
        assetName: '',
        purchaseDate: '',
        purchasePrice: '',
        salvageValue: '0',
        usefulLifeMonths: '60' 
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
            setForm({ assetCode: '', assetName: '', purchaseDate: '', purchasePrice: '', salvageValue: '0', usefulLifeMonths: '60' });
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

    const formatMoney = (amount) => `₱${(Number(amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    if (loading) return <div style={{ padding: '20px' }}>Loading Asset Register...</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            
            {/* HEADER */}
            <div style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Monitor size={28} color="#2c3e50" />
                    <div>
                        <h2 style={{ margin: 0, color: '#2c3e50' }}>Fixed Assets</h2>
                        <p style={{ margin: 0, fontSize: '13px', color: '#7f8c8d' }}>Property & Depreciation Management</p>
                    </div>
                </div>
                <span style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: '#e8f8f5', color: '#27ae60', borderRadius: '4px', fontWeight: 'bold' }}>
                    Ledger Integrated
                </span>
            </div>

            {/* STATUS MESSAGES */}
            {status.message && (
                <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: status.type === 'success' ? '#e8f8f5' : '#fdedec', color: status.type === 'success' ? '#27ae60' : '#c0392b' }}>
                    {status.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                    <strong>{status.message}</strong>
                </div>
            )}

            {/* DEPRECIATION ENGINE BAR */}
            <div style={{ backgroundColor: '#ebf5fb', border: '1px solid #a9cce3', borderRadius: '8px', padding: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h3 style={{ margin: '0 0 5px 0', color: '#2980b9' }}>Depreciation Engine</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#34495e' }}>Calculates straight-line decay and posts automatically to the GL.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', fontWeight: 'bold', color: '#2c3e50' }}>Target Period</label>
                        <input 
                            type="month" 
                            value={depreciationPeriod}
                            onChange={(e) => setDepreciationPeriod(e.target.value)}
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                    </div>
                    <button 
                        onClick={handleRunDepreciation}
                        disabled={isProcessing}
                        style={{ padding: '8px 16px', height: '35px', backgroundColor: '#2980b9', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', opacity: isProcessing ? 0.7 : 1 }}
                    >
                        {isProcessing ? <Loader size={16} className="animate-spin" /> : <Settings size={16} />}
                        Run Engine
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
                
                {/* LEFT: REGISTER FORM */}
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', height: 'fit-content' }}>
                    <h3 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#2c3e50', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                        <Plus size={18} /> Register New Asset
                    </h3>
                    <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', color: '#7f8c8d' }}>Asset Code</label>
                            <input required type="text" value={form.assetCode} onChange={e => setForm({...form, assetCode: e.target.value.toUpperCase()})} placeholder="EQP-001" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', color: '#7f8c8d' }}>Name / Description</label>
                            <input required type="text" value={form.assetName} onChange={e => setForm({...form, assetName: e.target.value})} placeholder="Delivery Truck" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', color: '#7f8c8d' }}>Purchase Date</label>
                            <input required type="date" value={form.purchaseDate} onChange={e => setForm({...form, purchaseDate: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', color: '#7f8c8d' }}>Purchase Price (₱)</label>
                            <input required type="number" min="0" step="0.01" value={form.purchasePrice} onChange={e => setForm({...form, purchasePrice: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', color: '#7f8c8d' }}>Salvage Val</label>
                                <input required type="number" min="0" step="0.01" value={form.salvageValue} onChange={e => setForm({...form, salvageValue: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', color: '#7f8c8d' }}>Life (Mos)</label>
                                <input required type="number" min="1" value={form.usefulLifeMonths} onChange={e => setForm({...form, usefulLifeMonths: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                            </div>
                        </div>
                        <button type="submit" disabled={isProcessing} style={{ padding: '10px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '5px' }}>
                            {isProcessing ? 'Saving...' : 'Register Asset'}
                        </button>
                    </form>
                </div>

                {/* RIGHT: ASSET TABLE */}
                <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                            <thead style={{ backgroundColor: '#f8f9fa', color: '#7f8c8d' }}>
                                <tr>
                                    <th style={{ padding: '12px 15px', borderBottom: '2px solid #eee' }}>Asset Details</th>
                                    <th style={{ padding: '12px 15px', borderBottom: '2px solid #eee', textAlign: 'right' }}>Cost</th>
                                    <th style={{ padding: '12px 15px', borderBottom: '2px solid #eee', textAlign: 'right' }}>Accum. Depr.</th>
                                    <th style={{ padding: '12px 15px', borderBottom: '2px solid #eee', textAlign: 'right' }}>Book Value</th>
                                    <th style={{ padding: '12px 15px', borderBottom: '2px solid #eee', textAlign: 'center' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assets.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#7f8c8d' }}>No assets registered yet.</td>
                                    </tr>
                                ) : (
                                    assets.map(asset => (
                                        <tr key={asset._id} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '12px 15px' }}>
                                                <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>{asset.assetCode}</div>
                                                <div style={{ color: '#7f8c8d', fontSize: '12px' }}>{asset.assetName}</div>
                                                <div style={{ color: '#bdc3c7', fontSize: '11px', marginTop: '2px' }}>Bought: {new Date(asset.purchaseDate).toLocaleDateString()}</div>
                                            </td>
                                            <td style={{ padding: '12px 15px', textAlign: 'right', color: '#7f8c8d' }}>
                                                {formatMoney(asset.purchaseCost)}
                                            </td>
                                            <td style={{ padding: '12px 15px', textAlign: 'right', color: '#e74c3c' }}>
                                                {formatMoney(asset.accumulatedDepreciation)}
                                            </td>
                                            <td style={{ padding: '12px 15px', textAlign: 'right', fontWeight: 'bold', color: '#27ae60' }}>
                                                {formatMoney(asset.currentBookValue)}
                                            </td>
                                            <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                                                <span style={{ 
                                                    padding: '4px 8px', 
                                                    borderRadius: '4px', 
                                                    fontSize: '11px', 
                                                    fontWeight: 'bold',
                                                    backgroundColor: asset.status === 'Active' ? '#e8f8f5' : '#f4f6f7',
                                                    color: asset.status === 'Active' ? '#27ae60' : '#7f8c8d'
                                                }}>
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