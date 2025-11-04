import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

// Placeholder Pages (you will create these components later)
const LoginPage = () => <div>Login Page</div>;
const RegisterPage = () => <div>Register Page</div>;
const UserDashboardPage = () => <div>User Dashboard</div>;
const AdminDashboardPage = () => <div>Admin Dashboard</div>;
const HomePage = () => <div>Welcome to WhatsApp SaaS</div>;

function App() {
  return (
    <Router>
      <div className="App">
        <h1>WhatsApp Gateway SaaS</h1>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<UserDashboardPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          {/* Add other routes for user and admin panels */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
