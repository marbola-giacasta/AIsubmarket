import type { DnsPayload, Tag, User, SubdomainRequest } from '../types';

const BASE: string = (import.meta.env.VITE_API_URL ?? '') + '/api';

function getToken(): string | null { return localStorage.getItem('token'); }
function authHeaders(): Record<string, string> {
  const token = getToken();
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
async function request<T>(method: string, path: string, body: unknown = null): Promise<T> {
  const res  = await fetch(`${BASE}${path}`, { method, headers: authHeaders(), body: body ? JSON.stringify(body) : undefined });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error: string }).error || 'Request failed');
  return data as T;
}

export const register             = (email: string, password: string) => request<{ token: string; user: User }>('POST', '/auth/register', { email, password });
export const login                = (email: string, password: string) => request<{ token: string; user: User }>('POST', '/auth/login', { email, password });
export const getMe                = () => request<{ user: User }>('GET', '/auth/me');
export const getDomains           = () => request<{ domains: string[] }>('GET', '/subdomains/domains');
export const getSubdomains        = () => request<{ subdomains: Tag[] }>('GET', '/subdomains');
export const checkAvailability    = (subdomain: string, domain: string) => request<{ available: boolean; fqdn: string }>('GET', `/subdomains/check?subdomain=${encodeURIComponent(subdomain)}&domain=${encodeURIComponent(domain)}`);
export const purchaseSubdomain    = (subdomain: string, domain: string) => request<{ subdomain: Tag }>('POST', '/subdomains/purchase', { subdomain, domain });
export const submitRequest        = (data: { subdomain: string; domain: string; name: string; useCase: string; message: string }) => request<{ request: SubdomainRequest; message: string }>('POST', '/subdomains/request', data);
export const getMyRequests        = () => request<{ requests: SubdomainRequest[] }>('GET', '/subdomains/my-requests');
export const getMyHistory         = () => request<{ requests: SubdomainRequest[] }>('GET', '/subdomains/my-history');
export const deleteMyRequest      = (id: string) => request<{ message: string }>('DELETE', `/subdomains/requests/${id}`);
export const clearMyHistory       = () => request<{ message: string }>('DELETE', '/subdomains/my-history/all');
export const acceptPrice          = (requestId: string) => request<{ message: string }>('POST', `/subdomains/requests/${requestId}/accept-price`);
export const declinePrice         = (requestId: string) => request<{ message: string }>('POST', `/subdomains/requests/${requestId}/decline-price`);
export const dismissRequest       = (requestId: string) => request<{ message: string }>('POST', `/subdomains/requests/${requestId}/dismiss`);
export const cancelSubscription   = (tagId: string) => request<{ message: string }>('POST', `/subdomains/${tagId}/cancel-subscription`);
export const createStripeSession  = (subdomain: string, domain: string) => request<{ url: string; sessionId: string }>('POST', '/subdomains/stripe-session', { subdomain, domain });
export const confirmStripePayment = (sessionId: string) => request<{ subdomain: Tag }>('POST', '/subdomains/stripe-success', { sessionId });
export const updateDns            = (id: string, dnsData: DnsPayload) => request<{ subdomain: Tag }>('PUT', `/subdomains/${id}/dns`, dnsData);
export const deleteDns            = (id: string) => request<{ message: string }>('DELETE', `/subdomains/${id}/dns`);
export const deleteSubdomain      = (id: string) => request<{ message: string }>('DELETE', `/subdomains/${id}`);
export const sendMessage          = (requestId: string, text: string, isAdmin: boolean) => request<{ messages: unknown[] }>('POST', isAdmin ? `/admin/requests/${requestId}/message` : `/subdomains/requests/${requestId}/message`, { text });
