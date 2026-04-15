import api from './api';

// --- Warehouses ---
export const fetchWarehouses = async () => {
    const response = await api.get('/inventory/warehouses');
    return response.data;
};

export const createWarehouse = async (warehouseData) => {
    const response = await api.post('/inventory/warehouses', warehouseData);
    return response.data;
};

// --- Stock Movements ---
export const fetchStockHistory = async () => {
    const response = await api.get('/inventory/movements');
    return response.data;
};

export const recordMovement = async (movementData) => {
    const response = await api.post('/inventory/movements', movementData);
    return response.data;
};

// --- UNIT MASTER DATA ---
export const fetchUnits = async () => {
    const response = await api.get('/inventory/units');
    return response.data;
};

export const createUnit = async (unitData) => {
    const response = await api.post('/inventory/units', unitData);
    return response.data;
};

// 🛡️ NEW: Update Unit
export const updateUnit = async (id, unitData) => {
    const response = await api.put(`/inventory/units/${id}`, unitData);
    return response.data;
};

// 🛡️ NEW: Soft Delete Unit
export const deleteUnit = async (id) => {
    const response = await api.delete(`/inventory/units/${id}`);
    return response.data;
};

// --- KITCHEN / PRODUCTION ---
export const submitProductionRun = async (productionData) => {
    // productionData will look like: { productId, quantityProduced, warehouseId }
    const response = await api.post('/inventory/produce', productionData);
    return response.data;
};