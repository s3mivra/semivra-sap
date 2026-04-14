import api from './api';

export const closeFinancialPeriod = async (period) => {
    // Hits the backend periodController.js we built earlier
    const response = await api.post('/periods/close', { period });
    return response.data;
};

export const fetchFinancialSummary = async () => {
    const response = await api.get('/reports/financials');
    return response.data;
};