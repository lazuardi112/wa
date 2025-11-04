import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';

const VerifyOtpPage = () => {
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const userId = searchParams.get('userId');

    useEffect(() => {
        if (!userId) {
            // If there's no userId in the URL, redirect to register
            navigate('/register');
        }
    }, [userId, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);
        try {
            const res = await axios.post('/api/v1/auth/verify-otp', { userId, otp });
            setLoading(false);
            setMessage(res.data.message + ' Redirecting to login...');
            localStorage.setItem('authToken', res.data.token);
            setTimeout(() => {
                navigate('/'); // Navigate to dashboard
            }, 2000);
        } catch (err) {
            setLoading(false);
            setError(err.response?.data?.message || 'OTP Verification failed.');
        }
    };

    return (
        <Container component="main" maxWidth="xs">
            <Paper elevation={3} sx={{ marginTop: 8, padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography component="h1" variant="h5">
                    Verify Your Account
                </Typography>
                <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
                    An OTP has been sent to your WhatsApp number. Please enter it below.
                </Typography>
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
                    {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
                    {message && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>{message}</Alert>}
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="otp"
                        label="Enter OTP"
                        name="otp"
                        autoFocus
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Verify Account'}
                    </Button>
                     <Typography variant="body2" align="center">
                        Didn't receive a code?{' '}
                        <RouterLink to="/register" style={{ textDecoration: 'none' }}>
                            Register Again
                        </RouterLink>
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
};

export default VerifyOtpPage;
