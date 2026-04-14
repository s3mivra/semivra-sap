import api from './api';

export const fetchAnalytics = async () => {
    const response = await api.get('/analytics/metrics');
    return response.data;
};