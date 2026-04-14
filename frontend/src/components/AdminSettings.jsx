import React, { useState, useEffect } from 'react';
import { fetchSettings, lockPeriod, unlockPeriod } from '../services/settingsService';
import { Settings, Lock, Unlock, AlertTriangle, Calendar, CheckCircle, AlertCircle, Loader } from 'lucide-react';

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

    if (!settings) return (
        <div className="flex justify-center items-center p-8">
            <Loader className="w-6 h-6 animate-spin text-slate-400" />
            <span className="ml-2 text-slate-600">Loading Settings...</span>
        </div>
    );

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-200">
                <Settings className="w-8 h-8 text-slate-400" />
                <h1 className="text-3xl font-light tracking-tight text-slate-900 m-0">System Settings</h1>
            </div>

            {status.message && (
                <div className={`p-4 rounded-lg mb-6 flex items-center gap-3 text-sm font-medium ${
                    status.type === 'success' 
                        ? 'bg-green-50 border border-green-200 text-green-700' 
                        : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                    {status.type === 'success' ? (
                        <CheckCircle className="w-5 h-5" />
                    ) : (
                        <AlertCircle className="w-5 h-5" />
                    )}
                    {status.message}
                </div>
            )}

            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                    <Lock className="w-6 h-6 text-purple-500" />
                    <h2 className="text-xl font-medium text-slate-900 m-0">Period Locking (Close the Books)</h2>
                </div>
                <p className="text-slate-600 text-sm mb-6">
                    Locking an accounting period prevents any historical transactions (Sales, POs, Refunds) from being altered or deleted prior to the selected date. This ensures compliance after tax filing.
                </p>

                <div className="bg-slate-50 p-4 rounded-lg mb-6 border border-slate-200">
                    <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-purple-500" />
                        <div>
                            <strong className="text-slate-700">Current Locked Date: </strong> 
                            <span className="text-slate-900 font-bold text-lg ml-2">
                                {new Date(settings.lockedDate).getFullYear() === 2000 ? 'Not Locked' : new Date(settings.lockedDate).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleLock} className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-slate-700 mb-2">New Closing Date</label>
                        <input 
                            type="date" 
                            required 
                            value={newLockDate} 
                            onChange={(e) => setNewLockDate(e.target.value)}
                            className="w-full p-3 rounded-lg border border-slate-300 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                        />
                    </div>
                    <button type="submit" className="w-full sm:w-auto px-6 py-3 bg-slate-600 text-white border-none rounded-lg font-bold text-base cursor-pointer transition-all duration-200 hover:bg-slate-700 hover:shadow-lg flex items-center justify-center gap-2">
                        <Lock className="w-4 h-4" />
                        Close Books
                    </button>
                </form>
            </div>
            {/* DANGER ZONE: Emergency Unlock (SUPER ADMIN ONLY) */}
            {currentUser.role === 'Super Admin' && (
                <div className="mt-10 pt-6 border-t border-slate-200">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                        <h3 className="text-xl font-medium text-slate-900 m-0">Danger Zone: Emergency Unlock</h3>
                    </div>
                    <p className="text-slate-600 text-sm mb-6">
                        Reopening the books allows modifications to historical records. This should only be used during an official audit adjustment or under direct instruction from the lead accountant.
                    </p>
                    <button 
                        onClick={handleUnlock} 
                        disabled={new Date(settings.lockedDate).getFullYear() === 2000}
                        className={`px-6 py-3 rounded-lg font-bold text-base transition-all duration-200 flex items-center gap-2 ${
                            new Date(settings.lockedDate).getFullYear() === 2000
                                ? 'bg-slate-100 text-slate-400 border border-slate-300 cursor-not-allowed opacity-50'
                                : 'bg-slate-100 text-slate-700 border border-slate-300 cursor-pointer hover:bg-slate-200'
                        }`}
                    >
                        <Unlock className="w-4 h-4" />
                        Force Unlock Books
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdminSettings;