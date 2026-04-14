import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api'; // Assuming your custom Axios instance

const SalesDashboard = () => {
    const { divisionId } = useContext(AuthContext);
    const [salesData, setSalesData] = useState({ daily: [], monthly: [] });

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                // Ensure x-division-id is passed via the interceptor in api.jsx
                const response = await api.get('/analytics/sales-report');
                setSalesData(response.data);
            } catch (error) {
                console.error('Error fetching sales data:', error);
            }
        };
        if (divisionId) fetchAnalytics();
    }, [divisionId]);

    return (
        <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">Sales Analytics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded shadow-sm border border-slate-100">
                    <h3 className="font-semibold text-lg border-b pb-2 mb-3">Daily Sales (MTD)</h3>
                    <ul className="space-y-2">
                        {salesData.daily.map(day => (
                            <li key={day._id} className="flex justify-between text-sm">
                                <span className="text-slate-600">{day._id}</span>
                                <span className="font-mono">${day.total.toLocaleString()}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-white p-4 rounded shadow-sm border border-slate-100">
                    <h3 className="font-semibold text-lg border-b pb-2 mb-3">Monthly Sales (YTD)</h3>
                    <ul className="space-y-2">
                        {salesData.monthly.map(month => (
                            <li key={month._id} className="flex justify-between text-sm">
                                <span className="text-slate-600">{month._id}</span>
                                <span className="font-mono text-green-700 font-semibold">
                                  ${month.total.toLocaleString()}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default SalesDashboard;