import api from './api';

export const purchaseProduct = async (productId, paymentMethod = 'Stripe Mock', paymentReference = 'txn_12345') => {
    const payload = { productId, paymentMethod, paymentReference };
    const response = await api.post('/transactions/purchase', payload);
    return response.data;
};

export const fetchFinancialLedger = async () => {
    const response = await api.get('/transactions');
    return response.data;
};