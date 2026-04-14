import api from './api';

export const getUnreconciledCash = async () => {
    const response = await api.get('/reconciliation/unreconciled');
    return response.data;
};

export const reconcileTransactions = async (payload) => {
    const response = await api.post('/reconciliation/clear', payload);
    return response.data;
};
// Inside services/accountingService.js

// Clean, simple, and now automatically division-aware!
export const fetchAccounts = async () => {
    const response = await api.get('/accounting/accounts');
    return response.data;
};

export const createAccount = async (accountData) => {
    const response = await api.post('/accounting/accounts', accountData);
    return response.data;
};

export const deleteAccount = async (id) => {
    // Assuming you have your 'api' axios instance imported here
    return await api.delete(`/accounting/accounts/${id}`);
};
// --- NEW JOURNAL ENTRY SERVICES ---

export const fetchJournalEntries = async () => {
    const response = await api.get('/accounting/journals');
    return response.data;
};

export const createJournalEntry = async (journalData) => {
    const response = await api.post('/accounting/journals', journalData);
    return response.data;
};

export const fetchUnpaidBills = async () => {
    // Fetches Purchase Orders that are marked as "Terms" and not fully paid
    return await api.get('/accounting/ap/unpaid'); 
};

export const recordPayment = async (paymentData) => {
    // Posts the payment and creates the Journal Entry (Debit AP, Credit Cash)
    return await api.post('/accounting/ap/pay', paymentData); 
};