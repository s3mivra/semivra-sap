import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

const IncomeStatement = ({ period }) => {
    const { divisionId } = useContext(AuthContext);
    const [pnl, setPnl] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPnL = async () => {
            if (!divisionId || !period) return;
            try {
                setLoading(true);
                // The api interceptor should automatically inject x-division-id
                const response = await api.get(`/reports/pnl?period=${period}`);
                setPnl(response.data);
            } catch (error) {
                console.error('Error fetching P&L:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPnL();
    }, [divisionId, period]);

    if (loading) return <div className="p-4 text-slate-500">Calculating Ledgers...</div>;
    if (!pnl) return null;

    return (
        <div className="max-w-4xl mx-auto p-8 bg-white border border-slate-200 shadow-sm font-sans">
            <h2 className="text-3xl font-bold text-center text-slate-800 mb-2">Income Statement</h2>
            <h4 className="text-md text-center text-slate-500 mb-8">Period Ending: {period}</h4>

            {/* Revenue Section */}
            <div className="mb-6">
                <h3 className="font-bold text-lg border-b border-slate-800 pb-1 mb-2">Revenue</h3>
                {pnl.Revenue.accounts.map(acc => (
                    <div key={acc.code} className="flex justify-between py-1 px-4 text-sm text-slate-700">
                        <span>{acc.code} - {acc.name}</span>
                        <span>${acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                ))}
                <div className="flex justify-between py-2 px-4 font-bold border-t border-slate-300 mt-2">
                    <span>Total Revenue</span>
                    <span>${pnl.Revenue.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
            </div>

            {/* COGS Section */}
            <div className="mb-6">
                <h3 className="font-bold text-lg border-b border-slate-800 pb-1 mb-2">Cost of Goods Sold</h3>
                {pnl.COGS.accounts.map(acc => (
                    <div key={acc.code} className="flex justify-between py-1 px-4 text-sm text-slate-700">
                        <span>{acc.code} - {acc.name}</span>
                        <span>${acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                ))}
                <div className="flex justify-between py-2 px-4 font-bold border-t border-slate-300 mt-2">
                    <span>Total COGS</span>
                    <span>${pnl.COGS.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
            </div>

            {/* Gross Profit */}
            <div className="flex justify-between py-3 px-4 font-bold text-lg bg-slate-50 mb-6">
                <span>Gross Profit</span>
                <span>${(pnl.Revenue.total - pnl.COGS.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>

            {/* Operating Expenses */}
            <div className="mb-6">
                <h3 className="font-bold text-lg border-b border-slate-800 pb-1 mb-2">Operating Expenses</h3>
                {pnl.Expense.accounts.map(acc => (
                    <div key={acc.code} className="flex justify-between py-1 px-4 text-sm text-slate-700">
                        <span>{acc.code} - {acc.name}</span>
                        <span>${acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                ))}
                <div className="flex justify-between py-2 px-4 font-bold border-t border-slate-300 mt-2">
                    <span>Total Expenses</span>
                    <span>${pnl.Expense.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
            </div>

            {/* Net Income */}
            <div className="flex justify-between py-4 px-4 font-bold text-xl border-t-4 border-slate-800 border-double mt-8">
                <span>Net Income</span>
                <span className={pnl.NetIncome >= 0 ? "text-green-700" : "text-red-600"}>
                    ${pnl.NetIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
            </div>
        </div>
    );
};

export default IncomeStatement;