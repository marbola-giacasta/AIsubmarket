// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// App.tsx — top-level routing.
//
// Key decision: if the user is an admin, they go to a completely
// separate admin interface wrapped in AdminLayout.
// They never see the regular user pages at all.
//
// Regular users never see admin routes.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Regular user pages + layout
import Layout    from './components/Layout/Layout';
import LoginPage from './components/Auth/LoginPage';
import Dashboard from './components/Dashboard/Dashboard';
import Purchase  from './components/Purchase/Purchase';

// Admin pages + layout — completely separate shell
import AdminLayout   from './components/Layout/AdminLayout';
import AdminRequests from './components/Admin/AdminRequests';
import AdminDomains  from './components/Admin/AdminDomains';
import AdminUsers    from './components/Admin/AdminUsers';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh', fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'13px' }}>
      // loading<span className="cursor" />
    </div>
  );

  // Admin users get their own routing tree entirely
  if (user?.is_admin) {
    return (
      <Routes>
        <Route path="/admin"         element={<AdminLayout><AdminRequests /></AdminLayout>} />
        <Route path="/admin/domains" element={<AdminLayout><AdminDomains /></AdminLayout>} />
        <Route path="/admin/users"   element={<AdminLayout><AdminUsers /></AdminLayout>} />
        {/* Redirect everything else to admin panel */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    );
  }

  // Regular users get the normal app
  return (
    <Routes>
      <Route path="/"          element={<Navigate to="/dashboard" replace />} />
      <Route path="/login"     element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/dashboard" element={user ? <Layout><Dashboard /></Layout> : <Navigate to="/login" replace />} />
      <Route path="/purchase"  element={user ? <Layout><Purchase /></Layout>  : <Navigate to="/login" replace />} />
      {/* Block access to admin routes for regular users */}
      <Route path="/admin*"    element={<Navigate to="/dashboard" replace />} />
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
