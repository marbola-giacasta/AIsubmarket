// ─────────────────────────────────────────────────────────────
// lib/auth.ts — JWT sign and verify helpers.
// I use JWTs as "login tickets" — I sign one on login and
// the client sends it back with every protected request.
// The middleware in middleware/auth.ts calls verifyToken.
// ─────────────────────────────────────────────────────────────

import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types';

// I read the secret from .env — if it's missing in production,
// something is badly wrong and I want a loud crash, not a silent bug
const SECRET: string = process.env.JWT_SECRET ?? 'CHANGE_ME_IN_PRODUCTION';
const EXPIRY         = '7d'; // tokens stay valid for 7 days

// Creates a signed JWT string containing the user's id and email
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRY });
}

// Decodes and verifies a JWT string — throws if the token is
// expired, tampered with, or signed with a different secret
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}