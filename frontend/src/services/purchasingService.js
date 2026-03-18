import api from './api';

// Supplier Master Data
export const fetchSuppliers = async () => {
    const response = await api.get('/purchasing/suppliers');
    return response.data;
};

export const createSupplier = async (supplierData) => {
    const response = await api.post('/purchasing/suppliers', supplierData);
    return response.data;
};

// Purchase Orders
export const fetchPOs = async () => {
    const response = await api.get('/purchasing/pos');
    return response.data;
};

export const createPO = async (poData) => {
    const response = await api.post('/purchasing/pos', poData);
    return response.data;
};

export const receivePO = async (poId, warehouseId) => {
    const response = await api.post(`/purchasing/pos/${poId}/receive`, { warehouseId });
    return response.data;
};

export const addSupplierCatalogItem = async (supplierId, catalogData) => {
    const response = await api.post(`/purchasing/suppliers/${supplierId}/catalog`, catalogData);
    return response.data;
};