// ─────────────────────────────────────────────────────────────
// AuthContext.tsx — global auth state shared across all components.
// I use React Context here so any component in the app can access
// the current user without having to pass props down manually
// through every level of the component tree.
// ─────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getMe } from '../services/api';
import type { User } from '../types';

// I define what shape of data the context will provide to consumers
interface AuthContextValue {
  user:       User | null;   // null means not logged in
  loading:    boolean;       // true while I'm checking if a token exists on startup
  loginUser:  (token: string, user: User) => void;
  logoutUser: () => void;
}

// I create the context with null as default — if something tries to use this
// outside of AuthProvider it'll break loudly, which is what I want
const AuthContext = createContext<AuthContextValue | null>(null);

// AuthProvider wraps the whole app — all children can access auth state
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // On first load, I check if there's already a token in localStorage.
  // If there is, I call /api/auth/me to get the user's data back.
  // This keeps the user "logged in" after a page refresh.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    getMe()
      .then(({ user }) => setUser(user))
      .catch(() => localStorage.removeItem('token')) // token is expired or invalid
      .finally(() => setLoading(false));
  }, []);

  // Called after a successful login — I save the token so it survives page refreshes
  function loginUser(token: string, user: User): void {
    localStorage.setItem('token', token);
    setUser(user);
  }

  // Called when the user clicks logout — clear everything
  function logoutUser(): void {
    localStorage.removeItem('token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook — components call useAuth() instead of useContext(AuthContext) directly.
// I throw an error if it's used outside the provider so I catch mistakes early.
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}