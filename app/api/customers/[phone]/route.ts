import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;

    // Get organization ID from cookie/header
    const authToken = request.cookies.get('auth_token')?.value;
    if (!authToken) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Decode token to get organization ID
    // For now, we'll get it from the leads query

    // Fetch all leads for this phone number with full details
    const { data: leads, error } = await supabaseAdmin
      .from('leads')
      .select(`
        *,
        categories (name),
        models (name),
        users!sales_rep_id (name)
      `)
      .eq('customer_phone', phone)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching customer history:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to fetch customer history' },
        { status: 500 }
      );
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Calculate summary stats
    const totalLeads = leads.length;
    const winCount = leads.filter(l => l.status === 'win').length;
    const lostCount = leads.filter(l => l.status === 'lost').length;
    const totalValue = leads.reduce((sum, lead) => {
      return sum + (lead.status === 'win' ? (lead.sale_price || 0) : (lead.deal_size || 0));
    }, 0);

    // Format leads with additional details
    const formattedLeads = leads.map(lead => ({
      ...lead,
      category_name: lead.categories?.name,
      model_name: lead.models?.name,
      sales_rep_name: lead.users?.name,
    }));

    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        customer: {
          phone: phone,
          name: leads[0].customer_name,
          leadCount: totalLeads,
          winCount,
          lostCount,
          totalValue,
          firstVisit: leads[leads.length - 1].created_at,
          lastVisit: leads[0].created_at,
        },
        leads: formattedLeads,
      },
    });
  } catch (error) {
    logger.error('Customer history error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
