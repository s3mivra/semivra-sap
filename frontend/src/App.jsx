import React, { useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import api from './services/api';

// --- CONTEXT & GATES ---
import { AuthProvider, AuthContext } from './context/AuthContext';
import LicenseGate from './components/LicenseGate';
import Navbar from './components/Navbar';

// --- PAGE IMPORTS ---
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';

// IAM & Settings
import AdminUserManager from './components/AdminUserManager';
import AdminDivisions from './pages/AdminDivisions';
import AdminAuditLogs from './components/AdminAuditLogs';
import AdminSettings from './components/AdminSettings';

// Master Data & Inventory
import AdminMasterData from './components/AdminMasterData';
import AdminProductManager from './components/AdminProductManager';
import AdminInventoryManager from './components/AdminInventoryManager';

// Sales & Purchasing
import AdminPOS from './components/AdminPOS';
import CreateInvoice from './components/CreateInvoice';
import AdminSalesHistory from './components/AdminSalesHistory';
import AdminPurchasing from './components/AdminPurchasing';

// Finance & Accounting
import AdminChartOfAccounts from './components/AdminChartOfAccounts';
import AdminGeneralLedger from './components/AdminGeneralLedger';
import JournalEntryForm from './components/JournalEntryForm';
import AdminFixedAssets from './components/AdminFixedAssets';
import AdminBankReconciliation from './pages/AdminBankReconciliation';
import AdminAP from './components/AdminAP';
import AdminAR from './components/AdminAR';
import AdminTaxManagement from './pages/AdminTaxManagement';

// Analytics & Reports
import AdminFinancialReports from './components/AdminFinancialReports';
import AdminReports from './components/AdminReports';
import AdminAnalytics from './components/AdminAnalytics';
import AdminPayroll from './pages/AdminPayroll'; // Optional/Pending module


// ==========================================
// 🛡️ THE ENTERPRISE BOUNCER (Protected Route)
// ==========================================
const ProtectedRoute = ({ children, requiredPerm, requireSuperAdmin }) => {
    const { user, loading } = useContext(AuthContext);

    if (loading) return null; 
    if (!user) return <Navigate to="/" />;

    const isSuperAdmin = user?.role?.level === 100;

    // 1. Strict Super Admin Check
    if (requireSuperAdmin && !isSuperAdmin) {
        // 👇 FIX: Send to normal dashboard, not admin!
        return <Navigate to="/dashboard" />; 
    }

    // 2. Strict Permission Check
    if (requiredPerm && !isSuperAdmin) {
        const hasPermission = user?.role?.permissions?.includes(requiredPerm);
        if (!hasPermission) {
            console.warn(`Access Denied: User lacks [${requiredPerm}] permission.`);
            // 👇 FIX: Send unauthorized users to normal dashboard!
            return <Navigate to="/dashboard" />; 
        }
    }

    return children;
};

// ==========================================
// 🚀 MAIN ROUTING COMPONENT
// ==========================================
const AppContent = () => {
    const [isActivated, setIsActivated] = useState(!!localStorage.getItem('license_key'));
    
    // 🔑 SECURE BOOT: Verify Hardware & License Key
    useEffect(() => {
        const verifyExistingLicense = async () => {
            const key = localStorage.getItem('license_key');
            const hwid = localStorage.getItem('license_hwid');
            
            if (key && hwid) {
                try {
                    await api.post('/licenses/verify', { licenseKey: key, hwid });
                } catch (err) {
                    console.error("License validation failed on boot.");
                    localStorage.removeItem('license_key');
                    localStorage.removeItem('license_hwid');
                    setIsActivated(false);
                }
            }
        };
        verifyExistingLicense();
    }, []);

    // 🛑 LICENSE GATE: Block access to the entire app if unverified
    if (!isActivated) {
        return <LicenseGate onValidated={() => setIsActivated(true)} />;
    }

    return (
        <div className="bg-slate-50 min-h-screen font-inter overflow-x-hidden">
            <Navbar />
            
            <div className="p-4 sm:p-6 max-w-7xl mx-auto">
                <Routes>
                    {/* PUBLIC ROUTES */}
                    <Route path="/" element={<Login />} />
                    
                    {/* STANDARD DASHBOARD */}
                    <Route path="/dashboard" element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    } />

                    {/* 👑 SUPER ADMIN ONLY ROUTES */}
                    <Route path="/admin" element={<ProtectedRoute><SuperAdminDashboard /></ProtectedRoute>} />
                    <Route path="/admin/users" element={<ProtectedRoute requireSuperAdmin={true}><AdminUserManager /></ProtectedRoute>} />
                    <Route path="/admin/divisions" element={<ProtectedRoute requireSuperAdmin={true}><AdminDivisions /></ProtectedRoute>} />
                    <Route path="/admin/audit" element={<ProtectedRoute requireSuperAdmin={true}><AdminAuditLogs /></ProtectedRoute>} />
                    <Route path="/admin/settings" element={<ProtectedRoute requireSuperAdmin={true}><AdminSettings /></ProtectedRoute>} />
                    <Route path="/admin/analytics" element={<ProtectedRoute requireSuperAdmin={true}><AdminAnalytics /></ProtectedRoute>} />
                    <Route path="/admin/master-data" element={<ProtectedRoute requireSuperAdmin={true}><AdminMasterData /></ProtectedRoute>} />
                    <Route path="/admin/payroll" element={<ProtectedRoute requireSuperAdmin={true}><AdminPayroll /></ProtectedRoute>} />

                    {/* 📦 INVENTORY MODULE */}
                    <Route path="/admin/products" element={<ProtectedRoute requiredPerm="Manage Inventory"><AdminProductManager /></ProtectedRoute>} />
                    <Route path="/admin/inventory" element={<ProtectedRoute requiredPerm="Manage Inventory"><AdminInventoryManager /></ProtectedRoute>} />

                    {/* 🛒 SALES MODULE */}
                    <Route path="/admin/pos" element={<ProtectedRoute requiredPerm="Process Sales"><AdminPOS /></ProtectedRoute>} />
                    <Route path="/admin/sales/new" element={<ProtectedRoute requiredPerm="Process Sales"><CreateInvoice /></ProtectedRoute>} />
                    <Route path="/admin/sales-history" element={<ProtectedRoute requiredPerm="Process Sales"><AdminSalesHistory /></ProtectedRoute>} />

                    {/* 🚚 PURCHASING MODULE */}
                    <Route path="/admin/purchasing" element={<ProtectedRoute requiredPerm="Approve POs"><AdminPurchasing /></ProtectedRoute>} />

                    {/* 💰 ACCOUNTING & FINANCE MODULE */}
                    <Route path="/admin/accounting" element={<ProtectedRoute requiredPerm="Manage Ledger"><AdminChartOfAccounts /></ProtectedRoute>} />
                    <Route path="/admin/ledger" element={<ProtectedRoute requiredPerm="Manage Ledger"><AdminGeneralLedger /></ProtectedRoute>} />
                    <Route path="/admin/journal-entry" element={<ProtectedRoute requiredPerm="Manage Ledger"><JournalEntryForm /></ProtectedRoute>} />
                    <Route path="/admin/assets" element={<ProtectedRoute requiredPerm="Manage Ledger"><AdminFixedAssets /></ProtectedRoute>} />
                    <Route path="/admin/reconciliation" element={<ProtectedRoute requiredPerm="Manage Ledger"><AdminBankReconciliation /></ProtectedRoute>} />
                    <Route path="/admin/ap" element={<ProtectedRoute requiredPerm="Manage Ledger"><AdminAP /></ProtectedRoute>} />
                    <Route path="/admin/ar" element={<ProtectedRoute requiredPerm="Manage Ledger"><AdminAR /></ProtectedRoute>} />

                    {/* 🏛️ TAX COMPLIANCE */}
                    <Route path="/admin/taxes" element={<ProtectedRoute requiredPerm="Configure Taxes"><AdminTaxManagement /></ProtectedRoute>} />

                    {/* 📊 REPORTING MODULE */}
                    <Route path="/admin/financials" element={<ProtectedRoute requiredPerm="View Reports"><AdminFinancialReports /></ProtectedRoute>} />
                    <Route path="/admin/reports" element={<ProtectedRoute requiredPerm="View Reports"><AdminReports /></ProtectedRoute>} />

                    {/* CATCH-ALL */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </div>
    );
};

// ==========================================
// 🌍 ROOT COMPONENT
// ==========================================
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