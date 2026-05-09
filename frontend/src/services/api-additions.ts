// Add these three lines to frontend/src/services/api.ts

export const getMyHistory    = () => request('GET', '/subdomains/my-history');
export const deleteMyRequest = (id) => request('DELETE', `/subdomains/requests/${id}`);
export const clearMyHistory  = () => request('DELETE', '/subdomains/my-history/all');
