import api from './api';

// Fetch products that are specifically flagged as manufactured (assemblies/recipes)
export const getManufacturedProducts = async () => {
    // Assuming your product endpoint allows filtering, or we fetch all and filter on the frontend
    const response = await api.get('/products'); 
    return response.data;
};

// Execute the multi-level BOM production run
export const executeProductionRun = async (payload) => {
    const response = await api.post('/manufacturing/run', payload);
    return response.data;
};