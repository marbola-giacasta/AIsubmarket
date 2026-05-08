// ─────────────────────────────────────────────────────────────
// App.tsx — top-level routing.
// I wrap everything in AuthProvider so every page can
// access the current user via useAuth().
//
// Route guards:
//   PrivateRoute — redirects to /login if not logged in
//   AdminRoute   — redirects to /dashboard if not admin
//   PublicRoute  — redirects to /dashboard if already logged in
// ─────────────────────────────────────────────────────────────

import React, { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout     from './components/Layout/Layout';
import LoginPage  from './components/Auth/LoginPage';
import Dashboard  from './components/Dashboard/Dashboard';
import Purchase   from './components/Purchase/Purchase';
import AdminPanel from './components/Admin/AdminPanel';

// Any page that needs a login redirects here if the user isn't logged in
function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh', fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'13px' }}>
      // loading<span className="cursor" />
    </div>
  );
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

// The admin panel is only accessible if user.is_admin is true in the DB
function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_admin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// Login page redirects to dashboard if the user is already logged in
function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/login" element={
            <PublicRoute><LoginPage /></PublicRoute>
          } />

          <Route path="/dashboard" element={
            <PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>
          } />

          <Route path="/purchase" element={
            <PrivateRoute><Layout><Purchase /></Layout></PrivateRoute>
          } />

          <Route path="/admin" element={
            <AdminRoute><Layout><AdminPanel /></Layout></AdminRoute>
          } />

          {/* Catch-all — anything unknown goes to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}