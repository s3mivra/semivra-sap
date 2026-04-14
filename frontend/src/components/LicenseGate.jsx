import React, { useState } from 'react';
import api from '../services/api'; // We use your configured API proxy, NOT raw axios!
import { generateHWID } from '../utils/licenseHelper';
import { Key, AlertCircle, Loader, CheckCircle } from 'lucide-react';

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

            // 2. INTERCEPT & TRANSLATE THE ERROR 
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
        <div className="flex justify-center items-center h-screen bg-slate-900 font-inter">
            <form onSubmit={handleActivate} className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full mx-4">
                <div className="flex justify-center mb-6">
                    <div className="flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full">
                        <Key className="w-8 h-8 text-slate-600" />
                    </div>
                </div>
                <h2 className="text-2xl font-light tracking-tight text-slate-900 mb-6">System Activation</h2>
                
                <input 
                    placeholder="Enter Product Key" 
                    value={key} 
                    onChange={e => setKey(e.target.value.toUpperCase())}
                    className="w-full p-4 text-lg rounded-lg border border-slate-300 text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200 mb-4 font-mono"
                />
                
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 flex items-center justify-center gap-2 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}
                
                <button type="submit" className="w-full p-4 bg-slate-900 text-white border-none rounded-lg text-base font-medium transition-all duration-200 hover:bg-slate-800 hover:shadow-lg flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Activate Enterprise License
                </button>
            </form>
        </div>
    );
};

export default LicenseGate;