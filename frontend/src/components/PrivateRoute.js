import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from 'context/AuthContext';
import { CircularProgress, Box } from '@mui/material';

const PrivateRoute = ({ adminOnly = false }) => {
    const { user, isAdmin, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        // Show a loading spinner while checking auth status
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    // If not authenticated, redirect to the appropriate login page
    if (!user) {
        const redirectTo = adminOnly ? '/admin/login' : '/login';
        return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    // If route is for admin only, but user is not an admin, redirect to user dashboard
    if (adminOnly && !isAdmin) {
        return <Navigate to="/" replace />;
    }

    // If route is for users, but user is an admin, redirect to admin dashboard
    if (!adminOnly && isAdmin) {
        return <Navigate to="/admin" replace />;
    }

    return <Outlet />;
};

export default PrivateRoute;
