import React, { useEffect, useState, useContext } from 'react';
import { fetchJournalEntries } from '../services/accountingService';
import { AuthContext } from '../context/AuthContext';

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

    if (loading) return <div style={{ padding: '20px' }}>Loading FICO Dashboard...</div>;

    return (
        <div>
            <h1 style={{ margin: '0 0 20px 0', color: '#2c3e50' }}>Financial & Controlling (FICO) Overview</h1>

            {/* KPI Cards */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                <div style={{ flex: 1, backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '5px solid #27ae60' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#7f8c8d', fontSize: '14px', textTransform: 'uppercase' }}>Gross Revenue (All Time)</h3>
                    <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#2c3e50' }}>
                        ${kpis.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div style={{ flex: 1, backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '5px solid #2980b9' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#7f8c8d', fontSize: '14px', textTransform: 'uppercase' }}>Total Ledger Entries</h3>
                    <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#2c3e50' }}>{kpis.count}</p>
                </div>
            </div>

            {/* General Ledger Summary Table */}
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #eee', backgroundColor: '#fafafa' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', color: '#2c3e50' }}>Recent Financial Activity</h2>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8f9fa', color: '#7f8c8d', fontSize: '14px' }}>
                            <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>Date</th>
                            <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>Entry Number</th>
                            <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>Description</th>
                            <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>Posted By</th>
                            <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>Total Volume</th>
                        </tr>
                    </thead>
                    <tbody>
                        {journals.length === 0 ? (
                            <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>No financial data found.</td></tr>
                        ) : (
                            journals.map((txn) => (
                                <tr key={txn._id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '15px', fontSize: '14px' }}>{new Date(txn.date).toLocaleDateString()}</td>
                                    <td style={{ padding: '15px', fontSize: '14px', fontWeight: 'bold', fontFamily: 'monospace' }}>{txn.entryNumber}</td>
                                    <td style={{ padding: '15px', fontSize: '14px' }}>{txn.description}</td>
                                    <td style={{ padding: '15px', fontSize: '14px' }}>{txn.postedBy?.name || 'System'}</td>
                                    <td style={{ padding: '15px', fontSize: '14px', fontWeight: 'bold', color: '#2c3e50' }}>${txn.totalDebit.toFixed(2)}</td>
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