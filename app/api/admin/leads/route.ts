import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const organizationId = request.headers.get('x-organization-id');
    const userRole = request.headers.get('x-user-role');

    if (!organizationId || (userRole !== 'admin' && userRole !== 'manager')) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch all leads for the organization with sales rep info
    const { data: leads, error } = await supabaseAdmin
      .from('leads')
      .select(`
        *,
        categories (
          name
        ),
        models (
          name
        ),
        users!sales_rep_id (
          id,
          name
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching admin leads:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to fetch leads' },
        { status: 500 }
      );
    }

    // Transform data
    const transformedLeads = leads.map((lead: any) => ({
      ...lead,
      category_name: lead.categories?.name || 'Unknown',
      model_name: lead.models?.name || (lead.status === 'win' ? 'N/A' : 'Unknown'),
      sales_rep_name: lead.users?.name || 'Unknown',
      categories: undefined,
      models: undefined,
      users: undefined,
    }));

    return NextResponse.json<APIResponse>({
      success: true,
      data: transformedLeads,
    });
  } catch (error) {
    logger.error('Admin leads API error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
