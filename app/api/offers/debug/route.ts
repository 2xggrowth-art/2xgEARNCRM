import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse } from '@/lib/types';

// GET /api/offers/debug - Debug endpoint to check offer_leads table
// This is a temporary endpoint for debugging - remove in production
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const organizationId = request.headers.get('x-organization-id');

    // Get all offer leads (no filters) to debug
    const { data: allLeads, error: allError } = await supabaseAdmin
      .from('offer_leads')
      .select('id, sales_rep_id, customer_name, phone, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get offer leads for this specific user
    const { data: userLeads, error: userError } = await supabaseAdmin
      .from('offer_leads')
      .select('id, sales_rep_id, customer_name, phone, created_at')
      .eq('sales_rep_id', userId || '')
      .order('created_at', { ascending: false });

    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        headers: {
          userId,
          organizationId,
        },
        allLeadsCount: allLeads?.length || 0,
        allLeads: allLeads || [],
        allLeadsError: allError?.message,
        userLeadsCount: userLeads?.length || 0,
        userLeads: userLeads || [],
        userLeadsError: userError?.message,
      },
    });
  } catch (error) {
    logger.error('Debug offer leads error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
