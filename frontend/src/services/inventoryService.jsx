import api from './api';

// Master Data
export const fetchWarehouses = async () => {
    const response = await api.get('/inventory/warehouses');
    return response.data;
};

export const createWarehouse = async (warehouseData) => {
    const response = await api.post('/inventory/warehouses', warehouseData);
    return response.data;
};

// Stock Movements
export const fetchStockHistory = async () => {
    const response = await api.get('/inventory/movements');
    return response.data;
};

export const recordMovement = async (movementData) => {
    const response = await api.post('/inventory/movements', movementData);
    return response.data;
};

// --- NEW: UNIT MASTER DATA ---
export const fetchUnits = async () => {
    const response = await api.get('/inventory/units');
    return response.data;
};

export const createUnit = async (unitData) => {
    const response = await api.post('/inventory/units', unitData);
    return response.data;
};