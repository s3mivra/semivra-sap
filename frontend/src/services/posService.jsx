import api from './api';

export const processCheckout = async (checkoutData) => {
    const response = await api.post('/pos/checkout', checkoutData);
    return response.data;
};

// Add these below your existing processCheckout function
export const fetchSalesHistory = async () => {
    const response = await api.get('/pos/history');
    return response.data;
};

export const processRefund = async (saleId, warehouseId) => {
    // We pass a warehouseId so the system knows which warehouse to put the item back into!
    const response = await api.post(`/pos/${saleId}/refund`, { warehouseId });
    return response.data;
};