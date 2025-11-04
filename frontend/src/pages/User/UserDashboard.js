import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const UserDashboard = () => {
    return (
        <Container>
            <Box sx={{ marginTop: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    User Dashboard
                </Typography>
                <Typography variant="body1">
                    Welcome to your dashboard. Here you will be able to manage your devices, send messages, and view your subscription details.
                </Typography>
                {/* Placeholder for future components */}
            </Box>
        </Container>
    );
};

export default UserDashboard;
