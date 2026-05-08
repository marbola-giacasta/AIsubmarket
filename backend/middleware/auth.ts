// ─────────────────────────────────────────────────────────────
// middleware/auth.ts — JWT guard middleware.
// I put this on any route that requires a logged-in user.
// It reads the token from the Authorization header,
// verifies it, and attaches the decoded payload to req.user.
// If the token is missing or invalid, it stops the request here
// and returns a 401 so the route handler never runs.
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/auth';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  // The header must be in the format: "Bearer <token>"
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  // Slice off "Bearer " to get just the token string
  const token = header.slice(7);

  try {
    // If this succeeds, req.user is now populated for downstream handlers
    req.user = verifyToken(token);
    next();
  } catch {
    // jwt.verify throws if the token is expired, tampered, or wrong secret
    res.status(401).json({ error: 'Token invalid or expired' });
  }
}