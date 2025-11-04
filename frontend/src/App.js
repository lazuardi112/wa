import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RegisterPage from './pages/Auth/RegisterPage';
import VerifyOtpPage from './pages/Auth/VerifyOtpPage';
// Placeholder for HomePage/Dashboard
const HomePage = () => <div>Welcome! You are logged in.</div>;

function App() {
  return (
    <Router>
      <div>
        <h1>WhatsApp SaaS Platform</h1>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/" element={<HomePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
