import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogIn, AlertCircle } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    
    const { login, user } = useContext(AuthContext);
    const navigate = useNavigate();

    // 🚨 THE FIX: Automatically redirect if already logged in (No more 'res'!)
    useEffect(() => {
        if (user) {
            if (user?.role?.level === 100) {
                navigate('/admin'); // God Mode goes to Super Admin Dashboard
            } else {
                navigate('/dashboard'); // Everyone else goes to their normal Dashboard
            }
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); // Clear previous errors
        try {
            // Catch the returned user from the context!
            const loggedInUser = await login(email, password);
            
            // Now check the permissions safely!
            if (loggedInUser?.role?.level === 100) {
                navigate('/admin'); // God Mode
            } else {
                navigate('/dashboard'); // Normal Users
            }

        } catch (error) {
            console.error("Login failed:", error);
            setError(error.response?.data?.message || 'Failed to login. Please check your credentials.');
        }
    };
    return (
        <div className="flex justify-center items-center h-screen bg-slate-50 font-inter">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full mb-4">
                        <LogIn className="w-6 h-6 text-slate-400" />
                    </div>
                    <h2 className="text-slate-900 mb-2 text-2xl font-light tracking-tight">Welcome Back</h2>
                    <p className="text-slate-600 text-sm">Enter your credentials to access the portal</p>
                </div>
                
                {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-6 text-sm text-center flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>}
                
                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label className="block mb-2 text-sm font-medium text-slate-700">Email Address</label>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            className="w-full p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200"
                            placeholder="name@company.com"
                            required 
                        />
                    </div>
                    <div className="mb-8">
                        <label className="block mb-2 text-sm font-medium text-slate-700">Password</label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            className="w-full p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200"
                            placeholder="••••••••"
                            required 
                        />
                    </div>
                    <button type="submit" className="w-full p-3 bg-slate-900 text-white border-none rounded-lg text-base cursor-pointer font-medium transition-all duration-200 hover:bg-slate-800 hover:shadow-lg flex items-center justify-center gap-2">
                        <LogIn className="w-4 h-4" />
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;