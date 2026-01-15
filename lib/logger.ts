/**
 * Production-safe logging utility
 *
 * In production, only errors are logged to avoid exposing sensitive information.
 * In development, all log levels are available for debugging.
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Log informational messages (only in development)
   * Use for debugging, tracing execution flow, etc.
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Log warning messages (only in development)
   */
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * Log error messages (always logged, even in production)
   * Be careful not to log sensitive data in error messages
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * Log debug messages (only in development)
   * Use for detailed debugging information
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
};

/**
 * Sanitize sensitive data from objects before logging
 * Removes common sensitive fields
 */
export function sanitizeForLogging(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = { ...obj };
  const sensitiveFields = [
    'password',
    'pin',
    'pin_hash',
    'token',
    'secret',
    'api_key',
    'apiKey',
    'authorization',
    'auth_token',
    'refresh_token',
    'access_token',
    'JWT_SECRET',
    'CRON_SECRET',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}
