import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse } from '@/lib/types';
import { getDevOrganizationId } from '@/lib/dev-helpers';

export async function GET(request: NextRequest) {
  try {
    // For development: get organization ID from database
    const organizationId = await getDevOrganizationId();

    if (!organizationId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'No organization found' },
        { status: 404 }
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
        users!sales_rep_id (
          id,
          name
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching admin leads:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to fetch leads' },
        { status: 500 }
      );
    }

    // Transform data
    const transformedLeads = leads.map((lead: any) => ({
      ...lead,
      category_name: lead.categories?.name || 'Unknown',
      sales_rep_name: lead.users?.name || 'Unknown',
      categories: undefined,
      users: undefined,
    }));

    return NextResponse.json<APIResponse>({
      success: true,
      data: transformedLeads,
    });
  } catch (error) {
    console.error('Admin leads API error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
