import React, { useState } from 'react';
import { verifyLicenseKey } from '../services/licenseService';

const LicenseManager = () => {
    const [keyInput, setKeyInput] = useState('');
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        try {
            const data = await verifyLicenseKey(keyInput);
            setStatus({ type: 'success', message: `Valid! Associated with ${data.data.product.name}` });
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
        <div className="license-manager" style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', maxWidth: '400px' }}>
            <h3>Verify Software License</h3>
            <form onSubmit={handleVerify}>
                <input 
                    type="text" 
                    placeholder="Enter License Key (UUID)" 
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
                    required
                />
                <button disabled={loading} style={{ padding: '10px 20px', cursor: 'pointer' }}>
                    {loading ? 'Checking...' : 'Verify Key'}
                </button>
            </form>

            {status && (
                <div style={{ marginTop: '15px', color: status.type === 'error' ? 'red' : 'green', fontWeight: 'bold' }}>
                    {status.message}
                </div>
            )}
        </div>
    );
};

export default LicenseManager;