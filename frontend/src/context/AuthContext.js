import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                // Check admin status first
                const adminRes = await axios.get('/api/v1/admin/status', { withCredentials: true });
                if (adminRes.data.isAuthenticated) {
                    setUser(adminRes.data.user);
                    setIsAdmin(true);
                } else {
                    // If not admin, check user status
                    const userRes = await axios.get('/api/v1/auth/status', { withCredentials: true });
                    if (userRes.data.isAuthenticated) {
                        setUser(userRes.data.user);
                        setIsAdmin(false);
                    }
                }
            } catch (error) {
                console.error('Error checking auth status:', error);
                setUser(null);
                setIsAdmin(false);
            } finally {
                setLoading(false);
            }
        };

        checkAuthStatus();
    }, []);

    const login = (userData) => {
        setUser(userData);
        setIsAdmin(userData.role === 'admin');
    };

    const logout = async () => {
        const logoutUrl = isAdmin ? '/api/v1/admin/logout' : '/api/v1/auth/logout';
        try {
            await axios.post(logoutUrl, {}, { withCredentials: true });
            setUser(null);
            setIsAdmin(false);
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isAdmin, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
