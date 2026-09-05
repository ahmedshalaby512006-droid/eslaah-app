import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { AuthPage } from './pages/AuthPage';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { TechnicianDashboard } from './pages/TechnicianDashboard';

export const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
          <Navbar />
          <main>
            <Routes>
              <Route path="/login" element={<AuthPage />} />
              <Route path="/register" element={<AuthPage />} />

              <Route element={<ProtectedRoute allowedRoles={['CUSTOMER']} />}>
                <Route path="/customer" element={<CustomerDashboard />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['TECHNICIAN', 'ENGINEER', 'ADMIN']} />}>
                <Route path="/technician" element={<TechnicianDashboard />} />
              </Route>

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
};

export default App;