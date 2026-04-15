import React, { useState, useEffect } from 'react';
// We will add these to your service file in the next step!
import { fetchUnpaidBills, recordPayment } from '../services/accountingService'; 

const AdminAP = () => {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState({ type: '', message: '' });
    
    // Payment Modal State
    const [payingBill, setPayingBill] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');

    const loadBills = async () => {
        try {
            const res = await fetchUnpaidBills();
            setBills(res.data.data);
        } catch (error) {
            console.error('Failed to load AP bills:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadBills(); }, []);

    const handlePayClick = (bill) => {
        setPayingBill(bill);
        setPaymentAmount(bill.balance); // Default to paying the full balance
    };

    const submitPayment = async (e) => {
        e.preventDefault();
        try {
            await recordPayment({
                purchaseOrderId: payingBill._id,
                amount: Number(paymentAmount)
            });
            setStatus({ type: 'success', message: `Payment of ₱${paymentAmount} recorded successfully!` });
            setPayingBill(null);
            loadBills(); // Refresh the list
        } catch (error) {
            setStatus({ type: 'error', message: 'Failed to record payment.' });
        }
    };

    if (loading) return <div style={{ padding: '20px' }}>Loading Accounts Payable...</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
            <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
                Accounts Payable (A/P)
            </h2>
            <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>Manage and pay outstanding balances to your suppliers.</p>

            {status.message && (
                <div style={{ padding: '10px', marginBottom: '20px', borderRadius: '4px', backgroundColor: status.type === 'success' ? '#e8f8f5' : '#fdedec', color: status.type === 'success' ? '#27ae60' : '#c0392b' }}>
                    {status.message}
                </div>
            )}

            {/* THE UNPAID BILLS TABLE */}
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead style={{ backgroundColor: '#f8f9fa', color: '#7f8c8d' }}>
                        <tr>
                            <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>PO Reference</th>
                            <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>Supplier</th>
                            <th style={{ padding: '15px', borderBottom: '2px solid #eee', textAlign: 'right' }}>Total Bill</th>
                            <th style={{ padding: '15px', borderBottom: '2px solid #eee', textAlign: 'right' }}>Balance Due</th>
                            <th style={{ padding: '15px', borderBottom: '2px solid #eee', textAlign: 'center' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bills.length === 0 ? (
                            <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#7f8c8d' }}>No outstanding bills! You are all caught up.</td></tr>
                        ) : (
                            bills.map(bill => (
                                <tr key={bill._id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '15px', fontWeight: 'bold', color: '#34495e' }}>{bill.poNumber}</td>
                                    <td style={{ padding: '15px', color: '#2c3e50' }}>{bill.supplier?.name || 'Unknown Supplier'}</td>
                                    <td style={{ padding: '15px', textAlign: 'right', color: '#7f8c8d' }}>₱{Number(bill.amount || 0).toFixed(2)}</td>
                                    <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', color: '#e74c3c' }}>₱{Number(bill.balanceDue || 0).toFixed(2)}</td>
                                    <td style={{ padding: '15px', textAlign: 'center' }}>
                                        <button 
                                            onClick={() => handlePayClick(bill)}
                                            style={{ padding: '6px 12px', backgroundColor: '#2980b9', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                                        >
                                            Record Payment
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* PAYMENT MODAL (Only shows when clicking "Record Payment") */}
            {payingBill && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', width: '400px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Pay Supplier: {payingBill.supplier?.name}</h3>
                        <p style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '20px' }}>PO Reference: <strong>{payingBill.poNumber}</strong></p>
                        
                        <form onSubmit={submitPayment}>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', fontWeight: 'bold' }}>Payment Amount (₱)</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    max={payingBill.balance} 
                                    required 
                                    value={paymentAmount} 
                                    onChange={e => setPaymentAmount(e.target.value)} 
                                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
                                />
                                <span style={{ fontSize: '11px', color: '#95a5a6' }}>Max amount: ₱{Number(payingBill.balance || 0).toFixed(2)}</span>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button type="button" onClick={() => setPayingBill(null)} style={{ flex: 1, padding: '10px', backgroundColor: '#ecf0f1', color: '#7f8c8d', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                                <button type="submit" style={{ flex: 2, padding: '10px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Confirm Payment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAP;