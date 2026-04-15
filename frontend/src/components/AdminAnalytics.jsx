import React, { useState, useEffect } from 'react';
import { fetchDashboardMetrics } from '../services/analyticsService';
import { TrendingUp, Package, ShoppingBag, Loader, AlertTriangle } from 'lucide-react';

const AdminAnalytics = () => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const res = await fetchDashboardMetrics();
                setMetrics(res.data);
            } catch (err) {
                setError('Failed to load executive dashboard data.');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const formatMoney = (amount) => `₱${(Number(amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    if (loading) return <div className="p-12 flex justify-center text-indigo-600"><Loader className="animate-spin" size={40} /></div>;
    if (error) return <div className="p-8 text-red-500 font-bold text-center bg-red-50 rounded-xl m-6 border border-red-200">{error}</div>;

    // Calculate chart scaling
    const maxChartValue = Math.max(...metrics.revenueTrends.map(d => d.revenue)) || 1;

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8">
            <div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">Executive Dashboard</h1>
                <p className="text-slate-500 mt-1 font-medium">Real-time operational performance and inventory alerts.</p>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 p-6 rounded-2xl shadow-lg flex flex-col justify-between text-white relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-500 rounded-full opacity-20 blur-2xl"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="bg-white/10 p-3 rounded-lg"><TrendingUp size={24} className="text-emerald-400" /></div>
                        <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Last 30 Days</span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Total Revenue</p>
                        <h3 className="text-4xl font-black text-white">{formatMoney(metrics.kpis.revenue30Days)}</h3>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* CHART: 30 Day Revenue */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
                    <div className="mb-8">
                        <h2 className="text-lg font-bold text-slate-800">30-Day Sales Trend</h2>
                        <p className="text-sm text-slate-500">Gross revenue generated per day</p>
                    </div>

                    <div className="h-64 flex items-end justify-between gap-1 border-b-2 border-slate-100 pb-2 relative">
                        {metrics.revenueTrends.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold">No sales data for the last 30 days.</div>
                        )}
                        {metrics.revenueTrends.map((data, idx) => {
                            const height = Math.max(2, (data.revenue / maxChartValue) * 100);
                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full relative group">
                                    {/* Hover Tooltip */}
                                    <div className="absolute -top-10 bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                                        {data._id}: {formatMoney(data.revenue)}
                                    </div>
                                    <div 
                                        style={{ height: `${height}%` }} 
                                        className="w-full max-w-[24px] bg-indigo-500 rounded-t-sm hover:bg-indigo-400 transition-colors"
                                    ></div>
                                </div>
                            );
                        })}
                    </div>
                    {/* X-Axis Labels (Show first, middle, last to avoid crowding) */}
                    <div className="flex justify-between mt-2 text-xs font-bold text-slate-400">
                        <span>{metrics.revenueTrends[0]?._id || ''}</span>
                        <span>{metrics.revenueTrends[Math.floor(metrics.revenueTrends.length/2)]?._id || ''}</span>
                        <span>{metrics.revenueTrends[metrics.revenueTrends.length - 1]?._id || ''}</span>
                    </div>
                </div>

                {/* LISTS: Top Products & Low Stock */}
                <div className="lg:col-span-1 space-y-6">
                    
                    {/* Top Products */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                            <ShoppingBag size={18} className="text-indigo-500" /> Top Selling Products
                        </h2>
                        <div className="space-y-3">
                            {metrics.topProducts.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No sales data yet.</p>}
                            {metrics.topProducts.map((prod, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 truncate max-w-[150px]">{prod.name}</p>
                                        <p className="text-xs text-slate-500 font-mono">{prod.sku}</p>
                                    </div>
                                    <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                        {prod.totalSold} sold
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Low Stock Alerts */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                            <AlertTriangle size={18} className="text-rose-500" /> Low Stock Alerts
                        </h2>
                        <div className="space-y-3">
                            {metrics.lowStock.length === 0 && <p className="text-sm text-emerald-600 font-bold flex items-center justify-center gap-2 py-4"><Package size={16}/> All inventory levels healthy.</p>}
                            {metrics.lowStock.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-rose-50 p-3 rounded-lg border border-rose-100">
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 truncate max-w-[150px]">{item.name}</p>
                                        <p className="text-xs text-slate-500 font-mono">{item.sku}</p>
                                    </div>
                                    <span className="text-sm font-black text-rose-600">
                                        {item.currentStock} left
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AdminAnalytics;