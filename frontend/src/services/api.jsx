import axios from 'axios';

// Create a centralized Axios instance
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL, 
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request Interceptor: Attach JWT Token, License Headers, AND Division Context
api.interceptors.request.use((config) => {
    // 1. Get Auth Token (if you have standard login)
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. Get License Data
    const licenseKey = localStorage.getItem('license_key');
    const hwid = localStorage.getItem('license_hwid');

    // 3. Attach License to Headers so the Backend Shield lets it through!
    if (licenseKey && hwid) {
        config.headers['x-product-key'] = licenseKey;
        config.headers['x-hwid'] = hwid;
    }

    // 👇 THE FIX: Clean Enterprise Header Injection 👇
    const activeDivision = localStorage.getItem('activeDivision');
    if (activeDivision) {
        config.headers['x-division-id'] = activeDivision;
    }
    // 👆 ========================================= 👆

    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response Interceptor: Catch Unauthorized (401) and License Issues (402/403)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response ? error.response.status : null;
        const errorMessage = error.response?.data?.message || "";
        const originalUrl = error.config ? error.config.url : "";

        // 🚨 THE FIX: Only trigger session expiration if they ARE NOT trying to log in!
        if (status === 401 && !originalUrl.includes('/login')) {
            console.error("Unauthorized! Session expired.");
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }

        // 🚨 THE FIX: Only wipe the license if it's a 402, OR if the 403 explicitly says it's a license error!
        if (status === 402 || (status === 403 && errorMessage.toLowerCase().includes('license'))) {
            console.error("License Error:", errorMessage);
            
            localStorage.removeItem('active_license'); 
            localStorage.removeItem('device_hwid');
            window.location.href = '/'; // Send them back to the start
        } 
        else if (status === 403) {
            // It's just a Role/Permission error! Do NOT wipe the memory or reload the page.
            console.warn("Access Denied to specific data:", errorMessage);
        }

        return Promise.reject(error);
    }
);

export default api;