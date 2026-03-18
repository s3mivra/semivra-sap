import React, { useState, useEffect } from 'react';
import { fetchAnalytics } from '../services/analyticsService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

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

    if (loading) return <div style={{ padding: '20px' }}>Loading Dashboard...</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 style={{ margin: 0, color: '#2c3e50' }}>📈 Business Analytics</h1>
                <div style={{ fontSize: '14px', color: '#7f8c8d' }}>Live Data Feed</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
                
                {/* LOW STOCK ALERTS */}
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderTop: '4px solid #e74c3c' }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#c0392b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ⚠️ Low Stock Alerts
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {metrics.lowStock.length === 0 ? (
                            <li style={{ color: '#7f8c8d', fontSize: '14px' }}>All inventory levels are healthy!</li>
                        ) : (
                            metrics.lowStock.map(item => (
                                <li key={item._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: '14px' }}>
                                    <span style={{ fontWeight: 'bold', color: '#2c3e50' }}>{item.name}</span>
                                    <span style={{ backgroundColor: '#fdedec', color: '#c0392b', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                                        {item.currentStock} left
                                    </span>
                                </li>
                            ))
                        )}
                    </ul>
                </div>

                {/* TOP PRODUCTS CHART */}
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', gridColumn: 'span 2', borderTop: '4px solid #3498db' }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#2980b9' }}>🏆 Top Selling Products (Units Sold)</h3>
                    {metrics.topProducts.length === 0 ? (
                        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bdc3c7' }}>No sales data available.</div>
                    ) : (
                        <div style={{ height: '250px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={metrics.topProducts} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip cursor={{ fill: '#f4f6f7' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="totalSold" fill="#3498db" radius={[4, 4, 0, 0]} name="Units Sold" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>

            {/* REVENUE TRENDS CHART */}
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderTop: '4px solid #27ae60' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#27ae60' }}>💰 7-Day Revenue Trend</h3>
                {metrics.revenueTrends.length === 0 ? (
                    <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bdc3c7' }}>No revenue data for the last 7 days.</div>
                ) : (
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={metrics.revenueTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                                <YAxis tickFormatter={(value) => `$${value}`} />
                                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} labelStyle={{ color: '#7f8c8d' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Line type="monotone" dataKey="revenue" stroke="#27ae60" strokeWidth={3} activeDot={{ r: 8 }} name="Gross Revenue" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminAnalytics;