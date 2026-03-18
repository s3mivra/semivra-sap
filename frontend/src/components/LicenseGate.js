import React, { useState } from 'react';
import api from '../services/api'; // We use your configured API proxy, NOT raw axios!
import { generateHWID } from '../utils/licenseHelper';

const LicenseGate = ({ onValidated }) => {
    const [key, setKey] = useState('');
    const [error, setError] = useState('');

    const handleActivate = async (e) => {
        // 1. STOP THE PAGE FROM REFRESHING INSTANTLY
        e.preventDefault(); 
        setError(''); // Clear any previous errors

        const hwid = generateHWID();
        
        // 2. USE THE ACTUAL KEY THEY TYPED (Not the placeholder!)
        const userKey = key.trim(); 

        if (!userKey) {
            setError("Please enter a valid license key.");
            return;
        }

        try {
            // 3. SECURE PROXY CALL: Hit your client backend, which secretly pings God Mode
            const response = await api.post('/licenses/verify', {
                licenseKey: userKey,
                hwid: hwid
            });

            if (response.data.success || response.data.valid) {
                // Success! Store it locally
                localStorage.setItem('license_key', userKey);
                localStorage.setItem('license_hwid', hwid);
                
                // Alert the user and reload to apply the Axios Interceptor headers
                alert("Enterprise License Activated Successfully!");
                window.location.reload(); 
            }
        } catch (err) {
            // 1. Get the raw error message sent by the backend
            let errorMessage = err.response?.data?.message || "Failed to reach activation server. Check your connection.";

            // 2. 🚨 INTERCEPT & TRANSLATE THE ERROR 🚨
            // If the backend complains about the hardware ID, we show a professional message
            if (errorMessage.includes("Hardware Mismatch")) {
                errorMessage = "This license key is already activated on another device.";
            } 
            else if (errorMessage.includes("Invalid")) {
                errorMessage = "The product key you entered does not exist.";
            }

            // 3. Display the translated error on the screen
            setError(errorMessage); 
        }
    };

    return (
        <div style={{ height: '100vh', backgroundColor: '#2c3e50', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <form onSubmit={handleActivate} style={{ background: 'white', padding: '40px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                <h2 style={{ color: '#2c3e50', marginBottom: '20px' }}>🔑 System Activation</h2>
                
                <input 
                    placeholder="Enter Product Key" 
                    value={key} 
                    onChange={e => setKey(e.target.value.toUpperCase())}
                    style={{ padding: '12px', width: '300px', fontSize: '18px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc', textAlign: 'center', letterSpacing: '1px' }}
                />
                
                {error && <p style={{ color: '#e74c3c', fontWeight: 'bold', margin: '0 0 15px 0' }}>{error}</p>}
                
                <button type="submit" style={{ display: 'block', width: '100%', padding: '12px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Activate Enterprise License
                </button>
            </form>
        </div>
    );
};

export default LicenseGate;