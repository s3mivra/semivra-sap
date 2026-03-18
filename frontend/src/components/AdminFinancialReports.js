import React, { useState, useEffect } from 'react';
import { fetchFinancialSummary } from '../services/reportService';

const AdminFinancialReports = () => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadReport = async () => {
            try {
                const response = await fetchFinancialSummary();
                setReport(response.data);
            } catch (error) {
                console.error("Failed to load financials", error);
            } finally {
                setLoading(false);
            }
        };
        loadReport();
    }, []);

    if (loading) return <div>Calculating Financials...</div>;
    if (!report) return <div>Failed to load report data.</div>;

    // Helper for formatting money
    const formatMoney = (amount) => `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            
            {/* Header: Net Income Highlight */}
            <div style={{ backgroundColor: '#2c3e50', padding: '30px', borderRadius: '8px', color: 'white', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <div>
                    <h1 style={{ margin: '0 0 10px 0', fontSize: '24px' }}>Business Health Dashboard</h1>
                    <p style={{ margin: 0, color: '#bdc3c7' }}>Real-time aggregated financial statements.</p>
                </div>
                <div style={{ textAlign: 'right', backgroundColor: report.netIncome >= 0 ? '#27ae60' : '#c0392b', padding: '15px 30px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px', fontWeight: 'bold' }}>Net Income</div>
                    <div style={{ fontSize: '36px', fontWeight: '900' }}>{formatMoney(report.netIncome)}</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
                {/* LEFT: Profit & Loss Statement (Income Statement) */}
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderTop: '4px solid #2980b9' }}>
                    <h2 style={{ margin: '0 0 20px 0', color: '#2c3e50', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Profit & Loss (Income Statement)</h2>
                    
                    {/* Revenue Section */}
                    <h3 style={{ fontSize: '14px', color: '#7f8c8d', textTransform: 'uppercase' }}>Revenue</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0' }}>
                        {report.breakdown.revenue.map((acc, i) => (
                            <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #eee' }}>
                                <span>{acc.name}</span>
                                <span style={{ fontWeight: 'bold' }}>{acc.balance < 0 ? `(${formatMoney(Math.abs(acc.balance))})` : formatMoney(acc.balance)}</span>
                            </li>
                        ))}
                        <li style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 'bold', borderBottom: '2px solid #ddd', backgroundColor: '#f8f9fa' }}>
                            <span>Total Revenue</span>
                            <span>{formatMoney(report.revenue)}</span>
                        </li>
                    </ul>

                    {/* Expenses Section */}
                    <h3 style={{ fontSize: '14px', color: '#7f8c8d', textTransform: 'uppercase' }}>Operating Expenses</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0' }}>
                        {report.breakdown.expenses.length === 0 && <li style={{ padding: '8px 0', color: '#bdc3c7', fontStyle: 'italic' }}>No expenses recorded.</li>}
                        {report.breakdown.expenses.map((acc, i) => (
                            <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #eee' }}>
                                <span>{acc.name}</span>
                                <span>{formatMoney(acc.balance)}</span>
                            </li>
                        ))}
                        <li style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 'bold', borderBottom: '2px solid #ddd', backgroundColor: '#f8f9fa' }}>
                            <span>Total Expenses</span>
                            <span>{formatMoney(report.expenses)}</span>
                        </li>
                    </ul>

                    {/* Net Income */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', fontWeight: '900', fontSize: '20px', color: report.netIncome >= 0 ? '#27ae60' : '#c0392b', borderTop: '2px solid #333' }}>
                        <span>NET INCOME</span>
                        <span>{formatMoney(report.netIncome)}</span>
                    </div>
                </div>

                {/* RIGHT: Balance Sheet */}
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderTop: '4px solid #8e44ad' }}>
                    <h2 style={{ margin: '0 0 20px 0', color: '#2c3e50', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Balance Sheet</h2>
                    
                    {/* Assets Section */}
                    <h3 style={{ fontSize: '14px', color: '#7f8c8d', textTransform: 'uppercase' }}>Assets</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0' }}>
                        {report.breakdown.assets.map((acc, i) => (
                            <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #eee' }}>
                                <span>{acc.name}</span>
                                <span>{formatMoney(acc.balance)}</span>
                            </li>
                        ))}
                        <li style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 'bold', borderBottom: '2px solid #ddd', backgroundColor: '#f8f9fa' }}>
                            <span>Total Assets</span>
                            <span>{formatMoney(report.assets)}</span>
                        </li>
                    </ul>

                    {/* Liabilities Section */}
                    <h3 style={{ fontSize: '14px', color: '#7f8c8d', textTransform: 'uppercase' }}>Liabilities</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0' }}>
                        {report.breakdown.liabilities.map((acc, i) => (
                            <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #eee' }}>
                                <span>{acc.name}</span>
                                <span>{formatMoney(acc.balance)}</span>
                            </li>
                        ))}
                        <li style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 'bold', borderBottom: '2px solid #ddd', backgroundColor: '#f8f9fa' }}>
                            <span>Total Liabilities</span>
                            <span>{formatMoney(report.liabilities)}</span>
                        </li>
                    </ul>

                    {/* Equation Check */}
                    <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#fef9e7', borderLeft: '4px solid #f39c12', fontSize: '13px', color: '#d35400' }}>
                        <strong>Accounting Equation Check:</strong><br/>
                        Assets ({formatMoney(report.assets)}) must equal Liabilities ({formatMoney(report.liabilities)}) + Equity ({formatMoney(report.equity)}) + Net Income ({formatMoney(report.netIncome)}).
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminFinancialReports;