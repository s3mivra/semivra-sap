import React, { useState, useEffect } from 'react';
import { fetchUnpaidSales, receivePayment } from '../services/arService';
import { CheckCircle, DollarSign, CreditCard, FileText } from 'lucide-react';
import CustomerLedger from './Dashboards/CustomerLedger'; // 💡 The injected Ledger

const AdminAR = () => {
    const [unpaidSales, setUnpaidSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState({ type: '', message: '' });

    // 💡 UI State: Toggle between Payment and Ledger
    const [rightView, setRightView] = useState('payment'); 
    const [selectedCustomerId, setSelectedCustomerId] = useState(null);

    // Payment Terminal State
    const [activeDebt, setActiveDebt] = useState(null);
    const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'Cash', reference: '' });

    const loadData = async () => {
        try {
            const response = await fetchUnpaidSales();
            
            // 💡 FIX: Safely extract the array. 
            // If your backend returns { data: [...] }, response.data.data gets it.
            // If it returns raw [...], response.data gets it.
            // If both fail, we fallback to an empty array [] so .reduce() never crashes.
            const salesArray = response.data?.data || response.data || [];
            
            setUnpaidSales(Array.isArray(salesArray) ? salesArray : []);
        } catch (error) {
            console.error("Failed to load AR data");
            setUnpaidSales([]); // Fallback on error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // Action: Open Payment Terminal
    const handleSelectDebt = (sale) => {
        setActiveDebt(sale);
        // Fallback checks depending on how your backend populates the customer ID
        setSelectedCustomerId(sale.customer?._id || sale.customer || sale.customerId); 
        setPaymentForm({ amount: sale.balanceDue, method: 'Cash', reference: '' }); 
        setStatus({ type: '', message: '' });
        setRightView('payment'); // Auto-switch to payment tab
    };

    // Action: Open Customer Ledger
    const handleViewLedger = (sale) => {
        setSelectedCustomerId(sale.customer?._id || sale.customer || sale.customerId);
        setRightView('ledger'); // Auto-switch to ledger tab
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        setStatus({ type: '', message: '' });

        if (Number(paymentForm.amount) <= 0 || Number(paymentForm.amount) > activeDebt.balanceDue) {
            return setStatus({ type: 'error', message: `Invalid amount. Must be between ₱0.01 and ₱${activeDebt.balanceDue}` });
        }

        try {
            await receivePayment(activeDebt._id, {
                amount: Number(paymentForm.amount),
                method: paymentForm.method,
                reference: paymentForm.reference
            });

            setStatus({ type: 'success', message: `Successfully collected ₱${paymentForm.amount} from ${activeDebt.customerName}!` });
            setActiveDebt(null); 
            loadData(); 
        } catch (error) {
            setStatus({ type: 'error', message: error.response?.data?.message || 'Payment failed.' });
        }
    };

    if (loading) return <div>Loading Accounts Receivable...</div>;

    // 💡 FIX: Ensure we only run reduce if it's genuinely an array
    const safeSalesList = Array.isArray(unpaidSales) ? unpaidSales : [];
    const totalOutstanding = safeSalesList.reduce((sum, sale) => sum + (sale.balanceDue || 0), 0);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', height: 'calc(100vh - 100px)' }}>
            
            {/* LEFT COLUMN: The Aging AR Master List */}
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '15px', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, color: '#2c3e50' }}>Accounts Receivable (Outstanding)</h2>
                    <div style={{ backgroundColor: '#fdedec', padding: '10px 20px', borderRadius: '6px', border: '1px solid #fadbd8' }}>
                        <span style={{ fontSize: '12px', color: '#c0392b', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Company Debt</span><br/>
                        <span style={{ fontSize: '24px', color: '#c0392b', fontWeight: '900' }}>₱{totalOutstanding.toFixed(2)}</span>
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
                                <th style={{ padding: '12px', borderBottom: '2px solid #eee', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {unpaidSales.length === 0 ? (
                                <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#7f8c8d', fontSize: '16px' }}>
                                    <CheckCircle style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                    Zero outstanding debts! All customers are paid up.
                                </td></tr>
                            ) : (
                                safeSalesList.map(sale => (
                                    <tr key={sale._id} style={{ borderBottom: '1px solid #eee', backgroundColor: activeDebt?._id === sale._id ? '#ebf5fb' : 'transparent', transition: '0.2s' }}>
                                        <td style={{ padding: '12px', fontWeight: 'bold', fontFamily: 'monospace' }}>{sale.orNumber}</td>
                                        <td style={{ padding: '12px', color: '#7f8c8d' }}>{new Date(sale.createdAt).toLocaleDateString()}</td>
                                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#2980b9' }}>{sale.customerName}</td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>₱{sale.totalAmount.toFixed(2)}</td>
                                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#c0392b' }}>₱{sale.balanceDue.toFixed(2)}</td>
                                        <td style={{ padding: '12px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            {/* 💡 TWO BUTTONS NOW */}
                                            <button 
                                                onClick={() => handleSelectDebt(sale)} 
                                                style={{ padding: '6px 12px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                                            >
                                                Collect
                                            </button>
                                            <button 
                                                onClick={() => handleViewLedger(sale)} 
                                                style={{ padding: '6px 12px', backgroundColor: '#34495e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                                            >
                                                Ledger
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* RIGHT COLUMN: Tabbed Interface */}
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                
                {/* 💡 THE TAB SWITCHER */}
                <div style={{ display: 'flex', borderBottom: '2px solid #eee', marginBottom: '20px' }}>
                    <button 
                        onClick={() => setRightView('payment')}
                        style={{ flex: 1, padding: '10px', border: 'none', backgroundColor: rightView === 'payment' ? '#ebf5fb' : 'transparent', color: rightView === 'payment' ? '#2980b9' : '#7f8c8d', fontWeight: 'bold', cursor: 'pointer', borderBottom: rightView === 'payment' ? '3px solid #2980b9' : 'none', transition: '0.2s' }}
                    >
                        Payment Terminal
                    </button>
                    <button 
                        onClick={() => setRightView('ledger')}
                        style={{ flex: 1, padding: '10px', border: 'none', backgroundColor: rightView === 'ledger' ? '#ebf5fb' : 'transparent', color: rightView === 'ledger' ? '#2980b9' : '#7f8c8d', fontWeight: 'bold', cursor: 'pointer', borderBottom: rightView === 'ledger' ? '3px solid #2980b9' : 'none', transition: '0.2s' }}
                    >
                        Statement of Account
                    </button>
                </div>
                
                <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                    {rightView === 'payment' ? (
                        /* --- PAYMENT TERMINAL UI --- */
                        <>
                            {status.message && (
                                <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '4px', backgroundColor: status.type === 'success' ? '#e8f8f5' : '#fdedec', color: status.type === 'success' ? '#27ae60' : '#c0392b', fontWeight: 'bold', fontSize: '14px', textAlign: 'center' }}>
                                    {status.message}
                                </div>
                            )}

                            {!activeDebt ? (
                                <div style={{ textAlign: 'center', color: '#95a5a6', marginTop: '50px', padding: '20px', border: '2px dashed #eee', borderRadius: '8px' }}>
                                    <CreditCard style={{ width: '40px', height: '40px', marginBottom: '10px', margin: '0 auto', display: 'block' }} />
                                    Select "Collect" from the list to process a payment.
                                </div>
                            ) : (
                                <form onSubmit={handlePaymentSubmit} style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
                                    
                                    <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '6px', border: '1px solid #eee', marginBottom: '20px' }}>
                                        <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '5px' }}>Collecting from:</div>
                                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2980b9', marginBottom: '10px' }}>{activeDebt.customerName}</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderTop: '1px dashed #ccc', paddingTop: '10px' }}>
                                            <span style={{ color: '#7f8c8d' }}>Original Bill ({activeDebt.orNumber}):</span>
                                            <span>₱{activeDebt.totalAmount.toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', color: '#c0392b', marginTop: '5px' }}>
                                            <span>Current Balance:</span>
                                            <span>₱{activeDebt.balanceDue.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', fontWeight: 'bold', color: '#27ae60' }}>Amount to Pay (₱)</label>
                                        <input type="number" step="0.01" min="0.01" max={activeDebt.balanceDue} required value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '2px solid #27ae60', fontSize: '18px', fontWeight: 'bold', backgroundColor: '#e8f8f5', color: '#27ae60', boxSizing: 'border-box' }} />
                                    </div>

                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', fontWeight: 'bold' }}>Payment Method</label>
                                        <select value={paymentForm.method} onChange={e => setPaymentForm({...paymentForm, method: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}>
                                            <option value="Cash">Cash</option>
                                            <option value="Card">Credit/Debit Card</option>
                                            <option value="GCash">GCash</option>
                                            <option value="Bank Transfer">Bank Transfer</option>
                                        </select>
                                    </div>

                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', fontWeight: 'bold' }}>Reference / Check No. (Optional)</label>
                                        <input type="text" placeholder="e.g. GCash Ref 12345" value={paymentForm.reference} onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                                    </div>

                                    <button type="submit" style={{ width: '100%', padding: '15px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(39, 174, 96, 0.2)' }}>
                                        Receive Payment
                                    </button>
                                    
                                    <button type="button" onClick={() => setActiveDebt(null)} style={{ width: '100%', padding: '10px', backgroundColor: 'transparent', color: '#7f8c8d', border: 'none', marginTop: '10px', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}>
                                        Cancel
                                    </button>
                                </form>
                            )}
                        </>
                    ) : (
                        /* --- CUSTOMER LEDGER UI --- */
                        <>
                            {selectedCustomerId ? (
                                <div style={{ minHeight: '400px' }}>
                                    <CustomerLedger customerId={selectedCustomerId} />
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', color: '#95a5a6', marginTop: '50px', padding: '20px', border: '2px dashed #eee', borderRadius: '8px' }}>
                                    <FileText style={{ width: '40px', height: '40px', marginBottom: '10px', margin: '0 auto', display: 'block' }} />
                                    Select "Ledger" from the list to view a customer's Statement of Account.
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminAR;