import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as ErrorReporting from '../utils/errorReporting';

export const useErrorReporting = () => {
  const [errorState, setErrorState] = useState({
    hasError: false,
    error: null
  });

  const handleError = useCallback(async (error, context = {}) => {
    // Log error
    console.error('Error occurred:', {
      message: error?.message,
      code: error?.code,
      context,
      stack: error?.stack
    });

    // Set error state
    setErrorState({
      hasError: true,
      error
    });

    // Report error to service
    try {
      await ErrorReporting.logError(error, context);
    } catch (reportingError) {
      console.error('Error reporting failed:', reportingError);
    }

    // Show user-friendly alert
    const errorMessage = error?.response?.data?.message || error?.message || 'An unexpected error occurred';
    Alert.alert('Error', errorMessage);

    return error;
  }, []);

  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      error: null
    });
  }, []);

  return {
    ...errorState,
    handleError,
    clearError
  };
};