require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const authRoutes      = require('./api/auth/routes');
const subdomainRoutes = require('./api/subdomains/routes');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── CORS ──────────────────────────────────────────────────
// Accepts both localhost (dev) and your Vercel frontend URL (prod)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json());

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/subdomains', subdomainRoutes);

// ── Health check ──────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── Error handler ─────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Only listen when running locally — Vercel handles this in serverless mode
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

module.exports = app;
