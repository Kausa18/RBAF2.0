export const API_HOST = 'http://172.20.10.5:5000';
export const MATCH_HOST = 'http://172.20.10.5:5001';

// Configuration notes:
// - Using 172.20.10.3 (your machine's IP) for mobile device access
// - For emulator: use 10.0.2.2 instead of 172.20.10.3
// - For local testing: use localhost

export const API_ENDPOINTS = {
  SIGNUP: `${API_HOST}/api/signup`,
  LOGIN: `${API_HOST}/api/login`,
  REFRESH_TOKEN: `${API_HOST}/api/refresh-token`,
  REQUEST_HELP: `${API_HOST}/api/request-help`,
  MATCH_PROVIDERS: `${MATCH_HOST}/match-providers`,
  OPEN_REQUESTS: `${API_HOST}/api/provider/requests/pending`,
  PROVIDER_STATS: (providerId) => `${API_HOST}/api/provider/stats/${providerId}`,
  UPDATE_LOCATION: (providerId) => `${API_HOST}/api/update-location/${providerId}`,
  PROVIDER_AVAILABILITY: (providerId) => `${API_HOST}/api/provider/${providerId}/availability`,
  ASSIGN_REQUEST: (requestId) => `${API_HOST}/api/assign-request/${requestId}`,
  UPDATE_REQUEST_STATUS: (requestId) => `${API_HOST}/api/request/${requestId}/status`,
  ADMIN_PROVIDERS: `${API_HOST}/api/admin/providers`,
  ADMIN_PROVIDER_STATUS: (providerId) => `${API_HOST}/api/admin/provider/${providerId}/status`,
  HEALTH: `${API_HOST}/api/health`,
  MATCHER_HEALTH: `${MATCH_HOST}/health`,
};

export default API_ENDPOINTS;
