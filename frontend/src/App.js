import React, { useContext, useState, useEffect } from 'react';
import { BrowserRouter, Router, Routes, Route, Navigate } from 'react-router-dom';
import LicenseGate from './components/LicenseGate';
import { AuthProvider, AuthContext } from './context/AuthContext';
import api from './services/api'

// --- ALL COMPONENT IMPORTS ---
// If any of these paths are wrong, or the files don't exist, React will throw that exact error.
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminUserManager from './components/AdminUserManager';
import AdminProductManager from './components/AdminProductManager';
import AdminAuditLogs from './components/AdminAuditLogs';
import AdminMasterData from './components/AdminMasterData';
import AdminChartOfAccounts from './components/AdminChartOfAccounts';
import AdminGeneralLedger from './components/AdminGeneralLedger';
import AdminInventoryManager from './components/AdminInventoryManager';
import AdminPOS from './components/AdminPOS';
import AdminPurchasing from './components/AdminPurchasing';
import AdminReports from './components/AdminReports';
import AdminAR from './components/AdminAR';
import AdminFinancialReports from './components/AdminFinancialReports';
import AdminAnalytics from './components/AdminAnalytics';
import AdminSalesHistory from './components/AdminSalesHistory';
import AdminSettings from './components/AdminSettings';
import AdminUsers from './components/AdminUsers';

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user } = useContext(AuthContext);
    if (!user) return <Navigate to="/" replace />;
    if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
    return children;
};

// Main Routing Component
const AppContent = () => {
    const [isActivated, setIsActivated] = useState(!!localStorage.getItem('license_key'));
    useEffect(() => {
        const verifyExistingLicense = async () => {
            const key = localStorage.getItem('license_key');
            const hwid = localStorage.getItem('license_hwid');
            
            if (key && hwid) {
                try {
                    // Ping the Secret Proxy to make sure the key hasn't been suspended
                    await api.post('/licenses/verify', { licenseKey: key, hwid });
                } catch (err) {
                    // If the server rejects it, wipe the storage and lock them out
                    console.error("License invalid or expired on boot");
                    localStorage.removeItem('license_key');
                    localStorage.removeItem('license_hwid');
                    setIsActivated(false);
                }
            }
        };
        
        verifyExistingLicense();
    }, []);

    // 1. LICENSE CHECK (The Bouncer)
    if (!isActivated) {
        return <LicenseGate onValidated={() => setIsActivated(true)} />;
    }
    // 2. THE ERP APP
    return (
        <div style={{ backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'sans-serif' }}>
            <Navbar />
            <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
                <Routes>
                    <Route path="/" element={<Login />} />
                    
                    <Route path="/dashboard" element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    } />

                    <Route path="/admin" element={
                        <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                            <SuperAdminDashboard />
                        </ProtectedRoute>
                    } />
                    
                    <Route path="/admin/products" element={
                        <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                            <h1 style={{ color: '#2c3e50', marginBottom: '20px' }}>Product Catalog Management</h1>
                            <AdminProductManager />
                        </ProtectedRoute>
                    } />
                    
                    <Route path="/admin/users" element={
                        <ProtectedRoute allowedRoles={['Super Admin']}>
                            <h1 style={{ color: '#2c3e50', marginBottom: '20px' }}>Access Control (IAM)</h1>
                            <AdminUserManager />
                        </ProtectedRoute>
                    } />

                    <Route path="/admin/audit" element={
                        <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                            <AdminAuditLogs />
                        </ProtectedRoute>
                    } />

                    <Route path="/admin/master-data" element={
                        <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                            <h1 style={{ color: '#2c3e50', marginBottom: '20px' }}>System Master Data</h1>
                            <AdminMasterData />
                        </ProtectedRoute>
                    } />

                    <Route path="/admin/accounting" element={
                        <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                            <h1 style={{ color: '#2c3e50', marginBottom: '20px' }}>Financial Settings</h1>
                            <AdminChartOfAccounts />
                        </ProtectedRoute>
                    } />

                    <Route path="/admin/ledger" element={
                        <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                            <h1 style={{ color: '#2c3e50', marginBottom: '20px' }}>Financial Ledgers</h1>
                            <AdminGeneralLedger />
                        </ProtectedRoute>
                    } />

                    <Route path="/admin/inventory" element={
                        <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                            <h1 style={{ color: '#2c3e50', marginBottom: '20px' }}>Supply Chain & Inventory</h1>
                            <AdminInventoryManager />
                        </ProtectedRoute>
                    } />

                    <Route path="/admin/pos" element={
                        <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                            <AdminPOS />
                        </ProtectedRoute>
                    } />

                    <Route path="/admin/purchasing" element={
                        <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                            <h1 style={{ color: '#2c3e50', marginBottom: '20px' }}>Procurement & Suppliers</h1>
                            <AdminPurchasing />
                        </ProtectedRoute>
                    } />

                    <Route path="/admin/reports" element={
                        <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                            <AdminReports />
                        </ProtectedRoute>
                    } />

                    <Route path="/admin/ar" element={
                        <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                            <AdminAR />
                        </ProtectedRoute>
                    } />

                    <Route path="/admin/financials" element={
                        <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                            <AdminFinancialReports />
                        </ProtectedRoute>
                    } />

                    <Route path="/admin/analytics" element={
                        <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                            <AdminAnalytics />
                        </ProtectedRoute>
                    } />

                    <Route path="/admin/sales-history" element={
                        <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                            <AdminSalesHistory />
                        </ProtectedRoute>
                    } />

                    <Route path="/admin/settings" element={
                        <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                            <AdminSettings />
                        </ProtectedRoute>
                    } />
                    
                    <Route path="/admin/users" element={
                        <ProtectedRoute allowedRoles={['Super Admin']}>
                            <AdminUsers />
                        </ProtectedRoute>
                    } />

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </div>
    );
};
function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <AppContent />
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;