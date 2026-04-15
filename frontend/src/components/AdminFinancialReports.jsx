import React, { useState, useEffect } from 'react';
import { fetchBalanceSheet, fetchIncomeStatement } from '../services/reportService';
import { FileText, Calendar, Loader, Printer } from 'lucide-react';

const AdminFinancialReports = () => {
    const [activeTab, setActiveTab] = useState('pl'); // 'pl' or 'bs'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // P&L State
    const [plData, setPlData] = useState(null);
    const [dates, setDates] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // First of current month
        end: new Date().toISOString().split('T')[0] // Today
    });

    // Balance Sheet State
    const [bsData, setBsData] = useState(null);

    const loadIncomeStatement = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchIncomeStatement(dates.start, dates.end);
            setPlData(res.data);
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
            setBsData(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load Balance Sheet');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'pl') loadIncomeStatement();
        if (activeTab === 'bs' && !bsData) loadBalanceSheet();
    }, [activeTab]);

    const formatMoney = (amount) => `₱${(Number(amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="max-w-5xl mx-auto p-6 print:p-0 print:max-w-full">
            
            {/* HEADER - Hidden on print */}
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

            {/* TAB CONTROLS - Hidden on print */}
            <div className="flex gap-4 mb-6 border-b border-slate-200 pb-px print:hidden">
                <button 
                    onClick={() => setActiveTab('pl')}
                    className={`pb-3 px-4 font-bold text-sm transition-colors ${activeTab === 'pl' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Income Statement (P&L)
                </button>
                <button 
                    onClick={() => setActiveTab('bs')}
                    className={`pb-3 px-4 font-bold text-sm transition-colors ${activeTab === 'bs' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Balance Sheet
                </button>
            </div>

            {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg mb-6 font-semibold print:hidden">{error}</div>}

            {/* =========================================
                TAB 1: INCOME STATEMENT (P&L)
            ========================================= */}
            {activeTab === 'pl' && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 print:border-none print:shadow-none print:p-0">
                    
                    {/* Date Filters - Hidden on print */}
                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-lg mb-8 print:hidden">
                        <Calendar size={20} className="text-slate-400" />
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">Start Date</label>
                            <input type="date" value={dates.start} onChange={e => setDates({...dates, start: e.target.value})} className="border border-slate-300 rounded p-1.5 text-sm" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">End Date</label>
                            <input type="date" value={dates.end} onChange={e => setDates({...dates, end: e.target.value})} className="border border-slate-300 rounded p-1.5 text-sm" />
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
                            
                            {/* Revenue Section */}
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase border-b border-slate-800 pb-1 mb-2">Revenue</h3>
                                {Object.entries(plData.revenue.items).map(([name, amount]) => (
                                    <div key={name} className="flex justify-between py-1.5 text-sm text-slate-700 ml-4">
                                        <span>{name}</span>
                                        <span>{formatMoney(amount)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between py-2 text-sm font-bold text-slate-900 border-t border-slate-200 mt-2">
                                    <span>Total Revenue</span>
                                    <span>{formatMoney(plData.revenue.total)}</span>
                                </div>
                            </div>

                            {/* COGS Section */}
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase border-b border-slate-800 pb-1 mb-2">Cost of Goods Sold</h3>
                                {Object.entries(plData.cogs.items).map(([name, amount]) => (
                                    <div key={name} className="flex justify-between py-1.5 text-sm text-slate-700 ml-4">
                                        <span>{name}</span>
                                        <span>{formatMoney(amount)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between py-2 text-sm font-bold text-slate-900 border-t border-slate-200 mt-2">
                                    <span>Total COGS</span>
                                    <span>{formatMoney(plData.cogs.total)}</span>
                                </div>
                            </div>

                            {/* Gross Profit */}
                            <div className="flex justify-between py-3 text-lg font-black text-slate-900 bg-slate-50 px-4 rounded">
                                <span>Gross Profit</span>
                                <span>{formatMoney(plData.grossProfit)}</span>
                            </div>

                            {/* Expenses Section */}
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase border-b border-slate-800 pb-1 mb-2">Operating Expenses</h3>
                                {Object.entries(plData.expenses.items).map(([name, amount]) => (
                                    <div key={name} className="flex justify-between py-1.5 text-sm text-slate-700 ml-4">
                                        <span>{name}</span>
                                        <span>{formatMoney(amount)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between py-2 text-sm font-bold text-slate-900 border-t border-slate-200 mt-2">
                                    <span>Total Expenses</span>
                                    <span>{formatMoney(plData.expenses.total)}</span>
                                </div>
                            </div>

                            {/* NET INCOME */}
                            <div className={`flex justify-between py-4 text-xl font-black px-4 rounded border-b-4 double ${plData.netIncome >= 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-800' : 'bg-red-50 text-red-800 border-red-800'}`}>
                                <span>Net Income</span>
                                <span>{formatMoney(plData.netIncome)}</span>
                            </div>

                        </div>
                    )}
                </div>
            )}

            {/* =========================================
                TAB 2: BALANCE SHEET
            ========================================= */}
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
                            
                            {/* ASSETS */}
                            <div>
                                <h3 className="text-base font-black text-slate-800 uppercase border-b-2 border-slate-800 pb-1 mb-2">Assets</h3>
                                {bsData.assets.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between py-1.5 text-sm text-slate-700 ml-4">
                                        <span>{item.code} - {item.name}</span>
                                        <span>{formatMoney(item.balance)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between py-2 text-sm font-bold text-slate-900 border-t border-slate-200 mt-2 bg-slate-50 px-2 rounded">
                                    <span>Total Assets</span>
                                    <span>{formatMoney(bsData.assets.total)}</span>
                                </div>
                            </div>

                            {/* LIABILITIES */}
                            <div>
                                <h3 className="text-base font-black text-slate-800 uppercase border-b-2 border-slate-800 pb-1 mb-2">Liabilities</h3>
                                {bsData.liabilities.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between py-1.5 text-sm text-slate-700 ml-4">
                                        <span>{item.code} - {item.name}</span>
                                        <span>{formatMoney(item.balance)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between py-2 text-sm font-bold text-slate-900 border-t border-slate-200 mt-2 bg-slate-50 px-2 rounded">
                                    <span>Total Liabilities</span>
                                    <span>{formatMoney(bsData.liabilities.total)}</span>
                                </div>
                            </div>

                            {/* EQUITY */}
                            <div>
                                <h3 className="text-base font-black text-slate-800 uppercase border-b-2 border-slate-800 pb-1 mb-2">Equity</h3>
                                {bsData.equity.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between py-1.5 text-sm text-slate-700 ml-4">
                                        <span>{item.code} - {item.name}</span>
                                        <span>{formatMoney(item.balance)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between py-2 text-sm font-bold text-slate-900 border-t border-slate-200 mt-2 bg-slate-50 px-2 rounded">
                                    <span>Total Equity</span>
                                    <span>{formatMoney(bsData.equity.total)}</span>
                                </div>
                            </div>

                            {/* TOTAL LIABILITIES & EQUITY */}
                            <div className="flex justify-between py-4 text-lg font-black px-4 border-t-2 border-b-4 border-slate-800 text-slate-900 mt-4">
                                <span>Total Liabilities & Equity</span>
                                <span>{formatMoney(bsData.liabilities.total + bsData.equity.total)}</span>
                            </div>

                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminFinancialReports;