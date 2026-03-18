import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    
    const { login, user } = useContext(AuthContext);
    const navigate = useNavigate();

    // Automatically redirect if already logged in
    useEffect(() => {
        if (user) {
            if (user.role === 'Super Admin' || user.role === 'Admin') {
                navigate('/admin');
            } else {
                navigate('/dashboard');
            }
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            // The login function from AuthContext sets the user state
            await login(email, password);
        } catch (err) {
            setError('Invalid email or password. Please try again.');
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f6f8', fontFamily: 'sans-serif' }}>
            <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '10px', color: '#2c3e50' }}>System Login</h2>
                <p style={{ textAlign: 'center', color: '#7f8c8d', marginBottom: '30px' }}>Enter your credentials to access the portal.</p>
                
                {error && <div style={{ backgroundColor: '#fdedec', color: '#c0392b', padding: '10px', borderRadius: '4px', marginBottom: '20px', fontSize: '14px', textAlign: 'center' }}>{error}</div>}
                
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#34495e' }}>Email Address</label>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                            required 
                        />
                    </div>
                    <div style={{ marginBottom: '30px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#34495e' }}>Password</label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                            required 
                        />
                    </div>
                    <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#2980b9', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>
                        Log In
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;