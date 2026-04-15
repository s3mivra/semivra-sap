import React, { useState, useEffect } from 'react';
import { fetchProducts } from '../services/productService';
import { fetchWarehouses, submitProductionRun } from '../services/inventoryService';

const AdminProduction = () => {
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState({ type: '', message: '' });
    
    const [formData, setFormData] = useState({
        productId: '',
        quantityProduced: '',
        warehouseId: ''
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const [prodRes, whRes] = await Promise.all([
                    fetchProducts(),
                    fetchWarehouses()
                ]);

                // Only show products that actually have ingredients to assemble
                const assembledGoods = prodRes.data.filter(p => p.ingredients && p.ingredients.length > 0);
                setProducts(assembledGoods);
                setWarehouses(whRes.data || whRes); // Handle depending on how your API wraps data

                if (assembledGoods.length > 0) setFormData(prev => ({ ...prev, productId: assembledGoods[0]._id }));
                if (whRes.data?.length > 0) setFormData(prev => ({ ...prev, warehouseId: whRes.data[0]._id }));
            } catch (error) {
                console.error("Failed to load production data:", error);
                setStatus({ type: 'error', message: 'Failed to load system data.' });
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ type: '', message: '' });

        try {
            const res = await submitProductionRun({
                productId: formData.productId,
                quantityProduced: Number(formData.quantityProduced),
                warehouseId: formData.warehouseId
            });
            
            setStatus({ type: 'success', message: res.message || 'Production run successful!' });
            setFormData(prev => ({ ...prev, quantityProduced: '' })); // Clear the input
        } catch (error) {
            const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Production failed.';
            setStatus({ type: 'error', message: errorMsg });
        }
    };

    if (loading) return <div style={{ padding: '20px' }}>Loading Kitchen Dashboard...</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                
                <h2 style={{ margin: '0 0 10px 0', color: '#2c3e50', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                    Kitchen Production Run
                </h2>
                <p style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '20px' }}>
                    Assemble finished goods from raw materials.
                </p>

                {status.message && (
                    <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '4px', backgroundColor: status.type === 'success' ? '#e8f8f5' : '#fdedec', color: status.type === 'success' ? '#27ae60' : '#c0392b', fontWeight: 'bold' }}>
                        {status.message}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    
                    {/* What are we making? */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', color: '#34495e' }}>Finished Good to Produce</label>
                        <select 
                            required
                            value={formData.productId} 
                            onChange={e => setFormData({...formData, productId: e.target.value})}
                            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                        >
                            <option value="">-- Select Product --</option>
                            {products.map(p => (
                                <option key={p._id} value={p._id}>{p.name} (Current Stock: {p.currentStock || 0})</option>
                            ))}
                        </select>
                    </div>

                    {/* Where are we putting it? */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', color: '#34495e' }}>Destination Warehouse (Fridge/Shelf)</label>
                        <select 
                            required
                            value={formData.warehouseId} 
                            onChange={e => setFormData({...formData, warehouseId: e.target.value})}
                            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                        >
                            <option value="">-- Select Destination --</option>
                            {warehouses.map(w => (
                                <option key={w._id} value={w._id}>{w.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* How many? */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', color: '#27ae60' }}>Quantity Produced</label>
                        <input 
                            type="number" 
                            min="1" 
                            required
                            placeholder="e.g., 20"
                            value={formData.quantityProduced} 
                            onChange={e => setFormData({...formData, quantityProduced: e.target.value})}
                            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '2px solid #27ae60', fontSize: '16px', fontWeight: 'bold' }}
                        />
                    </div>

                    <button type="submit" style={{ marginTop: '10px', padding: '12px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Execute Production Run
                    </button>
                </form>

            </div>
        </div>
    );
};

export default AdminProduction;