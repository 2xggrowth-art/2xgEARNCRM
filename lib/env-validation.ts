/**
 * Environment Variable Validation
 *
 * This file validates that all required environment variables are set
 * before the application starts. This prevents runtime errors and ensures
 * proper configuration.
 */

interface EnvValidationResult {
  isValid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * Validate all required environment variables
 */
export function validateEnv(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Required environment variables
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
  ];

  // Optional but recommended environment variables
  const recommendedVars = [
    'CRON_SECRET',
  ];

  // Check required variables
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      missing.push(varName);
    } else if (value.includes('your-') || value.includes('-here')) {
      missing.push(`${varName} (placeholder value detected)`);
    }
  }

  // Check recommended variables
  for (const varName of recommendedVars) {
    const value = process.env[varName];
    if (!value) {
      warnings.push(`${varName} is not set (recommended for production)`);
    } else if (value.includes('your-') || value.includes('-here')) {
      warnings.push(`${varName} has a placeholder value`);
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Validate environment and throw error if invalid
 * Call this at application startup
 */
export function requireValidEnv(): void {
  const result = validateEnv();

  if (!result.isValid) {
    const errorMessage = [
      '❌ ENVIRONMENT VALIDATION FAILED',
      '',
      'Missing or invalid required environment variables:',
      ...result.missing.map(v => `  - ${v}`),
      '',
      'The application cannot start without these variables.',
      'Please set them in your .env.local file or deployment environment.',
      '',
      'See .env.local for examples of how to set these values.',
    ].join('\n');

    throw new Error(errorMessage);
  }

  if (result.warnings.length > 0 && process.env.NODE_ENV === 'production') {
    console.warn('⚠️  ENVIRONMENT WARNINGS:');
    result.warnings.forEach(warning => {
      console.warn(`  - ${warning}`);
    });
  }
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}
