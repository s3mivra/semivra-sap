import React, { useState, useEffect } from 'react';
import { fetchSettings, lockPeriod, unlockPeriod } from '../services/settingsService';

const AdminSettings = () => {
    const [settings, setSettings] = useState(null);
    const [newLockDate, setNewLockDate] = useState('');
    const [status, setStatus] = useState({ type: '', message: '' });

    const currentUser = JSON.parse(localStorage.getItem('user')) || {};

    const loadSettings = async () => {
        try {
            const res = await fetchSettings();
            setSettings(res.data);
            // Default the date picker to the current locked date
            if (res.data && res.data.lockedDate) {
                setNewLockDate(new Date(res.data.lockedDate).toISOString().split('T')[0]);
            }
        } catch (error) { console.error("Failed to load settings"); }
    };

    useEffect(() => { loadSettings(); }, []);

    const handleLock = async (e) => {
        e.preventDefault();
        if (!window.confirm("WARNING: Closing the books is permanent. You will not be able to refund or alter any transactions prior to this date. Proceed?")) return;
        
        try {
            await lockPeriod(newLockDate);
            setStatus({ type: 'success', message: 'Accounting Period Locked successfully.' });
            loadSettings();
        } catch (error) {
            setStatus({ type: 'error', message: error.response?.data?.message || 'Failed to lock period.' });
        }
    };

    const handleUnlock = async () => {
        const confirmText = window.prompt("EMERGENCY OVERRIDE: Type 'UNLOCK' to reopen the books. This exposes past data to editing.");
        if (confirmText !== 'UNLOCK') {
            return setStatus({ type: 'error', message: 'Unlock aborted. Incorrect confirmation text.' });
        }
        
        try {
            await unlockPeriod();
            setStatus({ type: 'success', message: 'Books have been successfully unlocked.' });
            loadSettings();
        } catch (error) {
            setStatus({ type: 'error', message: error.response?.data?.message || 'Failed to unlock period.' });
        }
    };

    if (!settings) return <div style={{ padding: '20px' }}>Loading Settings...</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ color: '#2c3e50', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>⚙️ System Settings</h1>

            {status.message && (
                <div style={{ padding: '15px', marginBottom: '20px', borderRadius: '4px', backgroundColor: status.type === 'success' ? '#e8f8f5' : '#fdedec', color: status.type === 'success' ? '#27ae60' : '#c0392b', fontWeight: 'bold' }}>
                    {status.message}
                </div>
            )}

            <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderTop: '4px solid #8e44ad' }}>
                <h2 style={{ margin: '0 0 10px 0', color: '#8e44ad' }}>🔒 Period Locking (Close the Books)</h2>
                <p style={{ color: '#7f8c8d', fontSize: '14px', marginBottom: '20px' }}>
                    Locking an accounting period prevents any historical transactions (Sales, POs, Refunds) from being altered or deleted prior to the selected date. This ensures compliance after tax filing.
                </p>

                <div style={{ padding: '15px', backgroundColor: '#f9ebff', borderRadius: '6px', marginBottom: '20px', borderLeft: '4px solid #8e44ad' }}>
                    <strong style={{ color: '#2c3e50' }}>Current Locked Date: </strong> 
                    <span style={{ color: '#8e44ad', fontWeight: '900', fontSize: '18px', marginLeft: '10px' }}>
                        {new Date(settings.lockedDate).getFullYear() === 2000 ? 'Not Locked' : new Date(settings.lockedDate).toLocaleDateString()}
                    </span>
                </div>

                <form onSubmit={handleLock} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#34495e', marginBottom: '5px' }}>New Closing Date</label>
                        <input 
                            type="date" 
                            required 
                            value={newLockDate} 
                            onChange={(e) => setNewLockDate(e.target.value)}
                            style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
                        />
                    </div>
                    <button type="submit" style={{ padding: '12px 25px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', transition: '0.2s' }}>
                        Close Books
                    </button>
                </form>
            </div>
            {/* DANGER ZONE: Emergency Unlock (SUPER ADMIN ONLY) */}
            {currentUser.role === 'Super Admin' && (
                <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '2px dashed #e74c3c' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#e74c3c' }}>⚠️ Danger Zone: Emergency Unlock</h3>
                    <p style={{ color: '#7f8c8d', fontSize: '13px', marginBottom: '15px' }}>
                        Reopening the books allows modifications to historical records. This should only be used during an official audit adjustment or under direct instruction from the lead accountant.
                    </p>
                    <button 
                        onClick={handleUnlock} 
                        disabled={new Date(settings.lockedDate).getFullYear() === 2000}
                        style={{ padding: '10px 20px', backgroundColor: 'transparent', color: '#e74c3c', border: '2px solid #e74c3c', borderRadius: '4px', fontWeight: 'bold', cursor: new Date(settings.lockedDate).getFullYear() === 2000 ? 'not-allowed' : 'pointer', opacity: new Date(settings.lockedDate).getFullYear() === 2000 ? 0.5 : 1 }}
                    >
                        🔓 Force Unlock Books
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdminSettings;