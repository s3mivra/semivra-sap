import React, { useState, useEffect } from 'react';
import api from '../services/api'; 

const JournalEntryForm = () => {
    // 1. Core State
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    // 💡 NEW: Accrual Engine State
    const [isAccrual, setIsAccrual] = useState(false);

    // 2. Form State
    const [header, setHeader] = useState({
        documentDate: new Date().toISOString().split('T')[0], // Defaults to today
        description: '',
        sourceDocument: ''
    });

    // 3. Dynamic Lines State (Requires at least 2 lines for double-entry)
    const [lines, setLines] = useState([
        { account: '', debit: '', credit: '', memo: '' },
        { account: '', debit: '', credit: '', memo: '' }
    ]);

    // 4. Math State
    const [totals, setTotals] = useState({ debit: 0, credit: 0 });
    const isBalanced = totals.debit === totals.credit && totals.debit > 0;

    // Fetch the Chart of Accounts when the page loads
    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                const res = await api.get('/accounting/accounts');
                setAccounts(res.data.data.filter(acc => acc.isActive !== false));
            } catch (err) {
                setMessage({ type: 'error', text: 'Failed to load Chart of Accounts.' });
            }
        };
        fetchAccounts();
    }, []);

    // Real-time math engine: Recalculate totals whenever lines change
    useEffect(() => {
        let currentDebit = 0;
        let currentCredit = 0;
        lines.forEach(line => {
            currentDebit += Number(line.debit) || 0;
            currentCredit += Number(line.credit) || 0;
        });
        
        // Handle JavaScript floating point quirks
        setTotals({
            debit: Math.round(currentDebit * 100) / 100,
            credit: Math.round(currentCredit * 100) / 100
        });
    }, [lines]);

    // Handlers
    const handleAddLine = () => {
        setLines([...lines, { account: '', debit: '', credit: '', memo: '' }]);
    };

    const handleRemoveLine = (index) => {
        if (lines.length <= 2) return; // Enforce minimum 2 lines
        const newLines = lines.filter((_, i) => i !== index);
        setLines(newLines);
    };

    const handleLineChange = (index, field, value) => {
        const newLines = [...lines];
        newLines[index][field] = value;
        
        // UI Polish: If they type in Debit, clear the Credit field (and vice versa)
        if (field === 'debit' && value !== '') newLines[index]['credit'] = '';
        if (field === 'credit' && value !== '') newLines[index]['debit'] = '';
        
        setLines(newLines);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        // Final Validation
        if (!isBalanced) {
            return setMessage({ type: 'error', text: 'Journal Entry is out of balance. Debits must equal Credits.' });
        }

        // Clean up the data (remove empty lines, ensure numbers)
        const validLines = lines.filter(l => l.account !== '').map(l => ({
            account: l.account,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            memo: l.memo
        }));

        if (validLines.length < 2) {
            return setMessage({ type: 'error', text: 'Please select accounts for at least two lines.' });
        }

        setLoading(true);
        try {
            // 💡 NEW: Dynamically shape payload for the Accrual Controller
            const period = header.documentDate.substring(0, 7); // Extracts 'YYYY-MM'
            
            const payload = { 
                ...header, 
                entryNumber: header.sourceDocument, // Map for backend
                postingDate: header.documentDate,   // Map for backend
                period,
                lines: validLines 
            };

            // 💡 NEW: Route dynamically based on the Accrual toggle
            const endpoint = isAccrual ? '/journal/accrual' : '/accounting/journals';
            await api.post(endpoint, payload);
            
            setMessage({ 
                type: 'success', 
                text: isAccrual 
                    ? 'Accrual successfully posted and reversing entry queued for next month!' 
                    : 'Journal Entry posted successfully! The ledger has been updated.' 
            });
            
            // Reset form
            setHeader({ ...header, description: '', sourceDocument: '' });
            setIsAccrual(false);
            setLines([{ account: '', debit: '', credit: '', memo: '' }, { account: '', debit: '', credit: '', memo: '' }]);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.error || err.response?.data?.message || 'Failed to post entry.' });
        } finally {
            setLoading(false);
        }
    };

    const formatMoney = (amount) => `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                
                {/* Header Section */}
                <div className="bg-slate-50 border-b border-slate-200 p-6 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Record Journal Entry</h2>
                        <p className="text-slate-500 text-sm mt-1">Manual double-entry posting to the General Ledger.</p>
                    </div>
                    
                    {/* 💡 NEW: ACCRUAL TOGGLE UI */}
                    <div className={`flex items-center gap-3 border p-3 rounded-lg transition-colors ${isAccrual ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                        <input 
                            type="checkbox" 
                            id="accrualToggle" 
                            checked={isAccrual} 
                            onChange={(e) => setIsAccrual(e.target.checked)}
                            className="w-5 h-5 text-indigo-600 rounded cursor-pointer border-slate-300 focus:ring-indigo-500"
                        />
                        <label htmlFor="accrualToggle" className={`text-sm font-bold cursor-pointer select-none ${isAccrual ? 'text-indigo-900' : 'text-slate-600'}`}>
                            Is Accrual (Auto-Reverse Next Month)
                        </label>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {/* Top Meta Data */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Document Date *</label>
                            <input 
                                type="date" 
                                required
                                value={header.documentDate}
                                onChange={(e) => setHeader({...header, documentDate: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Reference / Source Doc</label>
                            <input 
                                type="text" 
                                placeholder="e.g., INV-001 or Payroll-Mar15"
                                value={header.sourceDocument}
                                onChange={(e) => setHeader({...header, sourceDocument: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Description / Purpose *</label>
                            <input 
                                type="text" 
                                required
                                placeholder="What is this transaction for?"
                                value={header.description}
                                onChange={(e) => setHeader({...header, description: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Dynamic Lines Table */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-100 text-slate-600">
                                <tr>
                                    <th className="p-3 w-1/3">Account</th>
                                    <th className="p-3 w-1/4">Memo (Optional)</th>
                                    <th className="p-3 w-1/6 text-right">Debit</th>
                                    <th className="p-3 w-1/6 text-right">Credit</th>
                                    <th className="p-3 w-12 text-center"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {lines.map((line, index) => (
                                    <tr key={index} className="hover:bg-slate-50/50">
                                        <td className="p-2">
                                            <select 
                                                required
                                                value={line.account}
                                                onChange={(e) => handleLineChange(index, 'account', e.target.value)}
                                                className="w-full border border-slate-300 rounded px-3 py-2 text-slate-700 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                            >
                                                <option value="">-- Select Account --</option>
                                                {accounts.map(acc => (
                                                    <option key={acc._id} value={acc._id}>
                                                        {acc.accountCode} - {acc.accountName} ({acc.accountType})
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-2">
                                            <input 
                                                type="text" 
                                                placeholder="Line details..."
                                                value={line.memo}
                                                onChange={(e) => handleLineChange(index, 'memo', e.target.value)}
                                                className="w-full border border-slate-300 rounded px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input 
                                                type="number" 
                                                min="0" step="0.01"
                                                placeholder="0.00"
                                                value={line.debit}
                                                onChange={(e) => handleLineChange(index, 'debit', e.target.value)}
                                                disabled={line.credit > 0}
                                                className="w-full border border-slate-300 rounded px-3 py-2 text-right focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input 
                                                type="number" 
                                                min="0" step="0.01"
                                                placeholder="0.00"
                                                value={line.credit}
                                                onChange={(e) => handleLineChange(index, 'credit', e.target.value)}
                                                disabled={line.debit > 0}
                                                className="w-full border border-slate-300 rounded px-3 py-2 text-right focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100"
                                            />
                                        </td>
                                        <td className="p-2 text-center">
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveLine(index)}
                                                disabled={lines.length <= 2}
                                                className="text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors font-bold"
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        {/* Add Line Button */}
                        <div className="p-3 bg-slate-50 border-t border-slate-200">
                            <button 
                                type="button" 
                                onClick={handleAddLine}
                                className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                            >
                                + Add Line
                            </button>
                        </div>
                    </div>

                    {/* Math & Totals Footer */}
                    <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-t border-slate-200 pt-6">
                        
                        {/* Error/Success Messages */}
                        <div className="w-full md:w-1/2">
                            {message.text && (
                                <div className={`p-4 rounded-lg text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                    {message.text}
                                </div>
                            )}
                        </div>

                        {/* Balance Check */}
                        <div className="w-full md:w-96 bg-slate-50 border border-slate-200 rounded-lg p-4">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-semibold text-slate-600">Total Debits:</span>
                                <span className="font-bold text-slate-900">{formatMoney(totals.debit)}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-3 pb-3 border-b border-slate-200">
                                <span className="font-semibold text-slate-600">Total Credits:</span>
                                <span className="font-bold text-slate-900">{formatMoney(totals.credit)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-slate-800">Difference:</span>
                                <span className={`font-black ${isBalanced ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {formatMoney(Math.abs(totals.debit - totals.credit))}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="mt-6 flex justify-end">
                        <button 
                            type="submit" 
                            disabled={!isBalanced || loading}
                            className={`px-8 py-3 rounded-lg font-bold text-white transition-all shadow-sm ${
                                isBalanced && !loading 
                                ? (isAccrual ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-slate-900 hover:bg-slate-800')
                                : 'bg-slate-300 cursor-not-allowed'
                            }`}
                        >
                            {loading ? 'Posting to Ledger...' : (isAccrual ? 'Post Accrual & Queue Reversal' : 'Post Journal Entry')}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default JournalEntryForm;