import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link as RouterLink } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';

// Import Pages
import LoginPage from 'pages/Auth/LoginPage';
import RegisterPage from 'pages/Auth/RegisterPage';
import VerifyOtpPage from 'pages/Auth/VerifyOtpPage';
import UserDashboard from 'pages/User/UserDashboard';
import AdminDashboard from 'pages/Admin/AdminDashboard';

// Import Components
import PrivateRoute from 'components/PrivateRoute';

// A simple dark theme for a modern look
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
  // A simple check for auth status. In a real app, this would be in a context.
  const isAuthenticated = !!localStorage.getItem('authToken');

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    // This will force a re-render and redirect to login
    window.location.href = '/login';
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Router>
        <Box sx={{ flexGrow: 1 }}>
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                <RouterLink to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                  WhatsApp SaaS
                </RouterLink>
              </Typography>
              {isAuthenticated ? (
                <Button color="inherit" onClick={handleLogout}>Logout</Button>
              ) : (
                <>
                  <Button color="inherit" component={RouterLink} to="/login">Login</Button>
                  <Button color="inherit" component={RouterLink} to="/register">Register</Button>
                </>
              )}
            </Toolbar>
          </AppBar>
        </Box>

        <main>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-otp" element={<VerifyOtpPage />} />

            {/* Protected User Routes */}
            <Route path="/" element={<PrivateRoute />}>
              <Route index element={<UserDashboard />} />
            </Route>

            {/* Protected Admin Routes */}
            <Route path="/admin" element={<PrivateRoute isAdminRoute={true} />}>
                <Route index element={<AdminDashboard />} />
            </Route>

          </Routes>
        </main>
      </Router>
    </ThemeProvider>
  );
}

export default App;
