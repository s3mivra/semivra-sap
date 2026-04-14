import React, { useState, useEffect } from 'react';
import { fetchSalesHistory, processRefund } from '../services/posService';
import { fetchWarehouses } from '../services/inventoryService';
import { FileText, Search, AlertCircle, CheckCircle } from 'lucide-react';

const AdminSalesHistory = () => {
    const [sales, setSales] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [searchTerm, setSearchTerm] = useState('');

    const loadData = async () => {
        try {
            const [salesData, whData] = await Promise.all([fetchSalesHistory(), fetchWarehouses()]);
            setSales(salesData.data);
            setWarehouses(whData.data);
        } catch (error) { console.error("Failed to load history"); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, []);

    const handleRefund = async (sale) => {
        if (!window.confirm(`Are you sure you want to refund ${sale.orNumber} for $${sale.totalAmount.toFixed(2)}? This cannot be undone.`)) return;
        
        // If the sale has physical items, we need to know where to put them back!
        let returnToWarehouse = null;
        const hasPhysical = sale.items.some(i => i.product?.isPhysical);
        
        if (hasPhysical) {
            if (warehouses.length === 0) return setStatus({ type: 'error', message: 'No warehouses found to return stock to.' });
            returnToWarehouse = warehouses[0]._id; // Defaulting to the first warehouse for simplicity
        }

        try {
            await processRefund(sale._id, returnToWarehouse);
            setStatus({ type: 'success', message: `Successfully refunded ${sale.orNumber}!` });
            loadData();
        } catch (error) {
            setStatus({ type: 'error', message: error.response?.data?.message || 'Refund failed.' });
        }
    };

    // SAFE FILTER: Adds fallback empty strings ('') in case older database records are missing these fields
    const filteredSales = sales.filter(s => {
        const safeOrNumber = s.orNumber || '';
        const safeCustomerName = s.customerName || '';
        
        return safeOrNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
               safeCustomerName.toLowerCase().includes(searchTerm.toLowerCase());
    });

    if (loading) return <div style={{ padding: '20px' }}>Loading Sales History...</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FileText style={{ width: '24px', height: '24px', color: '#2c3e50' }} />
                    <h1 style={{ margin: 0, color: '#2c3e50' }}>Sales & Refund History</h1>
                </div>
                <input 
                    type="text" 
                    placeholder="Search OR Number or Customer..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ padding: '10px', width: '300px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
            </div>

            {status.message && (
                <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '4px', backgroundColor: status.type === 'success' ? '#e8f8f5' : '#fdedec', color: status.type === 'success' ? '#27ae60' : '#c0392b', fontWeight: 'bold' }}>
                    {status.message}
                </div>
            )}

            <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead style={{ backgroundColor: '#f8f9fa', color: '#7f8c8d' }}>
                        <tr>
                            <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>OR Number</th>
                            <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>Date & Time</th>
                            <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>Customer</th>
                            <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>Payment</th>
                            <th style={{ padding: '15px', borderBottom: '2px solid #eee', textAlign: 'right' }}>Total</th>
                            <th style={{ padding: '15px', borderBottom: '2px solid #eee', textAlign: 'center' }}>Status</th>
                            <th style={{ padding: '15px', borderBottom: '2px solid #eee', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSales.map(sale => (
                            <tr key={sale._id} style={{ borderBottom: '1px solid #eee', backgroundColor: sale.isRefunded ? '#fef9e7' : 'transparent' }}>
                                <td style={{ padding: '15px', fontWeight: 'bold', fontFamily: 'monospace' }}>{sale.orNumber}</td>
                                <td style={{ padding: '15px', color: '#7f8c8d' }}>{new Date(sale.createdAt).toLocaleString()}</td>
                                <td style={{ padding: '15px', fontWeight: 'bold', color: '#2980b9' }}>{sale.customerName}</td>
                                <td style={{ padding: '15px' }}>{sale.paymentMethod}</td>
                                <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold' }}>${sale.totalAmount.toFixed(2)}</td>
                                <td style={{ padding: '15px', textAlign: 'center' }}>
                                    {sale.isRefunded ? (
                                        <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#fdedec', color: '#c0392b' }}>REFUNDED</span>
                                    ) : (
                                        <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#e8f8f5', color: '#27ae60' }}>{sale.status.toUpperCase()}</span>
                                    )}
                                </td>
                                <td style={{ padding: '15px', textAlign: 'center' }}>
                                    {!sale.isRefunded && sale.status === 'Paid' && (
                                        <button 
                                            onClick={() => handleRefund(sale)}
                                            style={{ padding: '6px 12px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', transition: '0.2s' }}
                                            onMouseOver={e => e.target.style.backgroundColor = '#c0392b'}
                                            onMouseOut={e => e.target.style.backgroundColor = '#e74c3c'}
                                        >
                                            Refund
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {filteredSales.length === 0 && (
                            <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#95a5a6' }}>No sales found matching your search.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminSalesHistory;