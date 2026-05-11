// ─────────────────────────────────────────────────────────────
// server.ts — the entry point for my Express backend.
// I register all routes here and set up middleware.
// When running on Vercel this file is treated as a
// serverless function — Vercel calls module.exports (the app)
// directly instead of calling app.listen().
// ─────────────────────────────────────────────────────────────

import 'dotenv/config';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';

import authRoutes      from './api/auth/routes';
import subdomainRoutes from './api/subdomains/routes';
import adminRoutes     from './api/admin/routes';

const app: Application = express();
const PORT = process.env.PORT ?? 3001;

// ── CORS ──────────────────────────────────────────────────────
// I only allow requests from my own frontend domains.
// The spread + filter removes any undefined values
// (e.g. if FRONTEND_URL is not set in .env)
// Allow all Vercel preview deployments, localhost, and the production frontend.
// The pattern matches any *.vercel.app subdomain so preview deploys also work.
const VERCEL_PATTERN = /\.vercel\.app$/;

app.use(cors({
  origin: (origin, callback) => {
    // No origin = curl / server-to-server / mobile app — always allow
    if (!origin) return callback(null, true);
    // Always allow localhost for local dev
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1'))
      return callback(null, true);
    // Allow all *.vercel.app origins (covers prod + every preview deploy)
    if (VERCEL_PATTERN.test(origin)) return callback(null, true);
    // Allow explicit FRONTEND_URL if set (e.g. custom domain)
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL)
      return callback(null, true);
    // Block anything else
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

// Parse incoming JSON request bodies
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/subdomains', subdomainRoutes);
app.use('/api/admin',      adminRoutes);

// ── Health check ──────────────────────────────────────────────
// I use this to verify the backend is live on Vercel
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// ── Global error handler ──────────────────────────────────────
// Any unhandled error in a route lands here.
// Express knows it's an error handler because it has 4 params.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message ?? 'Internal server error' });
});

// ── Listen (local dev only) ───────────────────────────────────
// On Vercel, NODE_ENV is 'production' so this block never runs.
// Vercel handles the listening itself via the serverless runtime.
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

// I export the app so Vercel's @vercel/node runtime can import it
export default app;