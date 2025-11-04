import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';

const VerifyOtpPage = () => {
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const userId = searchParams.get('userId');

    useEffect(() => {
        if (!userId) {
            navigate('/register');
        }
    }, [userId, navigate]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        try {
            const res = await axios.post('/api/v1/auth/verify-otp', { userId, otp });
            setMessage(res.data.message);
            // On success, you would typically save the token and user info
            // For now, just navigate to home
            setTimeout(() => {
                navigate('/');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'OTP Verification failed.');
        }
    };

    return (
        <div>
            <h2>Verify OTP</h2>
            <p>Enter the OTP sent to your WhatsApp number.</p>
            <form onSubmit={handleSubmit}>
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" required />
                <br />
                <button type="submit">Verify</button>
            </form>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {message && <p style={{ color: 'green' }}>{message}</p>}
        </div>
    );
};

export default VerifyOtpPage;
