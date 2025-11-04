import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        whatsappNumber: '',
    });
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        try {
            const res = await axios.post('/api/v1/auth/register', formData);
            setMessage(res.data.message);
            // Navigate to OTP verification page, passing userId
            navigate(`/verify-otp?userId=${res.data.userId}`);
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed.');
        }
    };

    return (
        <div>
            <h2>Register</h2>
            <form onSubmit={handleSubmit}>
                <input type="text" name="name" placeholder="Name" onChange={handleChange} required />
                <br />
                <input type="email" name="email" placeholder="Email" onChange={handleChange} required />
                <br />
                <input type="password" name="password" placeholder="Password" onChange={handleChange} required />
                <br />
                <input type="text" name="whatsappNumber" placeholder="WhatsApp Number (e.g., 628123...)" onChange={handleChange} required />
                <br />
                <button type="submit">Register</button>
            </form>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {message && <p style={{ color: 'green' }}>{message}</p>}
        </div>
    );
};

export default RegisterPage;
