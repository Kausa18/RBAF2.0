import { Platform } from 'react-native';

const LOCAL_IP = '172.20.10.5'; // Your computer's IP

export const API_BASE_URL = Platform.select({
  android: `http://${LOCAL_IP}:5000`,
  ios: `http://${LOCAL_IP}:5000`,
  default: 'http://localhost:5000'
});

export const API_ENDPOINTS = {
  // ============ AUTH ============
  SIGNUP: `${API_BASE_URL}/api/signup`,
  LOGIN: `${API_BASE_URL}/api/login`,
  
  // ============ USER ============
  REQUEST_HELP: `${API_BASE_URL}/api/request-help`,
  USER_REQUESTS: (userId) => `${API_BASE_URL}/api/user-requests/${userId}`,
  MATCH_PROVIDERS: `${API_BASE_URL}/api/match-providers`,
  
  // ============ PROVIDER PROFILE & STATS ============
  PROVIDER_PROFILE: `${API_BASE_URL}/api/provider/profile`,
  PROVIDER_DASHBOARD: `${API_BASE_URL}/api/provider/dashboard`,
  PROVIDER_STATS: (providerId) => `${API_BASE_URL}/api/provider/stats/${providerId}`,
  
  // ============ PROVIDER REQUESTS ============
  OPEN_REQUESTS: `${API_BASE_URL}/api/open-requests`,
  PENDING_REQUESTS: `${API_BASE_URL}/api/provider/requests/pending`,
  REQUEST_HISTORY: `${API_BASE_URL}/api/provider/requests/history`,
  
  // ============ REQUEST OPERATIONS (Provider side) ============
  ASSIGN_REQUEST: (requestId) => `${API_BASE_URL}/api/provider/requests/${requestId}/assign`,
  UPDATE_REQUEST_STATUS: (requestId) => `${API_BASE_URL}/api/provider/requests/${requestId}/status`,
  
  // ============ REQUEST OPERATIONS (General) ============
  REQUEST_DETAILS: (requestId) => `${API_BASE_URL}/api/requests/${requestId}`,
  ACCEPT_REQUEST: (requestId) => `${API_BASE_URL}/api/requests/${requestId}/accept`,
  DECLINE_REQUEST: (requestId) => `${API_BASE_URL}/api/requests/${requestId}/decline`,
  COMPLETE_REQUEST: (requestId) => `${API_BASE_URL}/api/requests/${requestId}/complete`,
  CANCEL_REQUEST: (requestId) => `${API_BASE_URL}/api/requests/${requestId}/cancel`,
  
  // ============ LOCATION & AVAILABILITY ============
  UPDATE_LOCATION: (providerId) => `${API_BASE_URL}/api/update-location/${providerId}`,
  PROVIDER_AVAILABILITY: (providerId) => `${API_BASE_URL}/api/update-location/${providerId}`, // Uses same endpoint
};

console.log('✅ API Configured:', API_BASE_URL);