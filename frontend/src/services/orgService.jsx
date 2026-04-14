import api from './api';

// Business Units
export const fetchBusinessUnits = () => api.get('/org/business-units');
export const createBusinessUnit = (data) => api.post('/org/business-units', data);

// Departments
export const fetchDepartments = () => api.get('/org/departments');
export const createDepartment = (data) => api.post('/org/departments', data);

// Roles
export const fetchRoles = () => api.get('/org/roles');
export const createRole = (data) => api.post('/org/roles', data);