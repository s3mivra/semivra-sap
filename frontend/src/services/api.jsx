import axios from 'axios';

// Create a centralized Axios instance
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', // Added fallback for safety
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request Interceptor: Attach JWT Token, License Headers, AND Division Context
api.interceptors.request.use((config) => {
    // 1. Get Auth Token
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

    // 4. Clean Enterprise Header Injection
    // 4. Clean Enterprise Header Injection
    let activeDivision = localStorage.getItem('activeDivision');
    
    // Fallback: If activeDivision isn't set, grab it from the cached user object
    if (!activeDivision || activeDivision === 'undefined') {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            activeDivision = user?.division;
        } catch (e) {
            activeDivision = null;
        }
    }

    // Safely attach the header
    if (activeDivision) {
        config.headers['x-division-id'] = typeof activeDivision === 'object' ? activeDivision._id : activeDivision;
    }

    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response Interceptor: Catch Unauthorized (401), Token Refresh, and License Issues (402/403)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const status = error.response ? error.response.status : null;
        const errorMessage = error.response?.data?.message || error.response?.data?.error || "";
        const originalUrl = originalRequest ? originalRequest.url : "";

        // 🛡️ THE FIX: Silently refresh the token if it expired (401), unless they are already on the login page
        if (status === 401 && !originalUrl.includes('/login') && !originalRequest._retry) {
            originalRequest._retry = true; // Prevent infinite loops

            try {
                // Silently request a new JWT using the long-lived refresh token
                const refreshToken = localStorage.getItem('refresh_token');
                
                if (!refreshToken) throw new Error("No refresh token available");

                const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken });
                
                // Save the new token
                localStorage.setItem('token', data.token);
                
                // Update the failed request with the new token and retry it
                originalRequest.headers.Authorization = `Bearer ${data.token}`;
                return api(originalRequest);

            } catch (refreshError) {
                // The refresh token is dead or missing. NOW we kick them out.
                console.error("Session completely expired. Please log in again.");
                localStorage.removeItem('token');
                localStorage.removeItem('refresh_token'); // Clear the dead refresh token
                localStorage.removeItem('user');
                localStorage.removeItem('activeDivision'); // Clear tenant scope
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        // 🚨 THE FIX: Corrected localStorage keys for License wiping (Issue #6)
        if (status === 402 || (status === 403 && errorMessage.toLowerCase().includes('license'))) {
            console.error("License Error:", errorMessage);
            
            // Standardized key names to match LicenseGate.jsx
            localStorage.removeItem('license_key'); 
            localStorage.removeItem('license_hwid');
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