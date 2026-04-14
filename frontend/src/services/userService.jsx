import api from './api';

export const fetchUsers = async () => {
    const response = await api.get('/users');
    return response.data;
};

export const createUser = async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
};

export const deleteUser = async (userId) => {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
};

// Add this right below your createUser and deleteUser functions:
export const updateUser = async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
};

export const updateUserRole = async (userId, newRole) => {
    const response = await api.put(`/users/${userId}/role`, { role: newRole });
    return response.data;
};