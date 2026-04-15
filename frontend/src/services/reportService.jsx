import api from './api';

export const fetchBalanceSheet = async () => {
    const response = await api.get('/reports/balance-sheet');
    return response.data;
};

export const fetchIncomeStatement = async (startDate = '', endDate = '') => {
    const response = await api.get(`/reports/income-statement?startDate=${startDate}&endDate=${endDate}`);
    return response.data;
};

export const fetchTrialBalance = async (date) => {
    // Passes the selected date query parameter back to your controller
    return await api.get(`/reports/trial-balance?date=${date}`);
};