import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: leads, error } = await supabaseAdmin
      .from('leads')
      .select(`
        *,
        categories (
          name
        ),
        models (
          name
        )
      `)
      .eq('sales_rep_id', userId)
      .order('created_at', { ascending: false});

    if (error) {
      logger.error('Error fetching leads:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to fetch leads' },
        { status: 500 }
      );
    }

    // Transform data to include category name at top level
    const transformedLeads = leads.map((lead: any) => ({
      ...lead,
      category_name: lead.categories?.name || 'Unknown',
      model_name: lead.models?.name || (lead.status === 'win' ? 'N/A' : 'Unknown'),
      categories: undefined, // Remove nested object
      models: undefined,
    }));

    return NextResponse.json<APIResponse>({
      success: true,
      data: transformedLeads,
    });
  } catch (error) {
    logger.error('My leads API error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
