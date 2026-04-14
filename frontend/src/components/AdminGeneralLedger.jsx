import React, { useState, useEffect } from 'react';
import { fetchAccounts, fetchJournalEntries, createJournalEntry } from '../services/accountingService';

const AdminGeneralLedger = () => {
    const [accounts, setAccounts] = useState([]);
    const [journals, setJournals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState({ type: '', message: '' });

    // State for the manual journal entry form
    const [description, setDescription] = useState('');
    const [lines, setLines] = useState([
        { account: '', debit: '', credit: '', memo: '' },
        { account: '', debit: '', credit: '', memo: '' } 
    ]);

    const loadData = async () => {
        try {
            const [accData, jrnData] = await Promise.all([fetchAccounts(), fetchJournalEntries()]);
            setAccounts(accData.data);
            setJournals(jrnData.data);
        } catch (error) {
            console.error('Failed to load ledger data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // Form Handlers
    const handleLineChange = (index, field, value) => {
        const newLines = [...lines];
        
        // If they clear the input, set it to empty string so it doesn't show a weird '0'
        if (field === 'debit' || field === 'credit') {
            newLines[index][field] = value === '' ? '' : Number(value);
        } else {
            newLines[index][field] = value;
        }
        
        setLines(newLines);
    };

    const addLine = () => setLines([...lines, { account: '', debit: '', credit: '', memo: '' }]);
    const removeLine = (index) => setLines(lines.filter((_, i) => i !== index));

    // 👇 ENTERPRISE MATH FIXES 👇
    const totalDebit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
    
    // Use Math.abs to prevent 0.000000001 floating point javascript bugs
    const isOutOfBalance = Math.abs(totalDebit - totalCredit) > 0.001; 
    const isEmpty = totalDebit === 0 && totalCredit === 0;
    
    // It is ONLY valid to submit if it is not empty, AND it perfectly balances.
    const canSubmit = !isEmpty && !isOutOfBalance;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ type: '', message: '' });

        if (!canSubmit) {
            return setStatus({ type: 'error', message: 'Journal entry must be balanced (Debits = Credits) and greater than zero.' });
        }

        // Filter out empty lines
        const validLines = lines.filter(l => l.account && (Number(l.debit) > 0 || Number(l.credit) > 0));

        try {
            await createJournalEntry({ description, lines: validLines });
            setStatus({ type: 'success', message: 'Journal Entry posted successfully!' });
            setDescription('');
            setLines([{ account: '', debit: '', credit: '', memo: '' }, { account: '', debit: '', credit: '', memo: '' }]);
            loadData(); 
        } catch (error) {
            setStatus({ type: 'error', message: error.response?.data?.message || 'Failed to post entry.' });
        }
    };

    if (loading) return <div style={{ padding: '20px' }}>Loading General Ledger...</div>;

    return (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#2c3e50', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                General Ledger & Manual Journals
            </h2>

            {status.message && (
                <div style={{ padding: '10px', marginBottom: '20px', borderRadius: '4px', backgroundColor: status.type === 'success' ? '#e8f8f5' : '#fdedec', color: status.type === 'success' ? '#27ae60' : '#c0392b' }}>
                    {status.message}
                </div>
            )}

            {/* MANUAL JOURNAL ENTRY FORM */}
            <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #eee', marginBottom: '30px' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#34495e' }}>Post Manual Journal Entry</h3>
                <form onSubmit={handleSubmit}>
                    <input type="text" required placeholder="Description / Reason for entry" value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    
                    {lines.map((line, index) => (
                        <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                            <select required value={line.account} onChange={(e) => handleLineChange(index, 'account', e.target.value)} style={{ flex: 2, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                                <option value="">-- Select Account --</option>
                                {accounts.map(acc => <option key={acc._id} value={acc._id}>{acc.code} - {acc.name}</option>)}
                            </select>
                            <input type="text" placeholder="Memo (Optional)" value={line.memo} onChange={(e) => handleLineChange(index, 'memo', e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                            <input type="number" min="0" step="0.01" placeholder="Debit" value={line.debit} onChange={(e) => handleLineChange(index, 'debit', e.target.value)} style={{ width: '100px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} disabled={Number(line.credit) > 0} />
                            <input type="number" min="0" step="0.01" placeholder="Credit" value={line.credit} onChange={(e) => handleLineChange(index, 'credit', e.target.value)} style={{ width: '100px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} disabled={Number(line.debit) > 0} />
                            {lines.length > 2 && (
                                <button type="button" onClick={() => removeLine(index)} style={{ padding: '8px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>X</button>
                            )}
                        </div>
                    ))}
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', paddingTop: '15px', borderTop: '2px solid #ddd' }}>
                        <button type="button" onClick={addLine} style={{ padding: '8px 15px', backgroundColor: '#7f8c8d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Add Line</button>
                        
                        {/* 👇 UPDATED UI LOGIC 👇 */}
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: isEmpty ? '#7f8c8d' : isOutOfBalance ? '#e74c3c' : '#27ae60' }}>
                            Totals: Debit ${totalDebit.toFixed(2)} | Credit ${totalCredit.toFixed(2)}
                            {isOutOfBalance && <span style={{ fontSize: '12px', marginLeft: '10px' }}>(Out of balance!)</span>}
                        </div>

                        <button type="submit" disabled={!canSubmit} style={{ padding: '10px 20px', backgroundColor: canSubmit ? '#2980b9' : '#bdc3c7', color: 'white', border: 'none', borderRadius: '4px', cursor: canSubmit ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}>
                            Post Entry
                        </button>
                    </div>
                </form>
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