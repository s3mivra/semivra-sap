import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

const SalesDashboard = () => {
    const { divisionId } = useContext(AuthContext);
    
    // 🛡️ THE FIX #1: Initialize with the correct object structure!
    const [salesData, setSalesData] = useState({ daily: [], monthly: [] });
    
    // 🛡️ Optional: Add a loading state for a better user experience
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setIsLoading(true);
            try {
                const response = await api.get('/analytics/sales-report');
                // Ensure the response data has the arrays, or fallback to empty arrays
                setSalesData({
                    daily: response.data?.daily || [],
                    monthly: response.data?.monthly || []
                });
            } catch (error) {
                console.error('Error fetching sales data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        if (divisionId) fetchAnalytics();
    }, [divisionId]);

    // Show a loading state while fetching data
    if (isLoading) {
        return <div className="p-6 text-slate-500 animate-pulse">Loading sales analytics...</div>;
    }

    return (
        <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">Sales Analytics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded shadow-sm border border-slate-100">
                    <h3 className="font-semibold text-lg border-b pb-2 mb-3">Daily Sales (MTD)</h3>
                    <ul className="space-y-2">
                        {/* 🛡️ THE FIX #2: Add the optional chaining question mark (?) just in case */}
                        {salesData.daily?.length === 0 ? (
                            <li className="text-sm text-slate-400">No daily sales data yet.</li>
                        ) : (
                            salesData.daily?.map(day => (
                                <li key={day._id} className="flex justify-between text-sm">
                                    <span className="text-slate-600">{day._id}</span>
                                    <span className="font-mono">₱{day.total.toLocaleString()}</span>
                                </li>
                            ))
                        )}
                    </ul>
                </div>

                <div className="bg-white p-4 rounded shadow-sm border border-slate-100">
                    <h3 className="font-semibold text-lg border-b pb-2 mb-3">Monthly Sales (YTD)</h3>
                    <ul className="space-y-2">
                        {salesData.monthly?.length === 0 ? (
                            <li className="text-sm text-slate-400">No monthly sales data yet.</li>
                        ) : (
                            salesData.monthly?.map(month => (
                                <li key={month._id} className="flex justify-between text-sm">
                                    <span className="text-slate-600">{month._id}</span>
                                    <span className="font-mono text-green-700 font-semibold">
                                        ₱{month.total.toLocaleString()}
                                    </span>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default SalesDashboard;