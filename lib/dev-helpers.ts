import { supabaseAdmin } from './supabase';

/**
 * Development helper to get organization ID
 * In production, this should come from authenticated user context
 */
export async function getDevOrganizationId(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .limit(1)
    .single();

  return data?.id || null;
}

/**
 * Development helper to get user ID by phone
 */
export async function getDevUserIdByPhone(phone: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('phone', phone)
    .single();

  return data?.id || null;
}

/**
 * Development helper to get first sales rep user ID
 * In production, this should come from authenticated user context
 */
export async function getDevUserId(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('role', 'sales_rep')
    .limit(1)
    .single();

  return data?.id || null;
}
