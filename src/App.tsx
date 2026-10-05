import { Toaster } from "react-hot-toast";
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProfilePage } from './pages/ProfilePage';
import { HistoryDashboard } from './pages/HistoryDashboard';
import { AuthPage } from './pages/AuthPage';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { TechnicianDashboard } from './pages/TechnicianDashboard';

export const App: React.FC = () => {
  return (
    <Router>
      <LanguageProvider>
        <AuthProvider>
          <div className="min-h-screen bg-slate-50 font-sans text-slate-900 transition-colors">
            <Toaster position="top-center" />
            <Navbar />
            <main>
              <Routes>
                <Route path="/login" element={<AuthPage />} />
                <Route path="/register" element={<AuthPage />} />

                <Route element={<ProtectedRoute allowedRoles={['CUSTOMER']} />}>
                  <Route path="/customer" element={<CustomerDashboard />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['TECHNICIAN', 'ENGINEER']} />}>
                  <Route path="/technician" element={<TechnicianDashboard />} />
                </Route>
                
                <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['CUSTOMER', 'TECHNICIAN', 'ENGINEER', 'ADMIN']} />}>
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/history" element={<HistoryDashboard />} />
                </Route>

                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </main>
          </div>
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
};

export default App;