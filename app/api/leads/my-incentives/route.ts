import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const organizationId = request.headers.get('x-organization-id');

    if (!userId || !organizationId) {
      return NextResponse.json(
        { success: false, error: 'Missing user or organization information' },
        { status: 400 }
      );
    }

    // Fetch leads where has_incentive = true and incentive_amount exists
    const { data: leads, error } = await supabaseAdmin
      .from('leads')
      .select(`
        *,
        categories (name)
      `)
      .eq('sales_rep_id', userId)
      .eq('organization_id', organizationId)
      .eq('status', 'win')
      .eq('has_incentive', true)
      .not('incentive_amount', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching incentives:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch incentives' },
        { status: 500 }
      );
    }

    // Format the data
    const formattedLeads = leads.map((lead: any) => ({
      ...lead,
      category_name: lead.categories?.name || 'Unknown',
    }));

    return NextResponse.json({
      success: true,
      data: formattedLeads,
    });
  } catch (error) {
    logger.error('Error in GET /api/leads/my-incentives:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
