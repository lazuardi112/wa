import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link as RouterLink } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { useAuth } from 'context/AuthContext';

// Import Pages
import LoginPage from 'pages/Auth/LoginPage';
import RegisterPage from 'pages/Auth/RegisterPage';
import VerifyOtpPage from 'pages/Auth/VerifyOtpPage';
import AdminLoginPage from 'pages/Auth/AdminLoginPage';
import UserDashboard from 'pages/User/UserDashboard';
import AdminDashboard from 'pages/Admin/AdminDashboard';

// Import Components
import PrivateRoute from 'components/PrivateRoute';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
  const { user, isAdmin, logout } = useAuth();

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Router>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              <RouterLink to={isAdmin ? "/admin" : "/"} style={{ textDecoration: 'none', color: 'inherit' }}>
                WhatsApp SaaS
              </RouterLink>
            </Typography>
            {user ? (
              <Button color="inherit" onClick={logout}>Logout</Button>
            ) : (
              <Box>
                <Button color="inherit" component={RouterLink} to="/login">Login</Button>
                <Button color="inherit" component={RouterLink} to="/register">Register</Button>
              </Box>
            )}
          </Toolbar>
        </AppBar>

        <main>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-otp" element={<VerifyOtpPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* Protected User Routes */}
            <Route element={<PrivateRoute adminOnly={false} />}>
              <Route path="/" element={<UserDashboard />} />
              {/* Add other user routes here inside this Outlet */}
            </Route>

            {/* Protected Admin Routes */}
            <Route element={<PrivateRoute adminOnly={true} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              {/* Add other admin routes here inside this Outlet */}
            </Route>

          </Routes>
        </main>
      </Router>
    </ThemeProvider>
  );
}

export default App;
