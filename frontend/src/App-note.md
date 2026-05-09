# In App.tsx, add to the regular user routes:

import UserHistory from './components/Dashboard/UserHistory';

# Inside the user Routes block add:
<Route path="/history" element={
  user
    ? <Layout pageHeader={
        <div>
          <p style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--comment)', marginBottom:'3px' }}>// submarket &gt; history.js</p>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(18px,3vw,28px)', letterSpacing:'2px', lineHeight:1 }}>MY HISTORY</h1>
        </div>
      }>
        <UserHistory />
      </Layout>
    : <Navigate to="/login" replace />
} />
