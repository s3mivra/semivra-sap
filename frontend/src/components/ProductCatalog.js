import React, { useEffect, useState } from 'react';
import { fetchProducts } from '../services/productService';
import { purchaseProduct } from '../services/transactionService';

const ProductCatalog = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [purchaseStatus, setPurchaseStatus] = useState(null);

    useEffect(() => {
        const getProducts = async () => {
            try {
                const data = await fetchProducts();
                setProducts(data.data);
            } catch (err) { console.error('Failed to load products.'); } 
            finally { setLoading(false); }
        };
        getProducts();
    }, []);

    const handlePurchase = async (productId) => {
        setPurchaseStatus({ type: 'loading', message: 'Processing transaction...' });
        try {
            // Mocking a Stripe payment reference for now
            const result = await purchaseProduct(productId, 'Mock Stripe', `txn_${Math.floor(Math.random() * 100000)}`);
            
            setPurchaseStatus({ 
                type: 'success', 
                message: `Success! Your License Key is: ${result.license.licenseKey}` 
            });
        } catch (error) {
            setPurchaseStatus({ type: 'error', message: 'Transaction failed.' });
        }
    };

    if (loading) return <div>Loading catalog...</div>;

    return (
        <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: 0 }}>Product Catalog</h2>
            
            {/* Purchase Status Alert */}
            {purchaseStatus && (
                <div style={{ padding: '15px', marginBottom: '20px', borderRadius: '4px', backgroundColor: purchaseStatus.type === 'success' ? '#e8f8f5' : (purchaseStatus.type === 'error' ? '#fdedec' : '#fef9e7'), color: '#333', fontWeight: 'bold' }}>
                    {purchaseStatus.message}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                {products.map(product => (
                    <div key={product._id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ margin: '0 0 5px 0' }}>{product.name}</h3>
                        <p style={{ fontSize: '12px', color: '#666', margin: '0 0 10px 0' }}>SKU: {product.sku}</p>
                        <p style={{ flexGrow: 1, margin: '0 0 15px 0', fontSize: '14px' }}>{product.description}</p>
                        <h4 style={{ color: '#2ecc71', margin: '0 0 15px 0', fontSize: '20px' }}>
                            ${product.price} <span style={{ fontSize: '12px', color: '#333' }}>{product.billingType === 'subscription' ? '/ yr' : '(One-time)'}</span>
                        </h4>
                        <button 
                            onClick={() => handlePurchase(product._id)}
                            style={{ padding: '10px', cursor: 'pointer', backgroundColor: '#2980b9', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
                            Buy & Generate License
                        </button>
                    </div>
                ))}
                {products.length === 0 && <p>No active products available.</p>}
            </div>
        </div>
    );
};

export default ProductCatalog;