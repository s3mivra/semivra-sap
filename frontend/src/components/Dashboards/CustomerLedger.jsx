import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

const CustomerLedger = ({ customerId }) => {
    const { divisionId } = useContext(AuthContext);
    const [ledger, setLedger] = useState({ transactions: [], totalBalance: 0 });

    useEffect(() => {
        const fetchLedger = async () => {
            if (!divisionId || !customerId) return;
            try {
                // Adjust this URL to match your existing backend endpoint for the Subsidiary Ledger
                const response = await api.get(`/ar/subsidiary-ledger/${customerId}`);
                setLedger(response.data);
            } catch (error) {
                console.error('Error fetching Customer Ledger:', error);
            }
        };

        fetchLedger();
    }, [divisionId, customerId]);

    return (
        <div className="p-6 bg-white rounded-lg border border-slate-200">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Customer Statement of Account</h2>
                <div className="text-right">
                    <p className="text-sm text-slate-500 uppercase tracking-wider">Current Balance</p>
                    <p className={`text-2xl font-bold ${ledger.totalBalance > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                        ${ledger.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 text-sm uppercase text-slate-500 tracking-wider">
                        <th className="p-3 border-b">Date</th>
                        <th className="p-3 border-b">Ref / Invoice #</th>
                        <th className="p-3 border-b">Description</th>
                        <th className="p-3 border-b text-right">Debit (Charge)</th>
                        <th className="p-3 border-b text-right">Credit (Payment)</th>
                        <th className="p-3 border-b text-right">Running Balance</th>
                    </tr>
                </thead>
                <tbody>
                    {ledger.transactions.map((txn, index) => (
                        <tr key={txn._id || index} className="text-sm text-slate-700 border-b hover:bg-slate-50">
                            <td className="p-3">{new Date(txn.date).toLocaleDateString()}</td>
                            <td className="p-3 font-mono">{txn.referenceNumber}</td>
                            <td className="p-3">{txn.description}</td>
                            <td className="p-3 text-right">{txn.debit > 0 ? `$${txn.debit.toFixed(2)}` : '-'}</td>
                            <td className="p-3 text-right">{txn.credit > 0 ? `$${txn.credit.toFixed(2)}` : '-'}</td>
                            <td className="p-3 text-right font-semibold">${txn.runningBalance.toFixed(2)}</td>
                        </tr>
                    ))}
                    {ledger.transactions.length === 0 && (
                        <tr>
                            <td colSpan="6" className="p-6 text-center text-slate-500">No transactions found for this customer.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default CustomerLedger;