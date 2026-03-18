import React, { useState, useEffect } from 'react';
import { fetchAccounts, createAccount } from '../services/accountingService';

const AdminChartOfAccounts = () => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState({ type: '', message: '' });

    const [formData, setFormData] = useState({
        code: '',
        name: '',
        type: 'Asset',
        description: ''
    });

    const loadAccounts = async () => {
        try {
            const data = await fetchAccounts();
            setAccounts(data.data);
        } catch (error) {
            console.error('Failed to load accounts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadAccounts(); }, []);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ type: '', message: '' });
        try {
            await createAccount(formData);
            setStatus({ type: 'success', message: `Account ${formData.code} created successfully!` });
            setFormData({ code: '', name: '', type: 'Asset', description: '' });
            loadAccounts(); // Refresh the table
        } catch (error) {
            setStatus({ type: 'error', message: error.response?.data?.message || 'Failed to create account.' });
        }
    };

    // Helper to color-code account types
    const getTypeColor = (type) => {
        switch(type) {
            case 'Asset': return '#27ae60'; // Green
            case 'Liability': return '#e74c3c'; // Red
            case 'Equity': return '#9b59b6'; // Purple
            case 'Revenue': return '#2980b9'; // Blue
            case 'Expense': return '#e67e22'; // Orange
            default: return '#7f8c8d';
        }
    };

    if (loading) return <div>Loading Chart of Accounts...</div>;

    return (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#2c3e50', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                Chart of Accounts (CoA)
            </h2>

            {status.message && (
                <div style={{ padding: '10px', marginBottom: '20px', borderRadius: '4px', backgroundColor: status.type === 'success' ? '#e8f8f5' : '#fdedec', color: status.type === 'success' ? '#27ae60' : '#c0392b' }}>
                    {status.message}
                </div>
            )}

            {/* Create Account Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '30px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                <div style={{ flex: '1 1 100px' }}>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Account Code</label>
                    <input type="text" name="code" required placeholder="e.g. 1010" value={formData.code} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
                </div>
                <div style={{ flex: '2 1 200px' }}>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Account Name</label>
                    <input type="text" name="name" required placeholder="e.g. Cash on Hand" value={formData.name} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
                </div>
                <div style={{ flex: '1 1 150px' }}>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Type</label>
                    <select name="type" value={formData.type} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
                        <option value="Asset">Asset</option>
                        <option value="Liability">Liability</option>
                        <option value="Equity">Equity</option>
                        <option value="Revenue">Revenue</option>
                        <option value="Expense">Expense</option>
                    </select>
                </div>
                <div style={{ flex: '3 1 250px' }}>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Description (Optional)</label>
                    <input type="text" name="description" value={formData.description} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button type="submit" style={{ padding: '9px 15px', backgroundColor: '#2c3e50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                        Add Account
                    </button>
                </div>
            </form>

            {/* Chart of Accounts Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', color: '#7f8c8d' }}>
                        <th style={{ padding: '12px', borderBottom: '2px solid #eee' }}>Code</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #eee' }}>Name</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #eee' }}>Type</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #eee' }}>Description</th>
                    </tr>
                </thead>
                <tbody>
                    {accounts.length === 0 ? (
                        <tr><td colSpan="4" style={{ padding: '15px', textAlign: 'center' }}>No accounts found. Start building your ledger!</td></tr>
                    ) : (
                        accounts.map(acc => (
                            <tr key={acc._id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '12px', fontWeight: 'bold', fontFamily: 'monospace' }}>{acc.code}</td>
                                <td style={{ padding: '12px' }}>{acc.name}</td>
                                <td style={{ padding: '12px' }}>
                                    <span style={{ backgroundColor: getTypeColor(acc.type) + '20', color: getTypeColor(acc.type), padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                                        {acc.type}
                                    </span>
                                </td>
                                <td style={{ padding: '12px', color: '#7f8c8d' }}>{acc.description}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default AdminChartOfAccounts;