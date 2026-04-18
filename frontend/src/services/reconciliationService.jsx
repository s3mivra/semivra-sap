import api from './api';

export const getUnreconciledCash = async () => {
    const response = await api.get('/reconciliation/unreconciled');
    return response.data;
};

export const reconcileBulkTransactions = async (clearedEntryIds) => {
    // ✅ Fix: You must include the payload in the POST request!
    const response = await api.post(`/reconciliation/clear`, { clearedEntryIds });
    return response.data;
};