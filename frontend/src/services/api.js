import axios from 'axios';

// Create a centralized Axios instance
const api = axios.create({
    baseURL: 'http://localhost:5004/api', 
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request Interceptor: Attach JWT Token AND License Headers
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

    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response Interceptor: Catch Unauthorized (401) and License Issues (402/403)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response ? error.response.status : null;

        if (status === 401) {
            console.error("Unauthorized! Session expired.");
            // Optional: localStorage.clear(); window.location.href = '/';
        }

        // NEW: License Rejection (Expired, Invalid, or Hardware Mismatch)
        if (status === 402 || status === 403) {
            console.error("License Error:", error.response.data.message);
            
            // If the license fails, we force the user back to the activation screen
            localStorage.removeItem('license_key');
            localStorage.removeItem('license_hwid');
            window.location.reload(); // This triggers the LicenseGate in App.js
        }

        return Promise.reject(error);
    }
);

export default api;