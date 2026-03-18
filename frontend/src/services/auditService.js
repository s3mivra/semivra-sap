import api from './api';

export const fetchAuditLogs = async () => {
    const response = await api.get('/audit-logs');
    return response.data;
};