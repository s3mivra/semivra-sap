import api from './api';
export const fetchFinancialSummary = async () => {
    const response = await api.get('/reports/financials');
    return response.data;
};