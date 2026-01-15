import { createClient } from '@supabase/supabase-js';

// Validate critical environment variables
function validateEnvVar(name: string, value: string | undefined, placeholder: string): string {
  if (!value || value.includes('your-') || value.includes('-here')) {
    console.warn(`⚠️  WARNING: ${name} is not properly configured.`);
    console.warn(`   Using placeholder value. This WILL FAIL at runtime.`);
    console.warn(`   Set real values in Vercel environment variables before deploying.`);
    return placeholder;
  }
  return value;
}

const supabaseUrl = validateEnvVar(
  'NEXT_PUBLIC_SUPABASE_URL',
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  'https://placeholder.supabase.co'
);
const supabaseAnonKey = validateEnvVar(
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder'
);
const supabaseServiceRoleKey = validateEnvVar(
  'SUPABASE_SERVICE_ROLE_KEY',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY0NTE5MjgwMCwiZXhwIjoxOTYwNzY4ODAwfQ.placeholder'
);

// Client for browser/frontend usage
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'apikey': supabaseServiceRoleKey,
    },
  },
});
