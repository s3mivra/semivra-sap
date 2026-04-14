import api from './api';

export const fetchAssets = async () => {
    const response = await api.get('/fixed-assets');
    return response.data;
};

export const registerAsset = async (payload) => {
    const response = await api.post('/fixed-assets', payload);
    return response.data;
};

export const runDepreciation = async (period) => {
    const response = await api.post('/fixed-assets/depreciate', { period });
    return response.data;
};