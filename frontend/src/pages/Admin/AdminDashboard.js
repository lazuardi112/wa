import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const AdminDashboard = () => {
    return (
        <Container>
            <Box sx={{ marginTop: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Admin Dashboard
                </Typography>
                <Typography variant="body1">
                    Welcome, Admin. Here you can manage users, packages, transactions, and system settings like the OTP device.
                </Typography>
                {/* Placeholder for future admin components */}
            </Box>
        </Container>
    );
};

export default AdminDashboard;
