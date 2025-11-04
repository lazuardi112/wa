import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Box, Typography, Button, Paper, List, ListItem, ListItemText,
    IconButton, Alert, CircularProgress, Dialog, DialogTitle,
    DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import io from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react'; // Corrected import

// Komponen Modal untuk menampilkan QR Code
const QrCodeModal = ({ open, handleClose, qrCode, instanceId }) => {
    return (
        <Dialog open={open} onClose={handleClose}>
            <DialogTitle>Scan QR Code to Connect</DialogTitle>
            <DialogContent sx={{ textAlign: 'center' }}>
                <DialogContentText>
                    Scan this code with your WhatsApp application. Instance ID: {instanceId}
                </DialogContentText>
                {qrCode ? (
                    <Box sx={{ mt: 2 }}>
                        <QRCodeSVG value={qrCode} size={256} />
                    </Box>
                ) : (
                    <CircularProgress sx={{ mt: 2 }} />
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};


const DevicesPage = () => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [socket, setSocket] = useState(null);
    const [qrCode, setQrCode] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [currentInstanceId, setCurrentInstanceId] = useState(null);

    useEffect(() => {
        const newSocket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8080');
        setSocket(newSocket);

        fetchDevices();

        newSocket.on('qr', (data) => {
            if (data.instanceId === currentInstanceId) {
                setQrCode(data.code);
            }
        });

        newSocket.on('status', (data) => {
            setDevices(prevDevices =>
                prevDevices.map(device =>
                    device.instanceId === data.instanceId ? { ...device, status: data.status } : device
                )
            );
             if (data.status === 'connected' && data.instanceId === currentInstanceId) {
                handleModalClose();
            }
        });

        return () => newSocket.close();
    }, [currentInstanceId]);

    const fetchDevices = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/v1/devices', { withCredentials: true });
            setDevices(res.data);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch devices.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddDevice = async () => {
        try {
            const res = await axios.post('/api/v1/devices/add', {}, { withCredentials: true });
            const newDevice = res.data.device;

            socket.emit('join', newDevice.instanceId);

            setCurrentInstanceId(newDevice.instanceId);
            setModalOpen(true);
            setQrCode('');

            setDevices(prev => [...prev, newDevice]);

        } catch (err) {
            setError(err.response?.data?.message || 'Could not add device.');
        }
    };

    const handleDeleteDevice = async (instanceId) => {
        if (window.confirm('Are you sure you want to delete this device?')) {
            try {
                await axios.delete(`/api/v1/devices/${instanceId}`, { withCredentials: true });
                setDevices(prev => prev.filter(d => d.instanceId !== instanceId));
            } catch (err) {
                setError(err.response?.data?.message || 'Could not delete device.');
            }
        }
    };

    const handleModalClose = () => {
        setModalOpen(false);
        setQrCode('');
        setCurrentInstanceId(null);
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Manage Devices</Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddDevice}
                sx={{ mb: 2 }}
            >
                Add Device
            </Button>

            <Paper>
                {loading ? <CircularProgress sx={{ m: 2 }} /> : (
                    <List>
                        {devices.map((device) => (
                            <ListItem
                                key={device.instanceId}
                                secondaryAction={
                                    <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteDevice(device.instanceId)}>
                                        <DeleteIcon />
                                    </IconButton>
                                }
                            >
                                <ListItemText
                                    primary={device.remark || device.instanceId}
                                    secondary={`Status: ${device.status}`}
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </Paper>

            <QrCodeModal
                open={modalOpen}
                handleClose={handleModalClose}
                qrCode={qrCode}
                instanceId={currentInstanceId}
            />
        </Box>
    );
};

export default DevicesPage;
