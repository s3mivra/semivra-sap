import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // FIX 1: Initialize state directly from Local Storage so refreshes don't wipe the user!
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    // Cross-tab synchronization
    useEffect(() => {
        const syncLogout = (event) => {
            // If another tab clears the token from localStorage, log this tab out instantly
            if (event.key === 'token' && event.newValue === null) {
                setUser(null);
                localStorage.removeItem('user'); // Also clear the user data
                window.location.href = '/'; 
            }
        };

        window.addEventListener('storage', syncLogout);
        return () => window.removeEventListener('storage', syncLogout);
    }, []);

    const login = async (email, password) => {
        try {
            const { data } = await api.post('/auth/login', { email, password });
            
            localStorage.setItem('token', data.token);
            
            // FIX 2: Save the user object (and their Role!) to Local Storage
            localStorage.setItem('user', JSON.stringify(data.user)); 
            
            setUser(data.user);

            // 👇 THE MISSING PIECE: Return the user so Login.jsx knows who just logged in! 👇
            return data.user; 
            
        } catch (error) {
            console.error("Login failed:", error.response?.data?.message || error.message);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout'); 
        } catch (err) {
            console.error("Backend logout failed, proceeding with local logout");
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user'); 
            
            // 👇 THE FIX: Destroy the Super Admin's division memory on logout!
            localStorage.removeItem('activeDivision'); 
            
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};