import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Box, Typography, Button, Paper, Alert, CircularProgress,
    Dialog, DialogTitle, DialogContent
} from '@mui/material';
import io from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react'; // Corrected import

const SettingsPage = () => {
    const [status, setStatus] = useState('loading');
    const [qrCode, setQrCode] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const socket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8080');
        socket.emit('join', 'admin_room');

        const checkStatus = async () => {
            try {
                const res = await axios.get('/api/v1/admin/settings/otp-device-status', { withCredentials: true });
                setStatus(res.data.status);
            } catch (err) {
                setError('Failed to fetch OTP device status.');
                setStatus('error');
            }
        };

        checkStatus();

        socket.on('otp_device_qr', (data) => {
            setQrCode(data.code);
            setModalOpen(true);
        });

        socket.on('otp_device_status', (data) => {
            setStatus(data.status);
            if (data.status === 'connected') {
                setModalOpen(false);
            }
        });

        return () => socket.close();
    }, []);

    const handleSetup = async () => {
        setError('');
        setQrCode(''); // Clear old QR code
        try {
            await axios.post('/api/v1/admin/settings/otp-device', {}, { withCredentials: true });
            setModalOpen(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to start setup.');
        }
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Admin Settings</Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper sx={{ p: 2 }}>
                <Typography variant="h6">OTP Sending Device</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                    Status: <strong>{status}</strong>
                </Typography>
                <Button
                    variant="contained"
                    onClick={handleSetup}
                >
                    {status === 'connected' ? 'Reconnect Device' : 'Setup Device'}
                </Button>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Click to connect a WhatsApp device that will be used to send OTPs to new users.
                </Typography>
            </Paper>

            <Dialog open={modalOpen} onClose={() => setModalOpen(false)}>
                <DialogTitle>Scan QR Code to Connect OTP Device</DialogTitle>
                <DialogContent sx={{ textAlign: 'center' }}>
                    {qrCode ? (
                        <QRCodeSVG value={qrCode} size={256} />
                    ) : (
                        <CircularProgress sx={{ my: 4 }} />
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default SettingsPage;
