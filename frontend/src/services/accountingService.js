import api from './api';

export const fetchAccounts = async () => {
    const response = await api.get('/accounting/accounts');
    return response.data;
};

export const createAccount = async (accountData) => {
    const response = await api.post('/accounting/accounts', accountData);
    return response.data;
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