import api from './api';

export const fetchDashboardMetrics = async () => {
    const response = await api.get('/analytics/metrics');
    return response.data;
};