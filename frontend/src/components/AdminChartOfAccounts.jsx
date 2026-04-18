import React, { useState, useEffect, useContext } from 'react';
import { fetchAccounts, createAccount, deleteAccount, seedStandardAccounts } from '../services/accountingService';
// 👇 NEW: Import AuthContext to grab the user's division
import { AuthContext } from '../context/AuthContext'; 

const AdminChartOfAccounts = () => {
    // 👇 NEW: Grab the user and resolve their division
    const { user } = useContext(AuthContext);
    const resolvedDivisionId = localStorage.getItem('activeDivision') || user?.division?._id || user?.division;

    const [seedStatus, setSeedStatus] = useState('idle'); // 'idle' | 'loading' | 'complete'

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

        // 🛑 NEW: Block submission if division is completely missing
        if (!resolvedDivisionId) {
            setStatus({ type: 'error', message: 'Error: No division selected. Please select a division from the top navigation bar.' });
            return;
        }

        try {
            // 👇 NEW: Merge the form data with the resolved division ID!
            const payload = {
                ...formData,
                division: resolvedDivisionId
            };

            await createAccount(payload);
            setStatus({ type: 'success', message: `Account ${formData.code} created successfully!` });
            setFormData({ code: '', name: '', type: 'Asset', description: '' });
            loadAccounts(); // Refresh the table
        } catch (error) {
            setStatus({ type: 'error', message: error.response?.data?.message || 'Failed to create account.' });
        }
    };

    const handleDelete = async (id, accountName) => {
        // ERP Safeguard: Always ask for confirmation before deleting financial data
        if (!window.confirm(`CRITICAL WARNING: Are you sure you want to delete the account "${accountName}"? This cannot be undone.`)) {
            return;
        }

        setStatus({ type: '', message: '' });
        
        try {
            await deleteAccount(id);
            setStatus({ type: 'success', message: `Account "${accountName}" deleted successfully.` });
            loadAccounts(); // Instantly refresh the table
        } catch (error) {
            setStatus({ 
                type: 'error', 
                message: error.response?.data?.message || 'Failed to delete account. It may be in use.' 
            });
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

    const handleSeedEssentials = async () => {
        setSeedStatus('loading');
        try {
            // 🛡️ THE FIX: Using your clean service architecture!
            const data = await seedStandardAccounts();
            
            setSeedStatus('complete');
            loadAccounts(); // Refresh the table
            
            setTimeout(() => setSeedStatus('idle'), 3000);
            alert(data.message); 
            
        } catch (error) {
            setSeedStatus('idle');
            
            // Log the true error to the console
            console.error("🔥 SEED ERROR DETAILS:", error.response?.data || error.message);
            
            // Show the true error to the user
            const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;
            alert(`Setup Failed: ${errorMessage}`);
        }
    };

    if (loading) return <div>Loading Chart of Accounts...</div>;

    return (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#2c3e50', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                Chart of Accounts (CoA)
            </h2>

            <button
                onClick={handleSeedEssentials}
                disabled={seedStatus !== 'idle'}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    color: seedStatus === 'idle' ? 'white' : '#7f8c8d',
                    backgroundColor: seedStatus === 'idle' ? '#2980b9' : '#f8f9fa',
                    border: seedStatus === 'loading' ? '1px solid #bdc3c7' : 'none',
                    borderRadius: '4px',
                    cursor: seedStatus === 'idle' ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                    boxShadow: seedStatus === 'idle' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                }}
                onMouseOver={(e) => { if(seedStatus === 'idle') e.currentTarget.style.backgroundColor = '#2471a3' }}
                onMouseOut={(e) => { if(seedStatus === 'idle') e.currentTarget.style.backgroundColor = '#2980b9' }}
            >
                {seedStatus === 'idle' && (
                    <>
                        Auto-Fill Essentials
                    </>
                )}
                
                {seedStatus === 'loading' && (
                    <>
                        Syncing...
                    </>
                )}
                
                {seedStatus === 'complete' && (
                    <>
                        <span style={{ fontSize: '14px', color: '#27ae60' }}>✓</span> 
                        <span style={{ color: '#27ae60' }}>Setup Complete</span>
                    </>
                )}
            </button>

            {/* 👇 NEW: Visual Warning if Division is Missing 👇 */}
            {!resolvedDivisionId && (
                <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '4px', backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba' }}>
                    <strong>Warning: Division context is missing.</strong> You cannot create accounts without selecting a division. If you are a Super Admin, please select one from the top navigation menu.
                </div>
            )}

            {status.message && (
                <div style={{ padding: '10px', marginBottom: '20px', borderRadius: '4px', backgroundColor: status.type === 'success' ? '#e8f8f5' : '#fdedec', color: status.type === 'success' ? '#27ae60' : '#c0392b' }}>
                    {status.message}
                </div>
            )}

            {/* Create Account Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '30px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                <div style={{ flex: '1 1 100px' }}>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Account Code</label>
                    <input type="text" name="code" required placeholder="e.g. 1010" value={formData.code} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} disabled={!resolvedDivisionId} />
                </div>
                <div style={{ flex: '2 1 200px' }}>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Account Name</label>
                    <input type="text" name="name" required placeholder="e.g. Cash on Hand" value={formData.name} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} disabled={!resolvedDivisionId} />
                </div>
                <div style={{ flex: '1 1 150px' }}>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Type</label>
                    <select name="type" value={formData.type} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} disabled={!resolvedDivisionId}>
                        <option value="Asset">Asset</option>
                        <option value="Liability">Liability</option>
                        <option value="Equity">Equity</option>
                        <option value="Revenue">Revenue</option>
                        <option value="Expense">Expense</option>
                    </select>
                </div>
                <div style={{ flex: '3 1 250px' }}>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Description (Optional)</label>
                    <input type="text" name="description" value={formData.description} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} disabled={!resolvedDivisionId} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button type="submit" style={{ padding: '9px 15px', backgroundColor: !resolvedDivisionId ? '#95a5a6' : '#2c3e50', color: '#fff', border: 'none', borderRadius: '4px', cursor: !resolvedDivisionId ? 'not-allowed' : 'pointer', fontWeight: 'bold' }} disabled={!resolvedDivisionId}>
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
                        <th style={{ padding: '12px', borderBottom: '2px solid #eee', textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {accounts.length === 0 ? (
                        <tr><td colSpan="5" style={{ padding: '15px', textAlign: 'center' }}>No accounts found for this division. Start building your ledger!</td></tr>
                    ) : (
                        accounts.map(acc => (
                            <tr key={acc._id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '12px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                                    {acc.accountCode || acc.code}
                                </td>
                                <td style={{ padding: '12px' }}>
                                    {acc.accountName || acc.name}
                                </td>
                                <td style={{ padding: '12px' }}>
                                    <span style={{ 
                                        backgroundColor: getTypeColor(acc.accountType || acc.type) + '20', 
                                        color: getTypeColor(acc.accountType || acc.type), 
                                        padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' 
                                    }}>
                                        {acc.accountType || acc.type}
                                    </span>
                                </td>
                                <td style={{ padding: '12px', color: '#7f8c8d' }}>{acc.description}</td>
                                
                                <td style={{ padding: '12px', textAlign: 'right' }}>
                                    <button 
                                        onClick={() => handleDelete(acc._id, acc.accountName || acc.name)}
                                        style={{ 
                                            padding: '6px 12px', 
                                            backgroundColor: '#fee2e2', 
                                            color: '#ef4444', 
                                            border: '1px solid #f87171', 
                                            borderRadius: '4px', 
                                            cursor: 'pointer', 
                                            fontSize: '12px',
                                            fontWeight: 'bold'
                                        }}
                                        onMouseOver={(e) => e.target.style.backgroundColor = '#fecaca'}
                                        onMouseOut={(e) => e.target.style.backgroundColor = '#fee2e2'}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default AdminChartOfAccounts;