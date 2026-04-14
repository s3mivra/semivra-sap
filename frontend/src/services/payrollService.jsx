import api from './api';

export const fetchPayrollRuns = async () => {
    const response = await api.get('/payroll');
    return response.data;
};

export const draftPayroll = async (payload) => {
    const response = await api.post('/payroll/draft', payload);
    return response.data;
};

export const approvePayroll = async (id) => {
    const response = await api.post(`/payroll/${id}/approve`);
    return response.data;
};