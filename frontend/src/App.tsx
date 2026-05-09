// @ts-nocheck
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout        from './components/Layout/Layout';
import LoginPage     from './components/Auth/LoginPage';
import Dashboard, { DashboardHeader } from './components/Dashboard/Dashboard';
import Purchase      from './components/Purchase/Purchase';
import AdminLayout   from './components/Layout/AdminLayout';
import AdminRequests from './components/Admin/AdminRequests';
import AdminDomains  from './components/Admin/AdminDomains';      // subdomains.js
import AdminRootDomains from './components/Admin/AdminRootDomains'; // root_domains.js
import AdminUsers    from './components/Admin/AdminUsers';
import AdminHistory  from './components/Admin/AdminHistory';
import Btn from './components/UI/Btn';
import { useIsMobile } from './hooks/useIsMobile';

// Reusable sticky page header for admin sections
function AdminPageHeader({ eyebrow, title, action = null }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'10px' }}>
      <div>
        <p style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--gold)', marginBottom:'3px', letterSpacing:'0.5px' }}>{eyebrow}</p>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(18px,3vw,28px)', letterSpacing:'2px', color:'#F8F8F8', lineHeight:1 }}>{title}</h1>
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

  if (user?.is_admin) {
    return (
      <Routes>
        <Route path="/admin" element={
          <AdminLayout pageHeader={<AdminPageHeader eyebrow="// admin > requests.js" title="SUBDOMAIN REQUESTS" />}>
            <AdminRequests />
          </AdminLayout>
        } />
        <Route path="/admin/subdomains" element={
          <AdminLayout pageHeader={<AdminPageHeader eyebrow="// admin > subdomains.js" title="ALL SUBDOMAINS" />}>
            <AdminDomains />
          </AdminLayout>
        } />
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

  return (
    <Routes>
      <Route path="/"      element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/dashboard" element={
        user
          ? <DashboardWrapper isMobile={isMobile} />
          : <Navigate to="/login" replace />
      } />
      <Route path="/purchase" element={
        user
          ? <PurchaseWrapper isMobile={isMobile} />
          : <Navigate to="/login" replace />
      } />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

// Wrapper components so we can pass the pageHeader with live data
function DashboardWrapper({ isMobile }) {
  const { user } = useAuth();
  // We pass a static header here — Dashboard itself exports DashboardHeader
  // which is rendered via Layout's pageHeader slot
  const [subdomainCount, setSubdomainCount] = React.useState(0);

  return (
    <Layout pageHeader={
      <DashboardHeader subdomainCount={subdomainCount} userEmail={user?.email} isMobile={isMobile} />
    }>
      <Dashboard onSubdomainCountChange={setSubdomainCount} />
    </Layout>
  );
}

function PurchaseWrapper({ isMobile }) {
  return (
    <Layout pageHeader={
      <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
        <div>
          <p style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--comment)', marginBottom:'3px' }}>// submarket &gt; purchase.js</p>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize: isMobile ? '20px' : '28px', letterSpacing:'2px', lineHeight:1 }}>BUY A DOMAIN</h1>
        </div>
      </div>
    }>
      <Purchase hideTitle />
    </Layout>
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
