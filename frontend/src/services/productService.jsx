import api from './api';

// UPDATE: Now accepts dynamic parameters!
export const fetchProducts = async (params = {}) => {
    // Convert the params object { page: 1, search: 'cake' } into a URL string: "?page=1&search=cake"
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/products?${queryString}`);
    return response.data; // Note: This now returns an object with .data AND .pagination
};

// ... keep your other functions (createProduct, updateProduct, etc.) exactly the same
export const createProduct = async (productData) => {
    const response = await api.post('/products', productData);
    return response.data;
};

// Add this to your existing exports in productService.jsx
export const updateProduct = async (id, productData) => {
    // Make sure 'api' is whatever you named your Axios instance in this file
    return await api.put(`/products/${id}`, productData); 
};

// 🛡️ NEW: The missing delete function!
export const deleteProduct = async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
};
