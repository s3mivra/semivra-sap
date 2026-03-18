import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import ProductCatalog from '../components/ProductCatalog';
import LicenseManager from '../components/LicenseManager';

const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
                <h1>User Dashboard</h1>
                {user ? (
                    <div>
                        <span style={{ marginRight: '15px' }}>Welcome, {user.name} ({user.role})</span>
                        <button onClick={logout} style={{ padding: '5px 10px' }}>Logout</button>
                    </div>
                ) : (
                    <span>Please log in via the API to see user details.</span>
                )}
            </header>
            
            <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
                <div style={{ flex: 2, minWidth: '300px' }}>
                    <ProductCatalog />
                </div>
                <div style={{ flex: 1, minWidth: '300px' }}>
                    <LicenseManager />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;