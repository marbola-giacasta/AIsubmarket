// In development: VITE_API_URL is not set, so BASE = '/api'
// which gets proxied to localhost:3001 by vite.config.js
// In production: VITE_API_URL = 'https://your-backend.vercel.app'
// so BASE = 'https://your-backend.vercel.app/api'
const BASE = (import.meta.env.VITE_API_URL || '') + '/api';

function getToken() { return localStorage.getItem('token'); }

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(method, path, body = null) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const register             = (email, password)  => request('POST', '/auth/register', { email, password });
export const login                = (email, password)  => request('POST', '/auth/login',    { email, password });
export const getMe                = ()                 => request('GET',  '/auth/me');
export const getDomains           = ()                 => request('GET',  '/subdomains/domains');
export const getSubdomains        = ()                 => request('GET',  '/subdomains');
export const checkAvailability    = (subdomain, domain) => request('GET', `/subdomains/check?subdomain=${encodeURIComponent(subdomain)}&domain=${encodeURIComponent(domain)}`);
export const purchaseSubdomain    = (subdomain, domain) => request('POST', '/subdomains/purchase', { subdomain, domain });
export const submitRequest        = (data)             => request('POST', '/subdomains/request', data);
export const createStripeSession  = (subdomain, domain) => request('POST', '/subdomains/stripe-session', { subdomain, domain });
export const confirmStripePayment = (sessionId)        => request('POST', '/subdomains/stripe-success', { sessionId });
export const updateDns            = (id, dnsData)      => request('PUT',  `/subdomains/${id}/dns`, dnsData);
export const deleteDns            = (id)               => request('DELETE', `/subdomains/${id}/dns`);
export const deleteSubdomain      = (id)               => request('DELETE', `/subdomains/${id}`);
