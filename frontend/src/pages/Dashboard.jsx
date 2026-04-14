import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import SalesDashboard from '../components/Dashboards/SalesDashboard'; // Adjust path as needed
import { LayoutDashboard, Clock, Bell, ArrowRight, Shield, Building, ChevronRight } from 'lucide-react';

const Dashboard = () => {
    const { user } = useContext(AuthContext);

    // Helper to extract the proper names from the user object
    const roleName = user?.role?.name || (typeof user?.role === 'string' ? user?.role : 'Standard User');
    const divisionName = user?.division?.divisionName || user?.division?.divisionCode || 'Global Access';

    return (
        <div className="space-y-6 font-inter animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* 1. HEADER SECTION */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 flex items-center gap-3">
                        <LayoutDashboard className="w-8 h-8 text-indigo-600 hidden sm:block" />
                        Welcome back, {user?.name?.split(' ')[0] || 'User'}
                    </h1>
                    <SalesDashboard />
                    <p className="text-sm text-slate-500 mt-2 max-w-xl">
                        Here is an overview of your active workspace. Use the navigation menu above to access your assigned modules.
                    </p>
                </div>
                
                {/* User Badges */}
                <div className="flex flex-wrap gap-3">
                    <div className="bg-indigo-50 px-4 py-2.5 rounded-xl border border-indigo-100 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-semibold text-indigo-900">{roleName}</span>
                    </div>
                    <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
                        <Building className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-semibold text-slate-700">{divisionName}</span>
                    </div>
                </div>
            </div>

            {/* 2. MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT COLUMN (Wider) */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Quick Links */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {['My Profile Settings', 'Company Directory', 'Help & Documentation'].map((action, idx) => (
                                <button key={idx} className="flex flex-col items-center text-center p-5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group cursor-pointer bg-white">
                                    <div className="w-12 h-12 rounded-full bg-slate-50 group-hover:bg-indigo-100 flex items-center justify-center mb-3 transition-colors border border-slate-100 group-hover:border-indigo-200">
                                        <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                    </div>
                                    <span className="text-sm font-semibold text-slate-600 group-hover:text-indigo-900">{action}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Announcements Board */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Bell className="w-5 h-5 text-indigo-500" />
                                System Announcements
                            </h2>
                            <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center">
                                View All <ChevronRight className="w-3 h-3 ml-1" />
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100 cursor-default">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900">ERP System Update v2.0</h4>
                                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">The new multi-tenant database silos have been successfully deployed. Your data is now fully isolated to your assigned branch.</p>
                                    <span className="text-xs font-semibold text-slate-400 mt-2 block">System Admin • Just now</span>
                                </div>
                            </div>
                            
                            <div className="flex gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100 cursor-default">
                                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0"></div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900">Welcome to Semivra ERP</h4>
                                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">If you are missing access to specific modules in the top navigation bar, please contact your Super Admin to request additional permissions.</p>
                                    <span className="text-xs font-semibold text-slate-400 mt-2 block">IT Department • 2 days ago</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN (Sidebar stats) */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Session Info</h2>
                        <div className="space-y-3">
                            
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200">
                                        <Clock className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <span className="text-sm font-semibold text-slate-700">Local Time</span>
                                </div>
                                <span className="text-sm font-bold text-slate-900">
                                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg shadow-sm border border-emerald-100">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                                    </div>
                                    <span className="text-sm font-semibold text-emerald-900">Server Status</span>
                                </div>
                                <span className="text-xs font-black uppercase tracking-wider text-emerald-600 bg-emerald-100 px-2 py-1 rounded">Online</span>
                            </div>

                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;