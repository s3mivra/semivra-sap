import React, { useState, useEffect } from 'react';
import { fetchUnpaidSales, receivePayment } from '../services/arService';

const AdminAR = () => {
    const [unpaidSales, setUnpaidSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState({ type: '', message: '' });

    // Payment Terminal State
    const [activeDebt, setActiveDebt] = useState(null);
    const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'Cash', reference: '' });

    const loadData = async () => {
        try {
            const response = await fetchUnpaidSales();
            setUnpaidSales(response.data);
        } catch (error) {
            console.error("Failed to load AR data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // When you click "Pay" on a row, load it into the right-side terminal
    const handleSelectDebt = (sale) => {
        setActiveDebt(sale);
        setPaymentForm({ amount: sale.balanceDue, method: 'Cash', reference: '' }); // Auto-fill the full balance!
        setStatus({ type: '', message: '' });
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        setStatus({ type: '', message: '' });

        if (Number(paymentForm.amount) <= 0 || Number(paymentForm.amount) > activeDebt.balanceDue) {
            return setStatus({ type: 'error', message: `Invalid amount. Must be between $0.01 and $${activeDebt.balanceDue}` });
        }

        try {
            await receivePayment(activeDebt._id, {
                amount: Number(paymentForm.amount),
                method: paymentForm.method,
                reference: paymentForm.reference
            });

            setStatus({ type: 'success', message: `Successfully collected $${paymentForm.amount} from ${activeDebt.customerName}!` });
            setActiveDebt(null); // Clear terminal
            loadData(); // Refresh the master list
        } catch (error) {
            setStatus({ type: 'error', message: error.response?.data?.message || 'Payment failed.' });
        }
    };

    if (loading) return <div>Loading Accounts Receivable...</div>;

    // Calculate Total AR for the dashboard header
    const totalOutstanding = unpaidSales.reduce((sum, sale) => sum + sale.balanceDue, 0);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', height: 'calc(100vh - 100px)' }}>
            
            {/* LEFT COLUMN: The Aging AR Master List */}
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '15px', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, color: '#2c3e50' }}>Accounts Receivable (Outstanding)</h2>
                    <div style={{ backgroundColor: '#fdedec', padding: '10px 20px', borderRadius: '6px', border: '1px solid #fadbd8' }}>
                        <span style={{ fontSize: '12px', color: '#c0392b', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Company Debt</span><br/>
                        <span style={{ fontSize: '24px', color: '#c0392b', fontWeight: '900' }}>${totalOutstanding.toFixed(2)}</span>
                    </div>
                </div>

                <div style={{ overflowY: 'auto', flexGrow: 1 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa' }}>
                            <tr style={{ color: '#7f8c8d' }}>
                                <th style={{ padding: '12px', borderBottom: '2px solid #eee' }}>OR Number</th>
                                <th style={{ padding: '12px', borderBottom: '2px solid #eee' }}>Date</th>
                                <th style={{ padding: '12px', borderBottom: '2px solid #eee' }}>Customer</th>
                                <th style={{ padding: '12px', borderBottom: '2px solid #eee', textAlign: 'right' }}>Total Bill</th>
                                <th style={{ padding: '12px', borderBottom: '2px solid #eee', textAlign: 'right', color: '#c0392b' }}>Balance Due</th>
                                <th style={{ padding: '12px', borderBottom: '2px solid #eee', textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {unpaidSales.length === 0 ? (
                                <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#7f8c8d', fontSize: '16px' }}>🎉 Zero outstanding debts! All customers are paid up.</td></tr>
                            ) : (
                                unpaidSales.map(sale => (
                                    <tr key={sale._id} style={{ borderBottom: '1px solid #eee', backgroundColor: activeDebt?._id === sale._id ? '#ebf5fb' : 'transparent', transition: '0.2s' }}>
                                        <td style={{ padding: '12px', fontWeight: 'bold', fontFamily: 'monospace' }}>{sale.orNumber}</td>
                                        <td style={{ padding: '12px', color: '#7f8c8d' }}>{new Date(sale.createdAt).toLocaleDateString()}</td>
                                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#2980b9' }}>{sale.customerName}</td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>${sale.totalAmount.toFixed(2)}</td>
                                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#c0392b' }}>${sale.balanceDue.toFixed(2)}</td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <button 
                                                onClick={() => handleSelectDebt(sale)} 
                                                style={{ padding: '6px 12px', backgroundColor: '#34495e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                                            >
                                                Collect
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* RIGHT COLUMN: The Payment Terminal */}
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#2c3e50', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Payment Terminal</h3>
                
                {status.message && (
                    <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '4px', backgroundColor: status.type === 'success' ? '#e8f8f5' : '#fdedec', color: status.type === 'success' ? '#27ae60' : '#c0392b', fontWeight: 'bold', fontSize: '14px', textAlign: 'center' }}>
                        {status.message}
                    </div>
                )}

                {!activeDebt ? (
                    <div style={{ textAlign: 'center', color: '#95a5a6', marginTop: '50px', padding: '20px', border: '2px dashed #eee', borderRadius: '8px' }}>
                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>💳</div>
                        Select a debt from the left to process a payment.
                    </div>
                ) : (
                    <form onSubmit={handlePaymentSubmit} style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
                        
                        {/* Debt Summary Card */}
                        <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '6px', border: '1px solid #eee', marginBottom: '20px' }}>
                            <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '5px' }}>Collecting from:</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2980b9', marginBottom: '10px' }}>{activeDebt.customerName}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderTop: '1px dashed #ccc', paddingTop: '10px' }}>
                                <span style={{ color: '#7f8c8d' }}>Original Bill ({activeDebt.orNumber}):</span>
                                <span>${activeDebt.totalAmount.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', color: '#c0392b', marginTop: '5px' }}>
                                <span>Current Balance:</span>
                                <span>${activeDebt.balanceDue.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Payment Inputs */}
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', fontWeight: 'bold', color: '#27ae60' }}>Amount to Pay ($)</label>
                            <input type="number" step="0.01" min="0.01" max={activeDebt.balanceDue} required value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '2px solid #27ae60', fontSize: '18px', fontWeight: 'bold', backgroundColor: '#e8f8f5', color: '#27ae60' }} />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', fontWeight: 'bold' }}>Payment Method</label>
                            <select value={paymentForm.method} onChange={e => setPaymentForm({...paymentForm, method: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                                <option value="Cash">💵 Cash</option>
                                <option value="Card">💳 Credit/Debit Card</option>
                                <option value="GCash">📱 GCash</option>
                                <option value="Bank Transfer">🏦 Bank Transfer</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', fontWeight: 'bold' }}>Reference / Check No. (Optional)</label>
                            <input type="text" placeholder="e.g. GCash Ref 12345" value={paymentForm.reference} onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                        </div>

                        <button type="submit" style={{ width: '100%', padding: '15px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(39, 174, 96, 0.2)', transition: '0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                            Receive Payment
                        </button>
                        
                        <button type="button" onClick={() => setActiveDebt(null)} style={{ width: '100%', padding: '10px', backgroundColor: 'transparent', color: '#7f8c8d', border: 'none', marginTop: '10px', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}>
                            Cancel
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default AdminAR;