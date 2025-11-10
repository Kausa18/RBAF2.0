import axios from 'axios';

// Create axios instances with custom config
export const mainAPI = axios.create({
  timeout: 5000,
  headers: {
    'Cache-Control': 'no-cache',
    'Content-Type': 'application/json'
  }
});

export const matcherAPI = axios.create({
  timeout: 5000,
  headers: {
    'Cache-Control': 'no-cache',
    'Content-Type': 'application/json'
  }
});

// Add response interceptors for better error handling
const addErrorInterceptor = (instance, serviceName) => {
  instance.interceptors.response.use(
    response => response,
    error => {
      if (error.response) {
        // Server responded with error status
        console.error(`${serviceName} Error:`, {
          status: error.response.status,
          data: error.response.data,
          url: error.config.url,
          method: error.config.method
        });
      } else if (error.request) {
        // Request made but no response received
        console.error(`${serviceName} Network Error:`, {
          url: error.config.url,
          method: error.config.method,
          code: error.code,
          message: error.message
        });
      } else {
        // Error in setting up request
        console.error(`${serviceName} Request Setup Error:`, error.message);
      }
      return Promise.reject(error);
    }
  );
};

addErrorInterceptor(mainAPI, 'Main API');
addErrorInterceptor(matcherAPI, 'Matcher API');

export default {
  mainAPI,
  matcherAPI
};