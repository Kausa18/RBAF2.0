// hooks/useErrorReporting.js
import { useEffect } from 'react';
import * as ErrorReporting from '../utils/errorReporting';

/**
 * Custom hook to initialize and manage error reporting.
 * Optionally attach global handlers for uncaught errors.
 */
export default function useErrorReporting() {
  useEffect(() => {
    // Initialize error reporting when app starts
    ErrorReporting.initErrorReporting();

    // Global error handlers (React Native)
    const handleGlobalError = (error, isFatal) => {
      ErrorReporting.logError(error, { isFatal });
    };

    const handleUnhandledRejection = (reason, promise) => {
      ErrorReporting.logError(reason, { source: 'UnhandledPromiseRejection' });
    };

    // Attach handlers (works for RN and web)
    if (global.ErrorUtils) {
      const defaultHandler = global.ErrorUtils.getGlobalHandler();
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        handleGlobalError(error, isFatal);
        if (defaultHandler) defaultHandler(error, isFatal);
      });
    }

    // Catch unhandled promise rejections
    if (typeof global.addEventListener === 'function') {
      global.addEventListener('unhandledrejection', handleUnhandledRejection);
    }

    return () => {
      // Clean up listeners
      if (typeof global.removeEventListener === 'function') {
        global.removeEventListener('unhandledrejection', handleUnhandledRejection);
      }
    };
  }, []);

  // Hook returns useful helpers for components
  return {
    logError: ErrorReporting.logError,
    logInfo: ErrorReporting.logInfo,
  };
}
