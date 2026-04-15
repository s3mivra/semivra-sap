import React, { useEffect, useState, useContext } from 'react';
import { fetchJournalEntries } from '../services/accountingService';
import { AuthContext } from '../context/AuthContext';
import { BarChart3, FileText, DollarSign, TrendingUp, Loader } from 'lucide-react';

const SuperAdminDashboard = () => {
    const { user } = useContext(AuthContext);
    const [journals, setJournals] = useState([]);
    const [kpis, setKpis] = useState({ totalRevenue: 0, count: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadFinancials = async () => {
            try {
                const response = await fetchJournalEntries();
                const fetchedJournals = response.data;
                
                // Calculate real Total Revenue by finding all Credits to "Revenue" accounts
                let calculatedRevenue = 0;
                fetchedJournals.forEach(journal => {
                    journal.lines.forEach(line => {
                        if (line.account?.type === 'Revenue') {
                            calculatedRevenue += (line.credit || 0);
                        }
                    });
                });

                setJournals(fetchedJournals);
                setKpis({ totalRevenue: calculatedRevenue, count: fetchedJournals.length });
            } catch (err) { 
                console.error("Failed to load FICO data", err); 
            } finally { 
                setLoading(false); 
            }
        };
        loadFinancials();
    }, []);

    if (loading) return (
        <div className="flex justify-center items-center p-8">
            <Loader className="w-6 h-6 animate-spin text-slate-400" />
            <span className="ml-2 text-slate-600">Loading FICO Dashboard...</span>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-slate-400" />
                <h1 className="text-3xl font-light tracking-tight text-slate-900 m-0">Financial & Controlling (FICO) Overview</h1>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-4">
                        <DollarSign className="w-6 h-6 text-green-500" />
                        <h3 className="text-sm font-medium text-slate-600 uppercase tracking-wider m-0">Gross Revenue (All Time)</h3>
                    </div>
                    <p className="text-4xl font-light text-slate-900 m-0">
                        ₱{kpis.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-4">
                        <FileText className="w-6 h-6 text-blue-500" />
                        <h3 className="text-sm font-medium text-slate-600 uppercase tracking-wider m-0">Total Ledger Entries</h3>
                    </div>
                    <p className="text-4xl font-light text-slate-900 m-0">{kpis.count}</p>
                </div>
            </div>

            {/* General Ledger Summary Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-slate-50">
                    <h2 className="text-lg font-medium text-slate-900 m-0">Recent Financial Activity</h2>
                </div>
                <table className="w-full border-collapse text-left">
                    <thead>
                        <tr className="bg-slate-50 text-slate-600 text-sm">
                            <th className="py-4 px-6">Date</th>
                            <th className="py-4 px-6 border-b border-slate-200">Entry Number</th>
                            <th className="py-4 px-6 border-b border-slate-200">Description</th>
                            <th className="py-4 px-6 border-b border-slate-200">Posted By</th>
                            <th className="py-4 px-6 border-b border-slate-200">Total Volume</th>
                        </tr>
                    </thead>
                    <tbody>
                        {journals.length === 0 ? (
                            <tr><td colSpan="5" className="py-5 px-6 text-center text-slate-500">No financial data found.</td></tr>
                        ) : (
                            journals.map((txn) => (
                                <tr key={txn._id} className="border-b border-slate-100">
                                    <td className="py-4 px-6 text-sm">{new Date(txn.date).toLocaleDateString()}</td>
                                    <td className="py-4 px-6 text-sm font-mono font-bold">{txn.entryNumber}</td>
                                    <td className="py-4 px-6 text-sm">{txn.description}</td>
                                    <td className="py-4 px-6 text-sm">{txn.postedBy?.name || 'System'}</td>
                                    <td className="py-4 px-6 text-sm font-bold text-slate-900">₱{txn.totalDebit.toFixed(2)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;