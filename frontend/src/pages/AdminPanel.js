import React from 'react';

const AdminPanel = () => {
    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>Super Admin & Admin Panel</h1>
            <p>Welcome to the controlling module. From here, you can manage users, override licenses, and view system logs.</p>
            <div style={{ border: '1px solid red', padding: '15px', borderRadius: '5px', backgroundColor: '#fff0f0' }}>
                <h3>Restricted Area</h3>
                <p>Ensure your RBAC logic wrappers protect this view in production.</p>
            </div>
        </div>
    );
};

export default AdminPanel;