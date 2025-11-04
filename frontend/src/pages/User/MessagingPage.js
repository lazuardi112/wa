import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Box, Typography, Paper, TextField, Button, Select, MenuItem,
    FormControl, InputLabel, CircularProgress, Alert, Tabs, Tab
} from '@mui/material';

const MessagingPage = () => {
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState('');
    const [message, setMessage] = useState('');
    const [recipient, setRecipient] = useState('');
    const [broadcastRecipients, setBroadcastRecipients] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [tabValue, setTabValue] = useState(0);

    useEffect(() => {
        // Fetch user's connected devices
        const fetchDevices = async () => {
            try {
                const res = await axios.get('/api/v1/devices', { withCredentials: true });
                const connectedDevices = res.data.filter(d => d.status === 'connected');
                setDevices(connectedDevices);
                if (connectedDevices.length > 0) {
                    setSelectedDevice(connectedDevices[0].instanceId);
                }
            } catch (err) {
                setError('Failed to fetch devices.');
            }
        };
        fetchDevices();
    }, []);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        const isBroadcast = tabValue === 1;
        const url = isBroadcast ? '/api/v1/message/broadcast' : '/api/v1/message/send';

        const recipients = isBroadcast
            ? broadcastRecipients.split(',').map(num => num.trim()).filter(Boolean)
            : [recipient];

        if (recipients.length === 0) {
            setError('Please provide at least one recipient.');
            setLoading(false);
            return;
        }

        try {
            const res = await axios.post(url,
            {
                instanceId: selectedDevice,
                to: isBroadcast ? recipients : recipients[0],
                type: 'text', // For simplicity, only text is implemented here
                message: { text: message }
            },
            {
                // We need to send the API Key for this endpoint
                // In a real app, you'd get this from a secure place (e.g., user context after login)
                // For now, this assumes the user model on the backend has the apiKey
                // Note: This part needs the backend to be adjusted to session auth or provide API key to frontend
                // For now, we'll proceed assuming the middleware will be adapted.
                withCredentials: true
            });

            setSuccess(res.data.message);
            setMessage('');
            setRecipient('');
            setBroadcastRecipients('');

        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send message.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Send Message</Typography>

            <Paper sx={{ p: 2 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel id="device-select-label">Select Device</InputLabel>
                    <Select
                        labelId="device-select-label"
                        value={selectedDevice}
                        label="Select Device"
                        onChange={(e) => setSelectedDevice(e.target.value)}
                        disabled={devices.length === 0}
                    >
                        {devices.map(device => (
                            <MenuItem key={device.instanceId} value={device.instanceId}>
                                {device.remark} ({device.instanceId})
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Tabs value={tabValue} onChange={handleTabChange} centered>
                    <Tab label="Single Message" />
                    <Tab label="Broadcast" />
                </Tabs>

                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                    {tabValue === 0 && ( // Single Message Tab
                        <TextField
                            label="Recipient Number"
                            fullWidth
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            required
                            sx={{ mb: 2 }}
                        />
                    )}
                    {tabValue === 1 && ( // Broadcast Tab
                        <TextField
                            label="Recipient Numbers (comma separated)"
                            fullWidth
                            multiline
                            rows={3}
                            value={broadcastRecipients}
                            onChange={(e) => setBroadcastRecipients(e.target.value)}
                            required
                            sx={{ mb: 2 }}
                        />
                    )}

                    <TextField
                        label="Your Message"
                        fullWidth
                        multiline
                        rows={4}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                        sx={{ mb: 2 }}
                    />

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                    <Button
                        type="submit"
                        variant="contained"
                        disabled={loading || !selectedDevice}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Send Message'}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
};

export default MessagingPage;
