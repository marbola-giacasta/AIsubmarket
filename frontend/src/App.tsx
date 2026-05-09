// @ts-nocheck
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout           from './components/Layout/Layout';
import LoginPage        from './components/Auth/LoginPage';
import Dashboard        from './components/Dashboard/Dashboard';
import Purchase         from './components/Purchase/Purchase';
import UserHistory      from './components/Dashboard/UserHistory';
import AdminLayout      from './components/Layout/AdminLayout';
import AdminRequests    from './components/Admin/AdminRequests';
import AdminDomains     from './components/Admin/AdminDomains';       // subdomains.js — registered user subdomains
import AdminRootDomains from './components/Admin/AdminRootDomains';   // root_domains.js — open-ai.ch etc.
import AdminUsers       from './components/Admin/AdminUsers';
import AdminHistory     from './components/Admin/AdminHistory';
import Btn from './components/UI/Btn';
import { useIsMobile } from './hooks/useIsMobile';

function AdminPageHeader({ eyebrow, title }) {
  return (
    <div>
      <p style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--gold)', marginBottom:'3px', letterSpacing:'0.5px' }}>{eyebrow}</p>
      <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(18px,3vw,28px)', letterSpacing:'2px', color:'#F8F8F8', lineHeight:1 }}>{title}</h1>
    </div>
  );
}

function UserPageHeader({ eyebrow, title, action = null }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'10px' }}>
      <div>
        <p style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--comment)', marginBottom:'3px' }}>{eyebrow}</p>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(18px,3vw,28px)', letterSpacing:'2px', lineHeight:1 }}>{title}</h1>
      </div>
      {action}
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile(640);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh', fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'13px' }}>
      // loading<span className="cursor" />
    </div>
  );

  // ── Admin ─────────────────────────────────────────────────
  if (user?.is_admin) {
    return (
      <Routes>
        <Route path="/admin" element={
          <AdminLayout pageHeader={<AdminPageHeader eyebrow="// admin > requests.js" title="SUBDOMAIN REQUESTS" />}>
            <AdminRequests />
          </AdminLayout>
        } />

        {/* subdomains.js = all registered user subdomains with DNS + subscription health */}
        <Route path="/admin/subdomains" element={
          <AdminLayout pageHeader={<AdminPageHeader eyebrow="// admin > subdomains.js" title="ALL SUBDOMAINS" />}>
            <AdminDomains />
          </AdminLayout>
        } />

        {/* root_domains.js = manage open-ai.ch, geminai.info etc. with Cloudflare zone IDs */}
        <Route path="/admin/root-domains" element={
          <AdminLayout pageHeader={<AdminPageHeader eyebrow="// admin > root_domains.js" title="ROOT DOMAINS" />}>
            <AdminRootDomains />
          </AdminLayout>
        } />

        <Route path="/admin/users" element={
          <AdminLayout pageHeader={<AdminPageHeader eyebrow="// admin > users.js" title="USERS" />}>
            <AdminUsers />
          </AdminLayout>
        } />

        <Route path="/admin/history" element={
          <AdminLayout pageHeader={<AdminPageHeader eyebrow="// admin > history.js" title="HISTORY" />}>
            <AdminHistory />
          </AdminLayout>
        } />

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    );
  }

  // ── Regular user ──────────────────────────────────────────
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/login" element={
        user ? <Navigate to="/dashboard" replace /> : <LoginPage />
      } />

      <Route path="/dashboard" element={
        user ? (
          <Layout pageHeader={
            <UserPageHeader
              eyebrow={`// submarket > dashboard > ${user.email?.split('@')[0]}`}
              title="MY DOMAINS"
              action={<Link to="/purchase"><Btn variant="blue">+ NEW DOMAIN</Btn></Link>}
            />
          }>
            <Dashboard />
          </Layout>
        ) : <Navigate to="/login" replace />
      } />

      <Route path="/purchase" element={
        user ? (
          <Layout pageHeader={
            <UserPageHeader eyebrow="// submarket > purchase.js" title="BUY A DOMAIN" />
          }>
            <Purchase />
          </Layout>
        ) : <Navigate to="/login" replace />
      } />

      <Route path="/history" element={
        user ? (
          <Layout pageHeader={
            <UserPageHeader eyebrow="// submarket > history.js" title="MY HISTORY" />
          }>
            <UserHistory />
          </Layout>
        ) : <Navigate to="/login" replace />
      } />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
