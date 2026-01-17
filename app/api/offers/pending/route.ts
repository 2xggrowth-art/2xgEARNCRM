import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse, OfferLead } from '@/lib/types';

// GET /api/offers/pending - Get pending (unconverted) offer leads for the current sales rep
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const organizationId = request.headers.get('x-organization-id');

    logger.info('Pending offers request:', { userId, organizationId });

    if (!userId || !organizationId) {
      logger.warn('Missing auth headers in pending offers request');
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch offer leads for this sales rep
    // We filter out already-converted leads if the column exists
    const { data: offerLeads, error } = await supabaseAdmin
      .from('offer_leads')
      .select('*')
      .eq('sales_rep_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching pending offer leads:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to fetch offer leads' },
        { status: 500 }
      );
    }

    // Filter out converted leads client-side if the column exists
    // This handles both cases: when column exists and when it doesn't
    const pendingLeads = offerLeads?.filter(lead => {
      // If converted_to_lead_id field exists and is not null, exclude it
      if ('converted_to_lead_id' in lead && lead.converted_to_lead_id !== null) {
        return false;
      }
      return true;
    }) || [];

    logger.info(`Found ${pendingLeads.length} pending offer leads for user ${userId} (total: ${offerLeads?.length || 0})`);

    return NextResponse.json<APIResponse<OfferLead[]>>({
      success: true,
      data: pendingLeads,
    });
  } catch (error) {
    logger.error('Pending offer leads error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
