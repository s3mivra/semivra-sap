import api from './api';

export const fetchUnpaidSales = async () => {
    const response = await api.get('/ar/unpaid');
    return response.data;
};

export const receivePayment = async (saleId, paymentData) => {
    const response = await api.post(`/ar/${saleId}/pay`, paymentData);
    return response.data;
};