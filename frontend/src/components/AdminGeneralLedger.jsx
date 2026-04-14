import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchJournalEntries } from '../services/accountingService'; // Removed unused endpoints!

const AdminGeneralLedger = () => {
    const [journals, setJournals] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            // Only fetching the ledger history now!
            const jrnData = await fetchJournalEntries();
            setJournals(jrnData.data);
        } catch (error) {
            console.error('Failed to load ledger data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    if (loading) return <div style={{ padding: '20px' }}>Loading General Ledger...</div>;

    return (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            
            {/* HEADER WITH NEW ROUTING BUTTON */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>General Ledger</h2>
                    <p style={{ margin: 0, fontSize: '14px', color: '#7f8c8d' }}>Master record of all financial transactions.</p>
                </div>
                
                {/* 💡 Routes to our new, bulletproof form */}
                <Link 
                    to="/admin/journal-entry" 
                    style={{ backgroundColor: '#2c3e50', color: '#fff', padding: '10px 20px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                >
                    + Record New Journal Entry
                </Link>
            </div>

            {/* LEDGER DISPLAY */}
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#34495e' }}>Recent Transactions</h3>
            {journals.length === 0 ? <p style={{ color: '#7f8c8d' }}>No journal entries found.</p> : (
                journals.map(journal => (
                    <div key={journal._id} style={{ marginBottom: '20px', border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ backgroundColor: '#f8f9fa', padding: '10px 15px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', fontSize: '14px', color: '#7f8c8d' }}>
                            <span><strong>{journal.entryNumber}</strong> | {new Date(journal.date).toLocaleDateString()}</span>
                            <span>{journal.description} (Posted by {journal.postedBy?.name || 'System'})</span>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                            <tbody>
                                {journal.lines.map((line, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                        <td style={{ padding: '8px 15px', width: '40%' }}>{line.account?.code} - {line.account?.name}</td>
                                        <td style={{ padding: '8px 15px', width: '30%', color: '#95a5a6' }}>{line.memo}</td>
                                        <td style={{ padding: '8px 15px', width: '15%', color: '#27ae60', fontWeight: 'bold' }}>{line.debit > 0 ? `$${line.debit.toFixed(2)}` : ''}</td>
                                        <td style={{ padding: '8px 15px', width: '15%', color: '#e74c3c', fontWeight: 'bold' }}>{line.credit > 0 ? `$${line.credit.toFixed(2)}` : ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))
            )}
        </div>
    );
};

export default AdminGeneralLedger;