// App.js
import React, { useEffect, useRef } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ConnectionMonitor from './components/ConnectionMonitor';
import { Alert } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from './config/api';

// Screens
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import UserDashboard from './screens/UserDashboard';
import ProviderDashboardScreen from './screens/ProviderDashboardScreen';
import RequestHistoryScreen from './screens/RequestHistoryScreen';
import ProviderPendingScreen from './screens/ProviderPendingScreen';

const Stack = createNativeStackNavigator();

// Navigation ref so we can navigate/reset from non-component code (eg. interceptors)
export const navigationRef = createNavigationContainerRef();

// Helper functions
const isNetworkError = (error) => {
  return (
    error?.code === 'ECONNABORTED' ||
    error?.message === 'Network Error' ||
    (error?.request && !error?.response)
  );
};

const refreshAuthToken = async () => {
  try {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token');

    const response = await axios.post(API_ENDPOINTS.REFRESH_TOKEN, { refreshToken });
    const { accessToken } = response.data;

    if (!accessToken) throw new Error('No access token returned from refresh endpoint');

    await AsyncStorage.setItem('userToken', accessToken);
    // Optionally set default Authorization header for subsequent requests
    axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

    return accessToken;
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw error;
  }
};

const navigateToLogin = async () => {
  try {
    // Clear stored tokens
    await AsyncStorage.multiRemove(['userToken', 'refreshToken']);
  } catch (err) {
    console.error('Error clearing tokens:', err);
  }

  // Reset navigation to Login (safe if nav is ready)
  if (navigationRef.isReady()) {
    try {
      navigationRef.resetRoot({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (navErr) {
      console.warn('Failed to reset navigation to Login:', navErr);
    }
  } else {
    console.warn('Navigation is not ready; cannot reset to Login.');
  }
};

export default function App() {
  const lastNetworkAlert = useRef(0);
  const networkErrorCount = useRef(0);
  const tokenRefreshInProgress = useRef(false);

  useEffect(() => {
    // Request interceptor
    const reqId = axios.interceptors.request.use(
      async (req) => {
        try {
          // Defensive: ensure headers and params objects exist
          req.headers = req.headers || {};
          req.params = req.params || {};

          // Add timestamp to GET requests to help avoid caching
          if ((req.method || '').toLowerCase() === 'get') {
            req.params = { ...req.params, _t: Date.now() };
          }

          // Add auth token if available
          const token = await AsyncStorage.getItem('userToken');
          if (token) {
            req.headers.Authorization = `Bearer ${token}`;
          }

          // Log request
          console.log('📤 API Request:', {
            method: req.method,
            url: req.url,
            data: req.data,
            params: req.params,
          });
        } catch (e) {
          console.warn('Request interceptor error:', e);
        }
        return req;
      },
      (error) => {
        console.error('Request setup error:', error?.message || error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    const resId = axios.interceptors.response.use(
      async (res) => {
        try {
          console.log('📥 API Response:', {
            status: res.status,
            url: res.config?.url,
            data: res.data,
          });

          // If backend signals token will expire soon, refresh in background
          if (res.headers && res.headers['token-expires-soon'] === 'true') {
            // Fire-and-forget
            refreshAuthToken().catch((e) => console.error('Background token refresh failed:', e));
          }

          // Reset network error counter on success
          networkErrorCount.current = 0;
        } catch (e) {
          console.warn('Response interceptor error:', e);
        }
        return res;
      },
      async (err) => {
        try {
          console.error('🚫 Axios error:', {
            message: err?.message,
            url: err?.config?.url,
            method: err?.config?.method,
            code: err?.code,
            status: err?.response?.status,
            data: err?.response?.data,
          });

          const originalConfig = err?.config;

          // Handle 401 (Unauthorized) -> attempt token refresh once per-request
          if (err?.response?.status === 401 && originalConfig) {
            // Don't try to refresh if we've already retried this request
            if (!originalConfig._retry) {
              originalConfig._retry = true;

              if (!tokenRefreshInProgress.current) {
                tokenRefreshInProgress.current = true;
                try {
                  const newToken = await refreshAuthToken();
                  if (newToken) {
                    // Set header for the retried request and for defaults
                    originalConfig.headers = originalConfig.headers || {};
                    originalConfig.headers.Authorization = `Bearer ${newToken}`;
                    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

                    // Retry original request
                    return axios(originalConfig);
                  }
                } catch (refreshError) {
                  console.error('Token refresh failed:', refreshError);
                  // If refresh fails, force logout & navigate to login
                  navigateToLogin();
                } finally {
                  tokenRefreshInProgress.current = false;
                }
              } else {
                // If a refresh is already in progress, wait until it completes and then retry once
                // Simple wait loop (polling) — for more robust handling use a request queue
                const waitForToken = async () => {
                  // Wait up to 10 seconds (poll every 200ms)
                  const timeout = 10000;
                  const interval = 200;
                  let waited = 0;
                  while (tokenRefreshInProgress.current && waited < timeout) {
                    // eslint-disable-next-line no-await-in-loop
                    await new Promise((r) => setTimeout(r, interval));
                    waited += interval;
                  }
                };

                await waitForToken();

                // If token available now, retry once
                const token = await AsyncStorage.getItem('userToken');
                if (token) {
                  originalConfig.headers = originalConfig.headers || {};
                  originalConfig.headers.Authorization = `Bearer ${token}`;
                  return axios(originalConfig);
                } else {
                  navigateToLogin();
                }
              }
            }
          }

          // Network error handling with exponential backoff & user alerting
          const now = Date.now();
          if (isNetworkError(err)) {
            networkErrorCount.current += 1;
            const backoffDelay = Math.min(1000 * Math.pow(2, networkErrorCount.current - 1), 30000);

            // Show alert if sufficient time passed since last alert
            if (now - lastNetworkAlert.current > backoffDelay) {
              lastNetworkAlert.current = now;
              Alert.alert(
                'Connection Error',
                'Unable to reach the server. Please check your network connection and try again.',
                [{ text: 'OK' }]
              );
            }
          }
        } catch (logErr) {
          console.error('Error handler failure:', logErr);
        }

        return Promise.reject(err);
      }
    );

    return () => {
      // Eject interceptors on unmount
      axios.interceptors.request.eject(reqId);
      axios.interceptors.response.eject(resId);
    };
  }, []);

  return (
    <SafeAreaProvider>
      <ConnectionMonitor />
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#4ECDC4',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen
            name="Signup"
            component={SignupScreen}
            options={{
              title: 'Create Account',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="UserDashboard"
            component={UserDashboard}
            options={{
              title: 'Road Assist',
              headerLeft: () => null,
            }}
          />
          <Stack.Screen
            name="ProviderDashboard"
            component={ProviderDashboardScreen}
            options={{
              title: 'Provider Dashboard',
              headerLeft: () => null,
            }}
          />
          <Stack.Screen name="RequestHistory" component={RequestHistoryScreen} options={{ title: 'Request History' }} />
          <Stack.Screen
            name="ProviderPending"
            component={ProviderPendingScreen}
            options={{
              title: 'Account Under Review',
              headerLeft: () => null,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
