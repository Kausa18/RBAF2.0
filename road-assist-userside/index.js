import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';
import axios from 'axios';
import App from './App';

// Configure global axios defaults
axios.defaults.timeout = 10000; // 10 second timeout
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.post['Content-Type'] = 'application/json';

// Add axios interceptors for global error handling
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNABORTED') {
      console.warn('Request timeout - Please check your internet connection');
    }
    if (error.response?.status === 401) {
      // Handle unauthorized access
      console.warn('Unauthorized access - User needs to login again');
      // You could emit an event here to trigger logout
    }
    return Promise.reject(error);
  }
);

// Ignore specific warnings that are known and handled
LogBox.ignoreLogs([
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
  // Add any other warnings that you've verified are not issues
]);

// Global error handling for unexpected crashes
if (!__DEV__) {
  // Only in production
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    // Log the error to your error reporting service
    console.error('Unexpected error occurred:', error);
    // You could add crash reporting service here (e.g., Sentry)
  });
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
