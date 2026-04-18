import React, { useState, useEffect } from 'react';
import { getUnreconciledCash, reconcileBulkTransactions } from '../services/reconciliationService'; // 🛡️ MATCH THE FUNCTION NAME!
import { CheckCircle, RefreshCw, AlertCircle, Search, DollarSign } from 'lucide-react';

const AdminBankReconciliation = () => {
    const [data, setData] = useState({ bookBalance: 0, unclearedTransactions: [] });
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [statementBalance, setStatementBalance] = useState('');
    const [statementDate, setStatementDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await getUnreconciledCash();
            
            // 🛡️ THE FIX: Your backend returns 'unclearedTransactions'
            // We must map that specifically to your 'transactions' state!
            if (res && res.success) {
                setData(res); 
                setTransactions(res.unclearedTransactions || []); 
                setSelectedIds(new Set());
            }
        } catch (error) {
            console.error("Full API Error:", error);
            setStatus({ 
                type: 'error', 
                message: error.response?.data?.message || 'Failed to load data.' 
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // 🧮 Toggle individual checkboxes
    const handleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    // 🛡️ Use _id to match your backend controller output
    if (newSelected.has(id)) {
        newSelected.delete(id);
    } else {
        newSelected.add(id);
    }
    setSelectedIds(newSelected);
};

    // 🧮 Select or Deselect ALL currently visible transactions
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allIds = filteredTransactions.map(t => t._id); // Use _id, not lineId
            setSelectedIds(new Set(allIds));
        } else {
            setSelectedIds(new Set());
        }
    };

    // 🚀 Submit to Backend
    const handleReconcile = async () => {
        if (selectedIds.size === 0) return;
        
        try {
            setIsSubmitting(true);
            // 🛡️ Call the specific service function
            await reconcileBulkTransactions(Array.from(selectedIds));
            
            setStatus({ type: 'success', message: 'Transactions locked successfully!' });
            setSelectedIds(new Set());
            loadData(); // Refresh the list
        } catch (error) {
            setStatus({ type: 'error', message: error.response?.data?.message || 'Failed' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // 🔍 Search Filter
    const filteredTransactions = transactions.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.entryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.amount.toString().includes(searchTerm)
    );

    // 💰 Dynamic Math for the Accountant
    const selectedTotal = Array.from(selectedIds).reduce((sum, id) => {
        const txn = transactions.find(t => t._id === id); // 🛡️ Use _id
        if (!txn) return sum;
        // Add deposits, subtract withdrawals
        return sum + (txn.type === 'Deposit' ? txn.amount : -txn.amount);
    }, 0);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <RefreshCw className="w-6 h-6 text-indigo-600" /> Bank Reconciliation
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Match ERP cash entries with your physical bank statements.</p>
                </div>
                
                {/* The "Sticky" Dashboard for the Accountant */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-6">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Selected Lines</p>
                        <p className="text-lg font-bold text-slate-700">{selectedIds.size}</p>
                    </div>
                    <div className="h-8 w-px bg-slate-200"></div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Selected Amount</p>
                        <p className={`text-lg font-bold ${selectedTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            ₱ {selectedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                    <button 
                        onClick={handleReconcile}
                        disabled={selectedIds.size === 0}
                        className={`ml-4 px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${selectedIds.size > 0 ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                    >
                        <CheckCircle className="w-4 h-4" /> Reconcile Match
                    </button>
                </div>
            </div>

            {status.message && (
                <div className={`p-4 rounded-lg font-medium text-sm flex items-center gap-2 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : status.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                    <AlertCircle className="w-4 h-4" /> {status.message}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <div className="relative w-72">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input 
                            type="text" 
                            placeholder="Search descriptions, amounts, refs..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-800 text-white">
                            <tr>
                                <th className="p-4 w-12 text-center">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-slate-600"
                                        onChange={handleSelectAll}
                                        checked={filteredTransactions.length > 0 && selectedIds.size === filteredTransactions.length}
                                    />
                                </th>
                                <th className="p-4 font-bold">Date</th>
                                <th className="p-4 font-bold">Document Ref</th>
                                <th className="p-4 font-bold">Bank Account</th>
                                <th className="p-4 font-bold">Description</th>
                                <th className="p-4 font-bold text-right">Deposit (IN)</th>
                                <th className="p-4 font-bold text-right">Withdrawal (OUT)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="7" className="p-8 text-center text-slate-500">Loading ledger data...</td></tr>
                            ) : filteredTransactions.length === 0 ? (
                                <tr><td colSpan="7" className="p-8 text-center text-slate-500 font-medium">🎉 All cash lines are currently reconciled!</td></tr>
                            ) : (
                                filteredTransactions.map((txn) => (
                                    <tr 
                                        key={txn._id} // 🛡️ Fixes the React Unique Key Error
                                        onClick={() => handleSelect(txn._id)} // 🛡️ Selects the specific row
                                        className={`cursor-pointer transition-colors ${selectedIds.has(txn._id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                                    >
                                        <td className="p-4 text-center">
                                            <input 
                                                type="checkbox" 
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                checked={selectedIds.has(txn._id)} // 🛡️ Checks only the clicked box
                                                onChange={() => {}} // Handled by tr onClick
                                            />
                                        </td>
                                        <td className="p-4 text-slate-600">{new Date(txn.date).toLocaleDateString()}</td>
                                        <td className="p-4 font-medium text-slate-900">{txn.entryNumber}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200">
                                                {txn.accountName}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-600">{txn.description}</td>
                                        
                                        {/* Deposits (Debits to Cash) */}
                                        <td className="p-4 text-right font-bold text-emerald-600">
                                            {txn.type === 'Deposit' ? `₱ ${txn.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}
                                        </td>
                                        
                                        {/* Withdrawals (Credits to Cash) */}
                                        <td className="p-4 text-right font-bold text-rose-600">
                                            {txn.type === 'Withdrawal' ? `₱ ${txn.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminBankReconciliation;