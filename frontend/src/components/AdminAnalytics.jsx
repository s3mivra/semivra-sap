import React, { useState, useEffect } from 'react';
import { fetchAnalytics } from '../services/analyticsService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { BarChart3, TrendingUp, AlertTriangle, Package, DollarSign, Loader } from 'lucide-react';

const AdminAnalytics = () => {
    const [metrics, setMetrics] = useState({ lowStock: [], topProducts: [], revenueTrends: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const response = await fetchAnalytics();
                setMetrics(response.data);
            } catch (error) {
                console.error("Failed to load analytics", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) return (
        <div className="flex justify-center items-center p-8">
            <Loader className="w-6 h-6 animate-spin text-slate-400" />
            <span className="ml-2 text-slate-600">Loading Dashboard...</span>
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <BarChart3 className="w-8 h-8 text-slate-400" />
                    <h1 className="text-3xl font-light tracking-tight text-slate-900 m-0">Business Analytics</h1>
                </div>
                <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">Live Data Feed</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                
                {/* LOW STOCK ALERTS */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-6">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                        <h3 className="text-lg font-medium text-slate-900 m-0">Low Stock Alerts</h3>
                    </div>
                    <ul className="list-none p-0 m-0 space-y-3">
                        {metrics.lowStock.length === 0 ? (
                            <li className="text-slate-500 text-sm">All inventory levels are healthy!</li>
                        ) : (
                            metrics.lowStock.map(item => (
                                <li key={item._id} className="flex justify-between items-center p-3 border-b border-slate-200 last:border-b-0">
                                    <span className="font-medium text-slate-900 text-sm">{item.name}</span>
                                    <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">
                                        {item.currentStock} left
                                    </span>
                                </li>
                            ))
                        )}
                    </ul>
                </div>

                {/* TOP PRODUCTS CHART */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
                    <div className="flex items-center gap-3 mb-6">
                        <TrendingUp className="w-6 h-6 text-blue-500" />
                        <h3 className="text-lg font-medium text-slate-900 m-0">Top Selling Products (Units Sold)</h3>
                    </div>
                    {metrics.topProducts.length === 0 ? (
                        <div className="h-48 flex items-center justify-center text-slate-400">No sales data available.</div>
                    ) : (
                        <div style={{ height: '250px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={metrics.topProducts} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip cursor={{ fill: '#f4f6f7' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="totalSold" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Units Sold" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>

            {/* REVENUE TRENDS CHART */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-3 mb-6">
                    <DollarSign className="w-6 h-6 text-green-500" />
                    <h3 className="text-lg font-medium text-slate-900 m-0">7-Day Revenue Trend</h3>
                </div>
                {metrics.revenueTrends.length === 0 ? (
                    <div className="h-72 flex items-center justify-center text-slate-400">No revenue data for the last 7 days.</div>
                ) : (
                    <div className="h-72 w-full overflow-hidden">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={metrics.revenueTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                                <YAxis tickFormatter={(value) => `$${value}`} />
                                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} labelStyle={{ color: '#7f8c8d' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} activeDot={{ r: 8 }} name="Gross Revenue" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminAnalytics;