import React, { useState, useEffect } from 'react';
import { fetchFinancialSummary } from '../services/reportService'; 
import { closeFinancialPeriod } from '../services/reportService'; // Adjust import based on where you put it

const AdminFinancialReports = () => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('2026-04'); // Defaulting to current operational period
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        const loadReport = async () => {
            try {
                setLoading(true);
                // Assume backend handles ?period=YYYY-MM filtering
                const response = await fetchFinancialSummary(period);
                setReport(response); 
            } catch (error) {
                console.error("Failed to load financials", error);
            } finally {
                setLoading(false);
            }
        };
        loadReport();
    }, [period]);

    const handleClosePeriod = async () => {
        if (!window.confirm(`WARNING: You are about to close period ${period}. This will calculate Net Income, roll it into Retained Earnings, and lock all journal entries for this month. This action cannot be undone. Proceed?`)) {
            return;
        }

        try {
            setIsClosing(true);
            await closeFinancialPeriod(period);
            alert(`Period ${period} successfully closed and balances rolled forward.`);
            // Refresh report to show updated Retained Earnings and locked status
            const updatedReport = await fetchFinancialSummary(period);
            setReport(updatedReport);
        } catch (error) {
            console.error("Failed to close period", error);
            alert(error.response?.data?.error || "Failed to close period.");
        } finally {
            setIsClosing(false);
        }
    };

    if (loading && !report) return (
        <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400"></div>
            <span className="ml-2 text-slate-600">Generating GAAP Compliant Reports...</span>
        </div>
    );
    
    if (!report || !report.data) return (
        <div className="bg-slate-50 border border-slate-200 text-slate-700 p-4 rounded-lg">Failed to load report data.</div>
    );

    const { data, isBalanced, isClosed } = report;
    const formatMoney = (amount) => `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const AccountList = ({ accounts, title, total, isSubSection = false }) => (
        <div className="mb-6">
            <h3 className={`text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ${isSubSection ? 'ml-4' : ''}`}>{title}</h3>
            <div className="space-y-1">
                {accounts.length === 0 ? (
                    <div className={`py-1 text-slate-400 italic text-sm ${isSubSection ? 'ml-4' : ''}`}>No data recorded.</div>
                ) : (
                    accounts.map((acc, i) => (
                        <div key={i} className={`flex justify-between items-center py-1.5 border-b border-slate-50 ${isSubSection ? 'ml-4' : ''} ${acc.isSystemGenerated ? 'bg-emerald-50/50 rounded px-2' : ''}`}>
                            <span className="text-slate-600 text-sm">{acc.name} {acc.isSystemGenerated && <span className="text-xs font-bold text-emerald-600 ml-1">(Auto)</span>}</span>
                            <span className="font-medium text-slate-800 text-sm">{acc.balance < 0 ? `(${formatMoney(Math.abs(acc.balance))})` : formatMoney(acc.balance)}</span>
                        </div>
                    ))
                )}
                <div className={`flex justify-between items-center py-2 mt-2 border-t border-slate-200 ${isSubSection ? 'ml-4' : ''}`}>
                    <span className="font-semibold text-slate-700 text-sm">Total {title}</span>
                    <span className="font-bold text-slate-900 text-sm">{formatMoney(total)}</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-6 max-w-6xl mx-auto">
            
            {/* Header with Period Controls */}
            <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-sm mb-8 flex justify-between items-center">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="inline-block bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-1 rounded">GAAP / PFRS COMPLIANT</span>
                        {isClosed && <span className="inline-block bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded">PERIOD CLOSED</span>}
                    </div>
                    <h1 className="text-3xl font-light text-slate-900 mb-2">Financial Statements</h1>
                    
                    <div className="flex items-center gap-4 mt-4">
                        <label className="text-sm font-semibold text-slate-600">Accounting Period:</label>
                        <input 
                            type="month" 
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-indigo-500 transition-colors"
                        />
                        {!isClosed && isBalanced && (
                            <button 
                                onClick={handleClosePeriod}
                                disabled={isClosing}
                                className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-1.5 rounded transition-colors disabled:opacity-50"
                            >
                                {isClosing ? 'Closing Period...' : 'Execute Month-End Close'}
                            </button>
                        )}
                        {!isBalanced && !isClosed && (
                            <span className="text-red-500 text-xs font-bold">Cannot close unbalanced period.</span>
                        )}
                    </div>
                </div>
                <div className={`text-center p-5 rounded-lg border-2 ${data.netIncome >= 0 ? 'border-emerald-500 bg-emerald-50' : 'border-red-500 bg-red-50'}`}>
                    <div className="text-xs font-bold uppercase tracking-wide mb-1 text-slate-600">Net Income</div>
                    <div className="text-3xl font-black text-slate-900">{formatMoney(data.netIncome)}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* LEFT: Multi-Step Income Statement */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm h-fit">
                    <div className="bg-slate-50 border-b border-slate-200 p-5 rounded-t-xl">
                        <h2 className="text-lg font-bold text-slate-800">Income Statement</h2>
                        <p className="text-slate-500 text-xs">For the Period: {period}</p>
                    </div>
                    <div className="p-6">
                        <AccountList accounts={data.breakdown.revenue} title="Revenue" total={data.totalRevenue} />
                        <AccountList accounts={data.breakdown.cogs} title="Cost of Goods Sold" total={data.totalCogs} />
                        
                        <div className="mb-6 p-3 bg-slate-800 rounded text-white flex justify-between items-center shadow-inner">
                            <span className="font-bold text-sm tracking-wide">GROSS PROFIT</span>
                            <span className="font-black text-lg">{formatMoney(data.grossProfit)}</span>
                        </div>

                        <AccountList accounts={data.breakdown.opex} title="Operating Expenses" total={data.totalOpex} />
                        
                        <div className="mb-6 p-3 bg-slate-100 rounded border border-slate-300 flex justify-between items-center">
                            <span className="font-bold text-slate-700 text-sm tracking-wide">OPERATING INCOME (EBITDA)</span>
                            <span className="font-black text-slate-900 text-lg">{formatMoney(data.operatingIncome)}</span>
                        </div>

                        <AccountList accounts={data.breakdown.taxesAndInterest} title="Non-Operating (Taxes & Interest)" total={data.totalTaxesAndInterest} />
                    </div>
                </div>

                {/* RIGHT: Classified Balance Sheet */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm h-fit">
                    <div className="bg-slate-50 border-b border-slate-200 p-5 rounded-t-xl">
                        <h2 className="text-lg font-bold text-slate-800">Balance Sheet</h2>
                        <p className="text-slate-500 text-xs">As of End of {period}</p>
                    </div>
                    <div className="p-6">
                        {/* ASSETS */}
                        <div className="mb-8">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 pb-2 mb-4">Assets</h3>
                            <AccountList accounts={data.breakdown.currentAssets} title="Current Assets" total={data.totalCurrentAssets} isSubSection={true} />
                            <AccountList accounts={data.breakdown.nonCurrentAssets} title="Non-Current Assets" total={data.totalNonCurrentAssets} isSubSection={true} />
                            <div className="flex justify-between items-center py-3 border-t-4 border-double border-slate-300">
                                <span className="font-black text-slate-900">Total Assets</span>
                                <span className="font-black text-xl text-slate-900">{formatMoney(data.totalAssets)}</span>
                            </div>
                        </div>

                        {/* LIABILITIES */}
                        <div className="mb-8">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 pb-2 mb-4">Liabilities</h3>
                            <AccountList accounts={data.breakdown.currentLiabilities} title="Current Liabilities" total={data.totalCurrentLiabilities} isSubSection={true} />
                            <AccountList accounts={data.breakdown.nonCurrentLiabilities} title="Non-Current Liabilities" total={data.totalNonCurrentLiabilities} isSubSection={true} />
                            <div className="flex justify-between items-center py-3 border-t-2 border-slate-300">
                                <span className="font-black text-slate-900">Total Liabilities</span>
                                <span className="font-black text-lg text-slate-900">{formatMoney(data.totalLiabilities)}</span>
                            </div>
                        </div>

                        {/* EQUITY */}
                        <div className="mb-8">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 pb-2 mb-4">Shareholders' Equity</h3>
                            <AccountList accounts={data.breakdown.equity} title="Equity Accounts" total={data.totalEquity} isSubSection={true} />
                            <div className="flex justify-between items-center py-3 border-t-2 border-slate-300 mb-6">
                                <span className="font-black text-slate-900">Total Equity</span>
                                <span className="font-black text-lg text-slate-900">{formatMoney(data.totalEquity)}</span>
                            </div>
                        </div>

                        {/* 🛡️ Equation Check */}
                        <div className={`p-4 rounded border-2 ${isBalanced ? 'border-emerald-600 bg-emerald-50' : 'border-red-600 bg-red-50'}`}>
                            <div className="flex items-start gap-3">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${isBalanced ? 'border-emerald-600 text-emerald-600' : 'border-red-600 text-red-600'}`}>
                                    {isBalanced ? '✓' : '!'}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 text-sm">Equation: Assets = Liabilities + Equity</div>
                                    <div className="text-xs text-slate-600 mt-1">{formatMoney(data.totalAssets)} = {formatMoney(data.totalLiabilities)} + {formatMoney(data.totalEquity)}</div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminFinancialReports;