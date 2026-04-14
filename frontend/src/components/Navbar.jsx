import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { LayoutDashboard, Monitor, BookOpen, CreditCard, Database, Home, BarChart3, Settings, Package, ShoppingCart, Truck, FileText, Users, LogOut, ChevronDown, Briefcase, PlusCircle, ShieldAlert, CheckSquare, Building2 } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const [divisions, setDivisions] = useState([]);
    const navigate = useNavigate();

    // 🛡️ PERMISSION CHECKER ENGINE
    const hasPerm = (permName) => {
        if (user?.role?.level === 100) return true; // God mode bypass
        if (user?.role?.permissions && Array.isArray(user.role.permissions)) {
            return user.role.permissions.includes(permName);
        }
        return false;
    };

    // Check if they have ANY ERP permissions (so we don't show the dashboard to pure customers)
    const hasAnyPerm = () => {
        if (user?.role?.level === 100) return true;
        return user?.role?.permissions?.length > 0;
    };

    const isSuperAdmin = user?.role?.level === 100 || (typeof user?.role === 'string' && user.role.toLowerCase() === 'super admin');

    useEffect(() => {
        const fetchDivisions = async () => {
            if (isSuperAdmin) {
                try {
                    const res = await api.get('/divisions');
                    const fetchedDivisions = res.data.data || [];
                    setDivisions(fetchedDivisions);

                    // 👇 THE FIX: Auto-select a division if they don't have one loaded! 👇
                    if (fetchedDivisions.length > 0 && !localStorage.getItem('activeDivision')) {
                        localStorage.setItem('activeDivision', fetchedDivisions[0]._id);
                        window.location.reload(); 
                    }
                    // 👆 ============================================================== 👆
                    
                } catch (err) {
                    console.error("Failed to load divisions for Navbar");
                }
            }
        };
        fetchDivisions();
    }, [user, isSuperAdmin]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleDivisionChange = (e) => {
        localStorage.setItem('activeDivision', e.target.value);
        window.location.reload(); 
    };

    return (
        <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center relative z-50 shadow-sm">
            <div>
                <Link to={hasAnyPerm() ? "/dashboard" : "/"} className="font-light text-xl no-underline text-slate-900 flex items-center gap-3">
                    <Package className="w-5 h-5 text-slate-400" />
                    <span className="tracking-wide">Semivra ERP</span>
                </Link>
            </div>

            <div className="flex items-center gap-4">
                {/* THE DIVISION SWITCHER */}
                {isSuperAdmin ? (
                    <select 
                        value={localStorage.getItem('activeDivision') || ''} 
                        onChange={handleDivisionChange}
                        className="bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold py-1 px-3 rounded cursor-pointer outline-none hover:bg-slate-200 transition"
                    >
                        <option value="" disabled>Select Division...</option>
                        {divisions.map(div => (
                            <option key={div._id} value={div._id}>{div.divisionCode} - {div.divisionName}</option>
                        ))}
                    </select>
                ) : user && (
                    <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] uppercase tracking-wider font-bold py-1 px-3 rounded-full">
                        {user?.division?.divisionName || user?.division?.divisionCode || 'Branch User'}
                    </span>
                )}
            </div>
            
            {user && (
                <div className="flex gap-1 items-center">
                    
                    {/* ONLY Users with actual permissions see the ERP Menu */}
                    {hasAnyPerm() && (
                        <>
                            {/* 1. STANDARD WORKSPACE DASHBOARD (Everyone) */}
                            <Link to="/dashboard" className="text-slate-600 no-underline text-sm font-medium px-4 py-2 rounded-lg block hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 flex items-center gap-2">
                                <Home className="w-4 h-4" />
                                Dashboard
                            </Link>

                            {/* 👇 2. NEW: FICO OVERVIEW (Super Admins Only) 👇 */}
                            {isSuperAdmin && (
                                <Link to="/admin" className="text-slate-600 no-underline text-sm font-medium px-4 py-2 rounded-lg block hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 flex items-center gap-2">
                                    <LayoutDashboard className="w-4 h-4" />
                                    Overview
                                </Link>
                            )}

                            {/* 🔒 ONLY SUPER ADMINS SEE THESE CORE CONFIGS */}
                            {isSuperAdmin && (
                                <>
                                    <Link to="/admin/analytics" className="text-slate-600 no-underline text-sm font-medium px-4 py-2 rounded-lg block hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4" />
                                        Analytics
                                    </Link>
                                    <Link to="/admin/payroll" className="text-slate-600 no-underline text-sm font-medium px-4 py-2 rounded-lg block hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 flex items-center gap-2">
                                        <Briefcase className="w-4 h-4" />
                                        Payroll & HR
                                    </Link>
                                    <Link to="/admin/settings" className="text-slate-600 no-underline text-sm font-medium px-4 py-2 rounded-lg block hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 flex items-center gap-2">
                                        <Settings className="w-4 h-4" />
                                        Settings
                                    </Link>
                                    <Link to="/admin/master-data" className="text-slate-600 no-underline text-sm font-medium px-4 py-2 rounded-lg block hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 flex items-center gap-2">
                                        <Database className="w-4 h-4" />
                                        System Master Data
                                    </Link>
                                </>
                            )}
                            
                            {/* 🔒 MASTER DATA & INVENTORY */}
                            {hasPerm('Manage Inventory') && (
                                <div className="relative group">
                                    <button className="text-slate-600 no-underline text-sm font-medium px-4 py-2 rounded-lg block hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 cursor-pointer bg-transparent border-none flex items-center gap-2">
                                        <Package className="w-4 h-4" />
                                        Master Data
                                        <ChevronDown className="w-3 h-3" />
                                    </button>
                                    <div className="absolute opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 bg-white border border-slate-200 min-w-48 shadow-sm rounded-lg top-full left-0 py-2 mt-1">
                                        <Link to="/admin/products" className="text-slate-600 no-underline text-sm font-medium px-4 py-2 block hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2">
                                            <Package className="w-4 h-4" />
                                            Products & Catalog
                                        </Link>
                                        <Link to="/admin/inventory" className="text-slate-600 no-underline text-sm font-medium px-4 py-2 block hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2">
                                            <Package className="w-4 h-4" />
                                            Warehouses & Stock
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* 🔒 SALES */}
                            {hasPerm('Process Sales') && (
                                <div className="relative group">
                                    <button className="text-slate-600 no-underline text-sm font-medium px-4 py-2 rounded-lg block hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 cursor-pointer bg-transparent border-none flex items-center gap-2">
                                        <ShoppingCart className="w-4 h-4" />
                                        Sales
                                        <ChevronDown className="w-3 h-3" />
                                    </button>
                                    <div className="absolute opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 bg-white border border-slate-200 min-w-56 shadow-sm rounded-lg top-full left-0 py-2 mt-1">
                                        <Link to="/admin/pos" className="text-slate-600 no-underline text-sm font-medium px-4 py-2 block hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2">
                                            <ShoppingCart className="w-4 h-4" />
                                            Point of Sale (POS)
                                        </Link>
                                        
                                        <Link to="/admin/sales/new" className="text-slate-600 no-underline text-sm font-medium px-4 py-2 block hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2">
                                            <PlusCircle className="w-4 h-4" />
                                            Create Invoice (Auto Tax)
                                        </Link>

                                        <Link to="/admin/sales-history" className="text-slate-600 no-underline text-sm font-medium px-4 py-2 block hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            Sales & Refunds
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* 🔒 PURCHASING */}
                            {hasPerm('Approve POs') && (
                                <div className="relative group">
                                    <button className="text-slate-600 no-underline text-sm font-medium px-4 py-2 rounded-lg block hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 cursor-pointer bg-transparent border-none flex items-center gap-2">
                                        <Truck className="w-4 h-4" />
                                        Purchasing
                                        <ChevronDown className="w-3 h-3" />
                                    </button>
                                    <div className="absolute opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 bg-white border border-slate-200 min-w-48 shadow-sm rounded-lg top-full left-0 py-2 mt-1">
                                        <Link to="/admin/purchasing" className="text-slate-600 no-underline text-sm font-medium px-4 py-2 block hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2">
                                            <Truck className="w-4 h-4" />
                                            Suppliers & POs
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* 🔒 FINANCE & REPORTS */}
                            {(hasPerm('Manage Ledger') || hasPerm('View Reports') || hasPerm('Configure Taxes')) && (
                                <div className="relative group">
                                    <button className="text-slate-600 no-underline text-sm font-medium px-4 py-2 rounded-lg block hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 cursor-pointer bg-transparent border-none flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        Finance & Reports
                                        <ChevronDown className="w-3 h-3" />
                                    </button>
                                    <div className="absolute opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 bg-white border border-slate-200 min-w-56 shadow-sm rounded-lg top-full right-0 py-2 mt-1">
                                        
                                        {hasPerm('View Reports') && (
                                            <Link to="/admin/financials" className="text-slate-600 no-underline text-sm font-medium px-4 py-2 block hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2">
                                                <BarChart3 className="w-4 h-4" />
                                                GAAP Financial Reports
                                            </Link>
                                        )}

                                        {hasPerm('Configure Taxes') && (
                                            <Link to="/admin/taxes" className="text-slate-600 no-underline text-sm font-medium px-4 py-2 block hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2">
                                                <ShieldAlert className="w-4 h-4" />
                                                BIR Tax & Statutory
                                            </Link>
                                        )}

                                        {hasPerm('Manage Ledger') && (
                                            <>
                                                <Link to="/admin/accounting" className="text-slate-600 no-underline text-sm font-medium px-4 py-2 block hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2">
                                                    <Database className="w-4 h-4" />
                                                    Chart of Accounts
                                                </Link>
                                                <Link to="/admin/assets" className="text-slate-600 no-underline text-sm font-medium px-4 py-2 block hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2">
                                                    <Monitor className="w-4 h-4" />
                                                    Fixed Assets
                                                </Link>
                                                <Link to="/admin/ledger" className="text-slate-600 no-underline text-sm font-medium px-4 py-2 block hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2">
                                                    <BookOpen className="w-4 h-4" />
                                                    General Ledger
                                                </Link>
                                                <Link to="/admin/reconciliation" className="text-slate-600 no-underline text-sm font-medium px-4 py-2 block hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2">
                                                    <CheckSquare className="w-4 h-4" />
                                                    Bank Reconciliation
                                                </Link>
                                                <Link to="/admin/journal-entry" className="text-slate-600 no-underline text-sm font-medium px-4 py-2 block hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2">
                                                    <PlusCircle className="w-4 h-4" />
                                                    Record Journal Entry
                                                </Link>
                                                <Link to="/admin/ap" className="text-slate-600 no-underline text-sm font-medium px-4 py-2 block hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2">
                                                    <CreditCard className="w-4 h-4" />
                                                    Accounts Payable
                                                </Link>
                                                <Link to="/admin/ar" className="text-slate-600 no-underline text-sm font-medium px-4 py-2 block hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2">
                                                    <FileText className="w-4 h-4" />
                                                    Accounts Receivable (AR)
                                                </Link>
                                            </>
                                        )}

                                        {hasPerm('View Reports') && (
                                            <Link to="/admin/reports" className="text-slate-600 no-underline text-sm font-medium px-4 py-2 block hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2">
                                                <Database className="w-4 h-4" />
                                                Data Exports
                                            </Link>
                                        )}

                                        {isSuperAdmin && (
                                            <Link to="/admin/audit" className="text-slate-600 no-underline text-sm font-medium px-4 py-2 block hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2 border-t border-slate-100 mt-1 pt-3">
                                                <LogOut className="w-4 h-4" />
                                                System Audit Logs
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    
                    {/* ONLY Super Admins see the User & Division Management tools */}
                    {isSuperAdmin && (
                        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 ml-2">
                            <Link to="/admin/divisions" className="bg-indigo-600 text-white no-underline text-sm font-medium px-4 py-2 rounded-lg block hover:bg-indigo-700 transition-all duration-200 flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                Manage Divisions
                            </Link>
                            
                            <Link to="/admin/users" className="bg-slate-600 text-white no-underline text-sm font-medium px-4 py-2 rounded-lg block hover:bg-slate-700 transition-all duration-200 flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Manage Users
                            </Link>
                        </div>
                    )}

                    {/* USER CONTROLS */}
                    <div className="flex items-center gap-4 ml-4 border-l border-slate-300 pl-4">
                        <span className="text-slate-500 text-xs font-medium">
                            {user?.name} ({user?.role?.name || user?.role})
                        </span>
                        <button onClick={handleLogout} className="bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg cursor-pointer text-xs font-medium transition-all duration-200 hover:bg-slate-200 hover:border-slate-400 flex items-center gap-2">
                            <LogOut className="w-3 h-3" />
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;