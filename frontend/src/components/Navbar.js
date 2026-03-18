import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    // --- BASE STYLES ---
    const navStyle = { backgroundColor: '#2c3e50', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white', position: 'relative', zIndex: 1000 };
    const logoStyle = { fontWeight: 'bold', fontSize: '20px', textDecoration: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' };
    const menuStyle = { display: 'flex', gap: '20px', alignItems: 'center' };
    
    const linkStyle = { color: '#ecf0f1', textDecoration: 'none', fontSize: '14px', fontWeight: '500', padding: '8px 12px', borderRadius: '4px', display: 'block' };
    const dropbtnStyle = { ...linkStyle, cursor: 'pointer', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '5px' };
    
    const dropdownMenuContainer = { display: 'none', position: 'absolute', backgroundColor: '#34495e', minWidth: '200px', boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.3)', borderRadius: '4px', top: '100%', left: 0, padding: '5px 0', overflow: 'hidden' };

    // Hover logic helpers
    const showMenu = (e) => e.currentTarget.lastChild.style.display = 'block';
    const hideMenu = (e) => e.currentTarget.lastChild.style.display = 'none';

    return (
        <nav style={navStyle}>
            <div>
                <Link to="/admin" style={logoStyle}>🚀 Enterprise ERP</Link>
            </div>
            
            {user && (
                <div style={menuStyle}>
                    {/* 1. EVERYONE sees the POS (Cashiers, Admins, Super Admins) */}
                    <Link to="/admin/pos" style={linkStyle}>Point of Sale</Link>
                    
                    {/* 2. ONLY Admins and Super Admins see these business tools */}
                    {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'super admin') && (
                        <>
                            <Link to="/admin" style={linkStyle}>Dashboard</Link>
                            <Link to="/admin/analytics" style={{ ...linkStyle, color: '#f1c40f' }}>📈 Analytics</Link>
                            <Link to="/admin/settings" style={linkStyle} onMouseOver={e => e.target.style.backgroundColor = '#2c3e50'} onMouseOut={e => e.target.style.backgroundColor = 'transparent'}>⚙️ Settings</Link>
                            
                            {/* 📦 MASTER DATA & INVENTORY */}
                            <div style={{ position: 'relative' }} onMouseEnter={showMenu} onMouseLeave={hideMenu}>
                                <button style={dropbtnStyle}>📦 Master Data ▾</button>
                                <div style={dropdownMenuContainer}>
                                    <Link to="/admin/products" style={linkStyle} onMouseOver={e => e.target.style.backgroundColor = '#2c3e50'} onMouseOut={e => e.target.style.backgroundColor = 'transparent'}>Products & Catalog</Link>
                                    <Link to="/admin/inventory" style={linkStyle} onMouseOver={e => e.target.style.backgroundColor = '#2c3e50'} onMouseOut={e => e.target.style.backgroundColor = 'transparent'}>Warehouses & Stock</Link>
                                </div>
                            </div>

                            {/* 🛒 SALES */}
                            <div style={{ position: 'relative' }} onMouseEnter={showMenu} onMouseLeave={hideMenu}>
                                <button style={dropbtnStyle}>🛒 Sales ▾</button>
                                <div style={dropdownMenuContainer}>
                                    <Link to="/admin/pos" style={linkStyle} onMouseOver={e => e.target.style.backgroundColor = '#2c3e50'} onMouseOut={e => e.target.style.backgroundColor = 'transparent'}>Point of Sale (POS)</Link>
                                    <Link to="/admin/sales-history" style={linkStyle} onMouseOver={e => e.target.style.backgroundColor = '#2c3e50'} onMouseOut={e => e.target.style.backgroundColor = 'transparent'}>Sales & Refunds</Link>
                                </div>
                            </div>

                            {/* 📥 PURCHASING */}
                            <div style={{ position: 'relative' }} onMouseEnter={showMenu} onMouseLeave={hideMenu}>
                                <button style={dropbtnStyle}>📥 Purchasing ▾</button>
                                <div style={dropdownMenuContainer}>
                                    <Link to="/admin/purchasing" style={linkStyle} onMouseOver={e => e.target.style.backgroundColor = '#2c3e50'} onMouseOut={e => e.target.style.backgroundColor = 'transparent'}>Suppliers & POs</Link>
                                </div>
                            </div>

                            {/* 📊 FINANCE & REPORTS */}
                            <div style={{ position: 'relative' }} onMouseEnter={showMenu} onMouseLeave={hideMenu}>
                                <button style={dropbtnStyle}>📊 Finance & Reports ▾</button>
                                <div style={dropdownMenuContainer}>
                                    <Link to="/admin/reports" style={linkStyle} onMouseOver={e => e.target.style.backgroundColor = '#2c3e50'} onMouseOut={e => e.target.style.backgroundColor = 'transparent'}>Data Exports</Link>
                                    <Link to="/admin/audit" style={linkStyle} onMouseOver={e => e.target.style.backgroundColor = '#2c3e50'} onMouseOut={e => e.target.style.backgroundColor = 'transparent'}>System Audit Logs</Link>
                                    <Link to="/admin/ar" style={linkStyle} onMouseOver={e => e.target.style.backgroundColor = '#2c3e50'} onMouseOut={e => e.target.style.backgroundColor = 'transparent'}>Accounts Receivable (AR)</Link>
                                    <Link to="/admin/financials" style={linkStyle} onMouseOver={e => e.target.style.backgroundColor = '#2c3e50'} onMouseOut={e => e.target.style.backgroundColor = 'transparent'}>Profit & Loss (P&L)</Link>
                                </div>
                            </div>
                        </>
                    )}
                    
                    {/* 3. ONLY Super Admins see the User Management tools */}
                    {user?.role?.toLowerCase() === 'super admin' && (
                        <Link to="/admin/users" style={{ ...linkStyle, borderLeft: '2px solid #fff', paddingLeft: '15px' }}>👥 Manage Users</Link>
                    )}

                    {/* USER CONTROLS */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginLeft: '10px', borderLeft: '1px solid #7f8c8d', paddingLeft: '15px' }}>
                        <span style={{ color: '#bdc3c7', fontSize: '13px' }}>{user.name} ({user.role})</span>
                        <button onClick={handleLogout} style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', transition: 'background 0.2s' }} onMouseOver={e => e.target.style.backgroundColor = '#c0392b'} onMouseOut={e => e.target.style.backgroundColor = '#e74c3c'}>
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;