import React, { useState, useEffect } from 'react';
import api from '../services/api'; // 🛡️ CRITICAL FIX: Use the central API with tenant interceptors
import { Briefcase, Calendar, DollarSign, CheckCircle, Loader } from 'lucide-react';

const AdminPayroll = () => {
    const [payrollRuns, setPayrollRuns] = useState([]);
    const [periodStart, setPeriodStart] = useState('');
    const [periodEnd, setPeriodEnd] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchPayrollRuns = async () => {
        try {
            // The api interceptor automatically attaches the JWT and x-division-id
            const { data } = await api.get('/payroll');
            setPayrollRuns(Array.isArray(data.data) ? data.data : []);
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.error || 'Failed to fetch payroll history');
        }
    };

    useEffect(() => {
        fetchPayrollRuns();
    }, []);

    const handleDraftPayroll = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await api.post('/payroll/draft', { periodStart, periodEnd });
            fetchPayrollRuns();
            setPeriodStart('');
            setPeriodEnd('');
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.error || 'Failed to draft payroll. Ensure employees have compensation data.');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveAndPay = async (id) => {
        if (!window.confirm("Are you sure? This will permanently post wages to the General Ledger and deduct cash.")) return;
        
        setLoading(true);
        setError(null);
        try {
            await api.post(`/payroll/${id}/approve`);
            fetchPayrollRuns();
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.error || 'Failed to approve payroll.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            
            {/* Header Matching AdminAnalytics */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <Briefcase className="w-8 h-8 text-slate-400" />
                    <h1 className="text-3xl font-light tracking-tight text-slate-900 m-0">Payroll & Compensation</h1>
                </div>
                <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">Automated Ledger Integration</div>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50 text-red-600 text-sm flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                
                {/* LEFT COLUMN: Draft Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                        <Calendar className="w-6 h-6 text-blue-500" />
                        <h3 className="text-lg font-medium text-slate-900 m-0">Run Payroll Batch</h3>
                    </div>
                    
                    <form onSubmit={handleDraftPayroll} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Period Start</label>
                            <input 
                                type="date" 
                                required
                                value={periodStart}
                                onChange={(e) => setPeriodStart(e.target.value)}
                                className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Period End</label>
                            <input 
                                type="date" 
                                required
                                value={periodEnd}
                                onChange={(e) => setPeriodEnd(e.target.value)}
                                className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-slate-900 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                            {loading ? 'Drafting...' : 'Draft Payroll Batch'}
                        </button>
                    </form>
                </div>

                {/* RIGHT COLUMN: History Table */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                        <h3 className="text-lg font-medium text-slate-900 m-0">Batch History & Queue</h3>
                    </div>
                    
                    {payrollRuns.length === 0 ? (
                        <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                            No payroll runs found in the system.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="py-3 px-4 font-medium text-slate-500 text-sm">Period</th>
                                        <th className="py-3 px-4 font-medium text-slate-500 text-sm">Gross Wages</th>
                                        <th className="py-3 px-4 font-medium text-slate-500 text-sm">Net Payout</th>
                                        <th className="py-3 px-4 font-medium text-slate-500 text-sm">Status</th>
                                        <th className="py-3 px-4 font-medium text-slate-500 text-sm">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payrollRuns.map((run) => (
                                        <tr key={run._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-b-0">
                                            <td className="py-3 px-4 text-sm text-slate-700">
                                                {new Date(run.periodStart).toLocaleDateString()} - {new Date(run.periodEnd).toLocaleDateString()}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-slate-700">
                                                ${run.totalGrossPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-3 px-4 text-sm font-semibold text-slate-900">
                                                ${run.totalNetPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                                                    run.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {run.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                {run.status === 'Draft' ? (
                                                    <button 
                                                        onClick={() => handleApproveAndPay(run._id)}
                                                        disabled={loading}
                                                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-medium py-1.5 px-3 rounded-lg transition-colors disabled:opacity-50"
                                                    >
                                                        Approve & Pay
                                                    </button>
                                                ) : (
                                                    <span className="text-sm font-medium text-slate-400">Locked</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default AdminPayroll;