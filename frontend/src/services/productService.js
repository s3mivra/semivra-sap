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