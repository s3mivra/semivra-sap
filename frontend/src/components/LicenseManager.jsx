import React, { useState, useEffect } from 'react'; // 👇 Added useEffect here
import { verifyLicenseKey } from '../services/licenseService';
import { Key, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const getDeviceHWID = () => {
    let hwid = localStorage.getItem('device_hwid');
    if (!hwid) {
        hwid = crypto.randomUUID(); 
        localStorage.setItem('device_hwid', hwid); 
    }
    return hwid;
};

const LicenseManager = () => {
    const [keyInput, setKeyInput] = useState('');
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // 👇 1. ADD THIS: A state to hide the form
    const [isVerified, setIsVerified] = useState(false);

    // 👇 2. ADD THIS: The Startup Memory Check
    // When the page loads, check if they already activated it
    useEffect(() => {
        const activeLicense = localStorage.getItem('active_license');
        if (activeLicense) {
            setIsVerified(true); // Hide the form instantly!
        }
    }, []);

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        // 👇 Grab the HWID so we can send it to the backend
        const hwid = getDeviceHWID();

        try {
            // 👇 Make sure your verifyLicenseKey service accepts the HWID!
            const data = await verifyLicenseKey(keyInput, hwid); 
            
            setStatus({ type: 'success', message: `Valid! Associated with ${data.data.product.name}` });
            
            // 👇 3. ADD THIS: Save the receipt to memory on success!
            localStorage.setItem('active_license', keyInput);
            setIsVerified(true); // Hide the form!
            
        } catch (error) {
            setStatus({ 
                type: 'error', 
                message: error.response?.data?.message || 'Verification failed' 
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 border border-slate-200 rounded-xl bg-white shadow-sm max-w-md">
            <div className="flex items-center gap-3 mb-6">
                <Key className="w-5 h-5 text-slate-400" />
                <h3 className="text-lg font-light tracking-tight text-slate-900">Verify Software License</h3>
            </div>
            
            {/* 👇 4. ADD THIS: The UI Switch */}
            {isVerified ? (
                /* IF VERIFIED: Show this green success box */
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <h4 className="text-green-800 font-bold">System Licensed</h4>
                    <p className="text-green-600 text-xs mt-1">This device is securely authorized.</p>
                </div>
            ) : (
                /* IF NOT VERIFIED: Show your normal form */
                <>
                    <form onSubmit={handleVerify}>
                        <input 
                            type="text" 
                            placeholder="Enter License Key (UUID)" 
                            value={keyInput}
                            onChange={(e) => setKeyInput(e.target.value)}
                            className="w-full p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200 mb-4"
                            required
                        />
                        <button 
                            disabled={loading} 
                            className="w-full p-3 bg-slate-900 text-white border-none rounded-lg cursor-pointer font-medium transition-all duration-200 hover:bg-slate-800 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Checking...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    Verify Key
                                </>
                            )}
                        </button>
                    </form>

                    {status && (
                        <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
                            status.type === 'error' 
                                ? 'bg-red-50 border border-red-200 text-red-700' 
                                : 'bg-green-50 border border-green-200 text-green-700'
                        }`}>
                            {status.type === 'error' ? (
                                <AlertCircle className="w-4 h-4" />
                            ) : (
                                <CheckCircle className="w-4 h-4" />
                            )}
                            {status.message}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default LicenseManager;