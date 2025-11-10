// utils/errorReporting.js
// Centralized error reporting utility (can integrate Sentry, Firebase Crashlytics, etc.)

/**
 * Initialize error reporting service (optional).
 * @param {Object} options - Configuration options for your reporting service.
 */
export function initErrorReporting(options = {}) {
  console.log('[ErrorReporting] initialized with options:', options);
  // Example: Sentry.init({ dsn: options.dsn });
}

/**
 * Log and optionally send an error to remote service.
 * @param {Error|string} error - The error object or message.
 * @param {Object} extra - Additional context info.
 */
export function logError(error, extra = {}) {
  console.warn('[ErrorReporting] logError:', error, extra);

  // Example:
  // Sentry.captureException(error);
}

/**
 * Log informational messages for debugging or analytics.
 * @param {string} message - Info message.
 * @param {Object} meta - Optional metadata.
 */
export function logInfo(message, meta = {}) {
  console.log('[ErrorReporting] info:', message, meta);

  // Example:
  // Sentry.addBreadcrumb({ message, data: meta, level: 'info' });
}

// Optional default export
export default {
  initErrorReporting,
  logError,
  logInfo,
};
