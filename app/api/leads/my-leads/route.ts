import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse } from '@/lib/types';
import { getDevUserId } from '@/lib/dev-helpers';

export async function GET(request: NextRequest) {
  try {
    // For development: get user ID from database
    const userId = await getDevUserId();

    if (!userId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'No user found' },
        { status: 404 }
      );
    }

    const { data: leads, error } = await supabaseAdmin
      .from('leads')
      .select(`
        *,
        categories (
          name
        )
      `)
      .eq('sales_rep_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching leads:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to fetch leads' },
        { status: 500 }
      );
    }

    // Transform data to include category name at top level
    const transformedLeads = leads.map((lead: any) => ({
      ...lead,
      category_name: lead.categories?.name || 'Unknown',
      categories: undefined, // Remove nested object
    }));

    return NextResponse.json<APIResponse>({
      success: true,
      data: transformedLeads,
    });
  } catch (error) {
    console.error('My leads API error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
