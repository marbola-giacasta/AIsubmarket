// @ts-nocheck
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout        from './components/Layout/Layout';
import LoginPage     from './components/Auth/LoginPage';
import Dashboard     from './components/Dashboard/Dashboard';
import Purchase      from './components/Purchase/Purchase';
import AdminLayout   from './components/Layout/AdminLayout';
import AdminRequests from './components/Admin/AdminRequests';
import AdminDomains  from './components/Admin/AdminDomains';
import AdminRootDomains from './components/Admin/AdminRootDomains';
import AdminUsers    from './components/Admin/AdminUsers';
import AdminHistory  from './components/Admin/AdminHistory';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh', fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'13px' }}>
      // loading<span className="cursor" />
    </div>
  );

  if (user?.is_admin) {
    return (
      <Routes>
        <Route path="/admin"              element={<AdminLayout><AdminRequests /></AdminLayout>} />
        <Route path="/admin/registered"   element={<AdminLayout><AdminDomains /></AdminLayout>} />
        <Route path="/admin/root-domains" element={<AdminLayout><AdminRootDomains /></AdminLayout>} />
        <Route path="/admin/users"        element={<AdminLayout><AdminUsers /></AdminLayout>} />
        <Route path="/admin/history"      element={<AdminLayout><AdminHistory /></AdminLayout>} />
        <Route path="*"                   element={<Navigate to="/admin" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/"          element={<Navigate to="/dashboard" replace />} />
      <Route path="/login"     element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/dashboard" element={user ? <Layout><Dashboard /></Layout> : <Navigate to="/login" replace />} />
      <Route path="/purchase"  element={user ? <Layout><Purchase /></Layout>  : <Navigate to="/login" replace />} />
      <Route path="*"          element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
