import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { CheckSquare, Square, AlertCircle, RefreshCw } from 'lucide-react';

const AdminBankReconciliation = () => {
    const [transactions, setTransactions] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    // Target bank balance input (for the accountant to check their math)
    const [targetBankBalance, setTargetBankBalance] = useState('');

    const fetchUnreconciled = async () => {
        setLoading(true);
        try {
            const res = await api.get('/reconciliation/unreconciled');
            setTransactions(res.data.data || []);
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to fetch unreconciled transactions.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUnreconciled();
    }, []);

    const toggleSelection = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleReconcile = async () => {
        if (selectedIds.length === 0) return;
        
        setProcessing(true);
        setMessage({ type: '', text: '' });
        
        try {
            await api.post('/reconciliation/match', { matchedLineIds: selectedIds });
            setMessage({ type: 'success', text: `Successfully reconciled ${selectedIds.length} transactions.` });
            setSelectedIds([]);
            fetchUnreconciled(); // Refresh the list
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to reconcile.' });
        } finally {
            setProcessing(false);
        }
    };

    const formatMoney = (amount) => `₱${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Calculate the total of currently selected items
    const selectedTotal = transactions
        .filter(t => selectedIds.includes(t.lineId))
        .reduce((sum, t) => t.type === 'Deposit' ? sum + t.amount : sum - t.amount, 0);

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-sm mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-light text-slate-900 mb-1">Bank Reconciliation</h1>
                    <p className="text-slate-500 text-sm">Match ledger entries against your physical bank statement.</p>
                </div>
                <div className="w-64">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Target Bank Balance</label>
                    <input 
                        type="number" 
                        placeholder="Enter statement balance"
                        value={targetBankBalance}
                        onChange={(e) => setTargetBankBalance(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-4 py-2 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
            </div>

            {message.text && (
                <div className={`p-4 mb-6 rounded-lg text-sm font-medium flex items-center gap-2 ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                    <AlertCircle className="w-4 h-4" />
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT: Transaction List */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[600px]">
                    <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
                        <h2 className="font-bold text-slate-800">Unreconciled Ledger Cash</h2>
                        <button onClick={fetchUnreconciled} className="text-slate-400 hover:text-indigo-600 transition-colors">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    
                    <div className="overflow-y-auto flex-grow p-0">
                        {loading ? (
                            <div className="flex justify-center items-center h-full text-slate-400">Loading ledger data...</div>
                        ) : transactions.length === 0 ? (
                            <div className="flex flex-col justify-center items-center h-full text-slate-400">
                                <CheckSquare className="w-12 h-12 mb-2 opacity-20" />
                                <p>All caught up! No pending cash transactions.</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm text-left">
                                <thead className="bg-white sticky top-0 border-b border-slate-100 shadow-sm z-10 text-slate-500">
                                    <tr>
                                        <th className="p-3 w-12 text-center"></th>
                                        <th className="p-3">Date & Ref</th>
                                        <th className="p-3">Description</th>
                                        <th className="p-3 text-right">Withdrawal</th>
                                        <th className="p-3 text-right">Deposit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {transactions.map((t) => {
                                        const isSelected = selectedIds.includes(t.lineId);
                                        return (
                                            <tr 
                                                key={t.lineId} 
                                                onClick={() => toggleSelection(t.lineId)}
                                                className={`cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                                            >
                                                <td className="p-3 text-center">
                                                    {isSelected ? (
                                                        <CheckSquare className="w-5 h-5 text-indigo-600 mx-auto" />
                                                    ) : (
                                                        <Square className="w-5 h-5 text-slate-300 mx-auto" />
                                                    )}
                                                </td>
                                                <td className="p-3">
                                                    <div className="font-medium text-slate-700">{new Date(t.date).toLocaleDateString()}</div>
                                                    <div className="text-xs text-slate-400">{t.entryNumber}</div>
                                                </td>
                                                <td className="p-3 text-slate-600">{t.description}</td>
                                                <td className="p-3 text-right text-slate-600">
                                                    {t.type === 'Withdrawal' ? formatMoney(t.amount) : '-'}
                                                </td>
                                                <td className="p-3 text-right font-medium text-slate-800">
                                                    {t.type === 'Deposit' ? formatMoney(t.amount) : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* RIGHT: Math & Submit Panel */}
                <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 flex flex-col p-6 text-white h-fit sticky top-24">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-700 pb-2">Reconciliation Summary</h3>
                    
                    <div className="space-y-4 mb-8">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-300 text-sm">Transactions Selected</span>
                            <span className="font-bold text-lg">{selectedIds.length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-300 text-sm">Net Cleared Amount</span>
                            <span className={`font-bold text-xl ${selectedTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {formatMoney(selectedTotal)}
                            </span>
                        </div>
                        
                        {targetBankBalance && (
                            <div className="mt-6 pt-4 border-t border-slate-700 bg-slate-900/50 p-4 rounded-lg">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-slate-400 text-xs font-bold uppercase">Statement Match</span>
                                    {Math.abs(Number(targetBankBalance) - selectedTotal) < 0.01 ? (
                                        <span className="text-emerald-400 text-xs font-bold uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Balanced</span>
                                    ) : (
                                        <span className="text-amber-400 text-xs font-bold uppercase">Difference</span>
                                    )}
                                </div>
                                <div className="text-right font-black text-2xl">
                                    {formatMoney(Math.abs(Number(targetBankBalance) - selectedTotal))}
                                </div>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={handleReconcile}
                        disabled={selectedIds.length === 0 || processing}
                        className="mt-auto w-full py-4 rounded-lg font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-500 hover:bg-indigo-400"
                    >
                        {processing ? 'Locking Ledger...' : 'Mark as Reconciled'}
                    </button>
                    <p className="text-center text-[10px] text-slate-500 mt-3">Reconciled transactions cannot be voided.</p>
                </div>

            </div>
        </div>
    );
};

export default AdminBankReconciliation;