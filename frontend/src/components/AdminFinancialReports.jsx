import React, { useState, useEffect } from 'react';
import api from '../services/api'; // Or your reportService imports
import { fetchBalanceSheet, fetchIncomeStatement, fetchTrialBalance } from '../services/reportService';
import { FileText, Calendar, Loader, Printer, Scale, CheckCircle, AlertTriangle } from 'lucide-react';

const AdminFinancialReports = () => {
    const [activeTab, setActiveTab] = useState('pl'); // 'pl', 'bs', or 'tb'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // P&L State
    const [plData, setPlData] = useState(null);
    const [dates, setDates] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    // Balance Sheet State
    const [bsData, setBsData] = useState(null);

    // Trial Balance State
    const [tbData, setTbData] = useState(null);
    const [tbDate, setTbDate] = useState(new Date().toISOString().split('T')[0]);

    const loadIncomeStatement = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchIncomeStatement(dates.start, dates.end);
            // 🛡️ Safely unwrap double-nested Axios data
            const payload = res.data?.data ? res.data.data : res.data;
            setPlData(payload);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load Income Statement');
        } finally {
            setLoading(false);
        }
    };

    const loadBalanceSheet = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchBalanceSheet();
            // 🛡️ Safely unwrap double-nested Axios data
            const payload = res.data?.data ? res.data.data : res.data;
            setBsData(payload);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load Balance Sheet');
        } finally {
            setLoading(false);
        }
    };

    const loadTrialBalance = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchTrialBalance(tbDate);
            // 🛡️ Safely unwrap double-nested Axios data
            const payload = res.data?.data ? res.data.data : res.data;
            setTbData(payload);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load Trial Balance');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'pl') loadIncomeStatement();
        if (activeTab === 'bs' && !bsData) loadBalanceSheet();
        if (activeTab === 'tb') loadTrialBalance();
    }, [activeTab]);

    const formatMoney = (amount) => `₱${(Number(amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="max-w-5xl mx-auto p-6 print:p-0 print:max-w-full">
            
            {/* HEADER */}
            <div className="mb-8 flex justify-between items-end print:hidden">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <FileText className="text-indigo-600" size={32} />
                        Financial Reports
                    </h1>
                    <p className="text-slate-500 mt-2">GAAP compliant General Ledger reporting.</p>
                </div>
                <button onClick={handlePrint} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold transition-colors">
                    <Printer size={18} /> Print Report
                </button>
            </div>

            {/* TAB CONTROLS */}
            <div className="flex gap-4 mb-6 border-b border-slate-200 pb-px print:hidden overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('pl')}
                    className={`pb-3 px-4 font-bold text-sm transition-colors whitespace-nowrap ${activeTab === 'pl' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Income Statement (P&L)
                </button>
                <button 
                    onClick={() => setActiveTab('bs')}
                    className={`pb-3 px-4 font-bold text-sm transition-colors whitespace-nowrap ${activeTab === 'bs' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Balance Sheet
                </button>
                <button 
                    onClick={() => setActiveTab('tb')}
                    className={`pb-3 px-4 font-bold text-sm transition-colors whitespace-nowrap ${activeTab === 'tb' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Trial Balance
                </button>
            </div>

            {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg mb-6 font-semibold print:hidden">{error}</div>}

            {/* TAB 1: P&L */}
            {activeTab === 'pl' && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 print:border-none print:shadow-none print:p-0">
                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-lg mb-8 print:hidden">
                        <Calendar size={20} className="text-slate-400" />
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">Start Date</label>
                            <input type="date" value={dates.start} onChange={e => setDates({...dates, start: e.target.value})} className="border border-slate-300 rounded p-1.5 text-sm outline-none focus:border-indigo-500" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">End Date</label>
                            <input type="date" value={dates.end} onChange={e => setDates({...dates, end: e.target.value})} className="border border-slate-300 rounded p-1.5 text-sm outline-none focus:border-indigo-500" />
                        </div>
                        <button onClick={loadIncomeStatement} className="mt-5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded text-sm font-bold transition-colors">
                            Run Report
                        </button>
                    </div>

                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest">Income Statement</h2>
                        <p className="text-slate-500">For the period {new Date(dates.start).toLocaleDateString()} to {new Date(dates.end).toLocaleDateString()}</p>
                    </div>

                    {loading || !plData ? (
                        <div className="flex justify-center p-12 text-indigo-600"><Loader className="animate-spin" size={32} /></div>
                    ) : (
                        <div className="w-full max-w-3xl mx-auto space-y-6">
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase border-b border-slate-800 pb-1 mb-2">Revenue</h3>
                                {plData?.revenue?.items && Object.entries(plData.revenue.items).map(([name, amount]) => (
                                    <div key={name} className="flex justify-between py-1.5 text-sm text-slate-700 ml-4">
                                        <span>{name}</span>
                                        <span>{formatMoney(amount)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between py-2 text-sm font-bold text-slate-900 border-t border-slate-200 mt-2">
                                    <span>Total Revenue</span>
                                    <span>{formatMoney(plData?.revenue?.total)}</span>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase border-b border-slate-800 pb-1 mb-2">Cost of Goods Sold</h3>
                                {plData?.cogs?.items && Object.entries(plData.cogs.items).map(([name, amount]) => (
                                    <div key={name} className="flex justify-between py-1.5 text-sm text-slate-700 ml-4">
                                        <span>{name}</span>
                                        <span>{formatMoney(amount)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between py-2 text-sm font-bold text-slate-900 border-t border-slate-200 mt-2">
                                    <span>Total COGS</span>
                                    <span>{formatMoney(plData?.cogs?.total)}</span>
                                </div>
                            </div>
                            <div className="flex justify-between py-3 text-lg font-black text-slate-900 bg-slate-50 px-4 rounded">
                                <span>Gross Profit</span>
                                <span>{formatMoney(plData?.grossProfit)}</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase border-b border-slate-800 pb-1 mb-2">Operating Expenses</h3>
                                {plData?.expenses?.items && Object.entries(plData.expenses.items).map(([name, amount]) => (
                                    <div key={name} className="flex justify-between py-1.5 text-sm text-slate-700 ml-4">
                                        <span>{name}</span>
                                        <span>{formatMoney(amount)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between py-2 text-sm font-bold text-slate-900 border-t border-slate-200 mt-2">
                                    <span>Total Expenses</span>
                                    <span>{formatMoney(plData?.expenses?.total)}</span>
                                </div>
                            </div>
                            <div className={`flex justify-between py-4 text-xl font-black px-4 rounded border-b-4 double ${plData?.netIncome >= 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-800' : 'bg-red-50 text-red-800 border-red-800'}`}>
                                <span>Net Income</span>
                                <span>{formatMoney(plData?.netIncome)}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: BALANCE SHEET */}
            {activeTab === 'bs' && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 print:border-none print:shadow-none print:p-0">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest">Balance Sheet</h2>
                        <p className="text-slate-500">As of {new Date().toLocaleDateString()}</p>
                    </div>

                    {loading || !bsData ? (
                        <div className="flex justify-center p-12 text-indigo-600"><Loader className="animate-spin" size={32} /></div>
                    ) : (
                        <div className="w-full max-w-3xl mx-auto space-y-8">
                            <div>
                                <h3 className="text-base font-black text-slate-800 uppercase border-b-2 border-slate-800 pb-1 mb-2">Assets</h3>
                                {bsData?.assets?.items?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between py-1.5 text-sm text-slate-700 ml-4">
                                        <span>{item.code} - {item.name}</span>
                                        <span>{formatMoney(item.balance)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between py-2 text-sm font-bold text-slate-900 border-t border-slate-200 mt-2 bg-slate-50 px-2 rounded">
                                    <span>Total Assets</span>
                                    <span>{formatMoney(bsData?.assets?.total)}</span>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-base font-black text-slate-800 uppercase border-b-2 border-slate-800 pb-1 mb-2">Liabilities</h3>
                                {bsData?.liabilities?.items?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between py-1.5 text-sm text-slate-700 ml-4">
                                        <span>{item.code} - {item.name}</span>
                                        <span>{formatMoney(item.balance)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between py-2 text-sm font-bold text-slate-900 border-t border-slate-200 mt-2 bg-slate-50 px-2 rounded">
                                    <span>Total Liabilities</span>
                                    <span>{formatMoney(bsData?.liabilities?.total)}</span>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-base font-black text-slate-800 uppercase border-b-2 border-slate-800 pb-1 mb-2">Equity</h3>
                                {bsData?.equity?.items?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between py-1.5 text-sm text-slate-700 ml-4">
                                        <span>{item.code} - {item.name}</span>
                                        <span>{formatMoney(item.balance)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between py-2 text-sm font-bold text-slate-900 border-t border-slate-200 mt-2 bg-slate-50 px-2 rounded">
                                    <span>Total Equity</span>
                                    <span>{formatMoney(bsData?.equity?.total)}</span>
                                </div>
                            </div>
                            <div className="flex justify-between py-4 text-lg font-black px-4 border-t-2 border-b-4 border-slate-800 text-slate-900 mt-4">
                                <span>Total Liabilities & Equity</span>
                                <span>{formatMoney((bsData?.liabilities?.total || 0) + (bsData?.equity?.total || 0))}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: TRIAL BALANCE (INDESTRUCTIBLE) */}
            {activeTab === 'tb' && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 print:border-none print:shadow-none print:p-0">
                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-lg mb-8 print:hidden">
                        <Calendar size={20} className="text-slate-400" />
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">As Of Date</label>
                            <input type="date" value={tbDate} onChange={e => setTbDate(e.target.value)} className="border border-slate-300 rounded p-1.5 text-sm outline-none focus:border-indigo-500" />
                        </div>
                        <button onClick={loadTrialBalance} className="mt-5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded text-sm font-bold transition-colors">
                            Update Report
                        </button>
                    </div>

                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest">Trial Balance</h2>
                        <p className="text-slate-500">Historical Snapshot As Of {new Date(tbDate).toLocaleDateString()}</p>
                    </div>

                    {loading || !tbData ? (
                        <div className="flex justify-center p-12 text-indigo-600"><Loader className="animate-spin" size={32} /></div>
                    ) : (
                        <div className="w-full mx-auto space-y-6">
                            <div className={`p-4 rounded-lg flex items-center justify-between border ${tbData.isBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                <div className="flex items-center gap-3">
                                    {tbData.isBalanced ? <CheckCircle size={24} className="text-emerald-600" /> : <AlertTriangle size={24} className="text-red-600" />}
                                    <div>
                                        <h3 className="font-bold text-sm uppercase tracking-wider m-0">
                                            {tbData.isBalanced ? 'Ledger is Balanced' : 'Mismatch Detected'}
                                        </h3>
                                        <p className="text-xs opacity-80 m-0">
                                            {tbData.isBalanced ? 'Total Debits equal Total Credits.' : 'Warning: Double-entry rule violated. Audit required.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Account Name</th>
                                            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Type</th>
                                            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase text-right">Total Debit</th>
                                            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase text-right">Total Credit</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {/* 🛡️ Fully safe check and map */}
                                        {!tbData?.accounts || tbData.accounts.length === 0 ? (
                                            <tr><td colSpan="4" className="p-8 text-center text-slate-400">No account activity found prior to this date.</td></tr>
                                        ) : (
                                            tbData.accounts.map((acc, index) => (
                                                <tr key={index} className="hover:bg-slate-50 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div className="text-sm font-bold text-slate-800">{acc.accountCode} - {acc.accountName}</div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                                            {acc.type || 'Unknown'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono text-sm text-slate-700">
                                                        {acc.totalDebit > 0 ? formatMoney(acc.totalDebit) : '-'}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono text-sm text-slate-700">
                                                        {acc.totalCredit > 0 ? formatMoney(acc.totalCredit) : '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                    {/* 🛡️ Fully safe length check for footer */}
                                    {tbData?.accounts?.length > 0 && (
                                        <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                                            <tr>
                                                <td colSpan="2" className="py-4 px-4 text-right text-sm font-black text-slate-900 uppercase tracking-wider">
                                                    System Grand Totals
                                                </td>
                                                <td className={`py-4 px-4 text-right font-mono text-base font-bold ${tbData.isBalanced ? 'text-slate-900' : 'text-red-600'}`}>
                                                    {formatMoney(tbData?.systemTotalDebit)}
                                                </td>
                                                <td className={`py-4 px-4 text-right font-mono text-base font-bold ${tbData.isBalanced ? 'text-slate-900' : 'text-red-600'}`}>
                                                    {formatMoney(tbData?.systemTotalCredit)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminFinancialReports;