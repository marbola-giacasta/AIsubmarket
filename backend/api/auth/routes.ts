// ─────────────────────────────────────────────────────────────
// api/auth/routes.ts — register, login, and /me endpoints.
// I never store plain passwords — bcrypt hashes them before
// saving, and compares hashes on login. Even if my DB leaked,
// the actual passwords would be unreadable.
// ─────────────────────────────────────────────────────────────

import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import supabase from '../../lib/database';
import { signToken } from '../../lib/auth';
import { requireAuth } from '../../middleware/auth';
import type { DbUser, SafeUser } from '../../types';

const router = Router();

// ── POST /api/auth/register ───────────────────────────────────
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password)  return res.status(400).json({ error: 'Email and password required' }) as unknown as void;
    if (password.length < 8)  return res.status(400).json({ error: 'Password must be at least 8 characters' }) as unknown as void;

    // Check if this email is already in use
    const { data: existing } = await supabase
      .from('users').select('id').eq('email', email).single();
    if (existing) return res.status(409).json({ error: 'Email already registered' }) as unknown as void;

    // bcrypt with cost factor 12 — high enough to be slow for attackers
    const password_hash = await bcrypt.hash(password, 12);

    const { data: user, error } = await supabase
      .from('users')
      .insert({ email, password_hash })
      .select('id, email, is_admin, created_at')
      .single<SafeUser>();

    if (error) throw error;

    const token = signToken({ id: user.id, email: user.email });
    res.status(201).json({ token, user });
  } catch (err) { next(err); }
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' }) as unknown as void;

    // I select password_hash here — I need it for bcrypt.compare below
    const { data: user } = await supabase
      .from('users')
      .select('id, email, password_hash, is_admin, created_at')
      .eq('email', email)
      .single<DbUser>();

    // I return the same error for wrong email AND wrong password —
    // this prevents attackers from knowing which one was wrong
    if (!user) return res.status(401).json({ error: 'Invalid credentials' }) as unknown as void;

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' }) as unknown as void;

    const token = signToken({ id: user.id, email: user.email });

    // Strip password_hash before sending the user object to the frontend
    const { password_hash: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) { next(err); }
});

// ── GET /api/auth/me ──────────────────────────────────────────
// Returns the current user's profile — called on page load to
// restore the session if a token is already in localStorage
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, email, is_admin, created_at')
      .eq('id', req.user.id)
      .single<SafeUser>();
    res.json({ user });
  } catch (err) { next(err); }
});

export default router;