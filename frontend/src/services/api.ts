// ─────────────────────────────────────────────────────────────
// api.ts — all HTTP calls to my backend live here.
// I import functions from here in components instead of
// writing fetch() calls directly in every component.
// That way, if the API changes, I only update this file.
// ─────────────────────────────────────────────────────────────

import type { DnsPayload, Tag, User, SubdomainRequest } from '../types';

// In development: VITE_API_URL is not set → BASE = '/api'
// Vite proxies /api to localhost:3001 (see vite.config.ts).
// In production: VITE_API_URL = 'https://aisubmarket-backend.vercel.app'
// so BASE = 'https://aisubmarket-backend.vercel.app/api'
const BASE: string = (import.meta.env.VITE_API_URL ?? '') + '/api';

// I grab the JWT token from localStorage — I store it there on login
function getToken(): string | null {
  return localStorage.getItem('token');
}

// Every request to a protected endpoint needs this Authorization header
function authHeaders(): Record<string, string> {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Generic request helper — I call this instead of repeating fetch() everywhere
async function request<T>(method: string, path: string, body: unknown = null): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  // If the status is not 2xx, my backend always sends { error: '...' }
  if (!res.ok) throw new Error((data as { error: string }).error || 'Request failed');
  return data as T;
}

// ── Auth ─────────────────────────────────────────────────────

export const register = (email: string, password: string) =>
  request<{ token: string; user: User }>('POST', '/auth/register', { email, password });

export const login = (email: string, password: string) =>
  request<{ token: string; user: User }>('POST', '/auth/login', { email, password });

export const getMe = () =>
  request<{ user: User }>('GET', '/auth/me');

// ── Subdomains ────────────────────────────────────────────────

export const getDomains = () =>
  request<{ domains: string[] }>('GET', '/subdomains/domains');

export const getSubdomains = () =>
  request<{ subdomains: Tag[] }>('GET', '/subdomains');

export const checkAvailability = (subdomain: string, domain: string) =>
  request<{ available: boolean; fqdn: string }>(
    'GET',
    `/subdomains/check?subdomain=${encodeURIComponent(subdomain)}&domain=${encodeURIComponent(domain)}`
  );

export const purchaseSubdomain = (subdomain: string, domain: string) =>
  request<{ subdomain: Tag }>('POST', '/subdomains/purchase', { subdomain, domain });

export const submitRequest = (data: {
  subdomain: string;
  domain:    string;
  name:      string;
  useCase:   string;
  message:   string;
}) => request<{ request: SubdomainRequest; message: string }>('POST', '/subdomains/request', data);

export const createStripeSession = (subdomain: string, domain: string) =>
  request<{ url: string; sessionId: string }>('POST', '/subdomains/stripe-session', { subdomain, domain });

export const confirmStripePayment = (sessionId: string) =>
  request<{ subdomain: Tag }>('POST', '/subdomains/stripe-success', { sessionId });

export const updateDns = (id: string, dnsData: DnsPayload) =>
  request<{ subdomain: Tag }>('PUT', `/subdomains/${id}/dns`, dnsData);

export const deleteDns = (id: string) =>
  request<{ message: string }>('DELETE', `/subdomains/${id}/dns`);

export const deleteSubdomain = (id: string) =>
  request<{ message: string }>('DELETE', `/subdomains/${id}`);