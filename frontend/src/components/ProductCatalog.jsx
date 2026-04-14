import React, { useEffect, useState } from 'react';
import { fetchProducts } from '../services/productService';
import { purchaseProduct } from '../services/transactionService';
import { Package, ShoppingCart, CheckCircle, AlertCircle, Loader } from 'lucide-react';

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

    if (loading) return (
        <div className="flex justify-center items-center p-8">
            <Loader className="w-6 h-6 animate-spin text-slate-400" />
            <span className="ml-2 text-slate-600">Loading catalog...</span>
        </div>
    );

    return (
        <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                <Package className="w-6 h-6 text-slate-400" />
                <h2 className="text-xl font-light tracking-tight text-slate-900 m-0">Product Catalog</h2>
            </div>
            
            {/* Purchase Status Alert */}
            {purchaseStatus && (
                <div className={`p-4 rounded-lg mb-6 flex items-center gap-3 text-sm font-medium ${
                    purchaseStatus.type === 'success' 
                        ? 'bg-green-50 border border-green-200 text-green-700' 
                        : purchaseStatus.type === 'error' 
                        ? 'bg-red-50 border border-red-200 text-red-700'
                        : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                }`}>
                    {purchaseStatus.type === 'loading' ? (
                        <Loader className="w-4 h-4 animate-spin" />
                    ) : purchaseStatus.type === 'success' ? (
                        <CheckCircle className="w-4 h-4" />
                    ) : (
                        <AlertCircle className="w-4 h-4" />
                    )}
                    {purchaseStatus.message}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map(product => (
                    <div key={product._id} className="border border-slate-200 p-6 rounded-xl flex flex-col hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center gap-2 mb-3">
                            <Package className="w-5 h-5 text-slate-400" />
                            <h3 className="text-lg font-medium text-slate-900 m-0">{product.name}</h3>
                        </div>
                        <p className="text-xs text-slate-500 mb-4 m-0">SKU: {product.sku}</p>
                        <p className="text-sm text-slate-600 flex-grow mb-6 m-0">{product.description}</p>
                        <div className="mb-6">
                            <h4 className="text-green-600 text-2xl font-light m-0">
                                ${product.price} 
                                <span className="text-xs text-slate-500 font-normal">
                                    {product.billingType === 'subscription' ? '/ yr' : '(One-time)'}
                                </span>
                            </h4>
                        </div>
                        <button 
                            onClick={() => handlePurchase(product._id)}
                            className="w-full p-3 bg-slate-900 text-white border-none rounded-lg cursor-pointer font-medium transition-all duration-200 hover:bg-slate-800 hover:shadow-lg flex items-center justify-center gap-2"
                        >
                            <ShoppingCart className="w-4 h-4" />
                            Buy & Generate License
                        </button>
                    </div>
                ))}
                {products.length === 0 && (
                    <div className="col-span-full text-center text-slate-500 py-8">
                        <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p>No active products available.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductCatalog;