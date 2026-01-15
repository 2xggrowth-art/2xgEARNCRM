import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get('phone');
    const orgId = searchParams.get('orgId');

    if (!phone || !orgId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Phone and organization ID required' },
        { status: 400 }
      );
    }

    // Check if customer exists in this organization
    const { data: leads, error } = await supabaseAdmin
      .from('leads')
      .select(`
        id,
        customer_name,
        customer_phone,
        status,
        created_at,
        deal_size,
        sale_price
      `)
      .eq('organization_id', orgId)
      .eq('customer_phone', phone)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error checking phone:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to check phone number' },
        { status: 500 }
      );
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json<APIResponse>({
        success: true,
        data: {
          exists: false,
          leadCount: 0,
          latestLead: null,
        },
      });
    }

    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        exists: true,
        leadCount: leads.length,
        latestLead: leads[0],
        customerName: leads[0].customer_name,
      },
    });
  } catch (error) {
    logger.error('Check phone error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
