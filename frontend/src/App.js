import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Layout
import DashboardLayout from 'components/DashboardLayout';

// Auth Pages
import LoginPage from 'pages/Auth/LoginPage';
import RegisterPage from 'pages/Auth/RegisterPage';
import VerifyOtpPage from 'pages/Auth/VerifyOtpPage';
import AdminLoginPage from 'pages/Auth/AdminLoginPage';

// User Pages
import UserDashboard from 'pages/User/UserDashboard';
import DevicesPage from 'pages/User/DevicesPage';
import MessagingPage from 'pages/User/MessagingPage';

// Admin Pages
import AdminDashboard from 'pages/Admin/AdminDashboard';
import SettingsPage from 'pages/Admin/SettingsPage';

// Components
import PrivateRoute from 'components/PrivateRoute';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Public Auth Routes have a clean layout */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Protected User Routes are wrapped in the DashboardLayout */}
          <Route element={<PrivateRoute adminOnly={false} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<UserDashboard />} />
              <Route path="/devices" element={<DevicesPage />} />
              <Route path="/messaging" element={<MessagingPage />} />
            </Route>
          </Route>

          {/* Protected Admin Routes are also wrapped in the DashboardLayout */}
          <Route element={<PrivateRoute adminOnly={true} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/settings" element={<SettingsPage />} />
            </Route>
          </Route>

        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
