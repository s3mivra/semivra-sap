import api from './api';

export const fetchCategories = async () => {
    const response = await api.get('/categories');
    return response.data;
};

export const createCategory = async (categoryData) => {
    const response = await api.post('/categories', categoryData);
    return response.data;
};

// 🛡️ NEW: Update Category
export const updateCategory = async (id, categoryData) => {
    const response = await api.put(`/categories/${id}`, categoryData);
    return response.data;
};

// 🛡️ NEW: Soft Delete Category
export const deleteCategory = async (id) => {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
};