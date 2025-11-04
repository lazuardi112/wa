import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

// This is a basic PrivateRoute. In a real app, you'd have more robust logic
// (e.g., checking token validity, user roles from context).
const PrivateRoute = ({ isAdminRoute = false }) => {
    const isAuthenticated = !!localStorage.getItem('authToken');

    // This is a placeholder for admin role check.
    // You would replace this with actual role data from your auth context.
    const userRole = 'user'; // or 'admin'

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    if (isAdminRoute && userRole !== 'admin') {
        // If it's an admin route and user is not an admin, redirect them.
        return <Navigate to="/" />;
    }

    return <Outlet />;
};

export default PrivateRoute;
