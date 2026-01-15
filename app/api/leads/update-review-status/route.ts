import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse } from '@/lib/types';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceNo, reviewStatus } = body;

    // Get the user ID from headers (set by middleware)
    const userId = request.headers.get('x-user-id');
    const organizationId = request.headers.get('x-organization-id');

    logger.info('📝 Update review status request:', { invoiceNo, reviewStatus, userId, organizationId });

    // Validate inputs
    if (!invoiceNo) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Invoice number is required' },
        { status: 400 }
      );
    }

    if (!['reviewed', 'yet_to_review'].includes(reviewStatus)) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Invalid review status' },
        { status: 400 }
      );
    }

    // First, check if the review_status column exists by trying to query it
    const { data: checkLead, error: checkError } = await supabaseAdmin
      .from('leads')
      .select('id, review_status, reviewed_by')
      .eq('invoice_no', invoiceNo)
      .eq('status', 'win')
      .maybeSingle();

    if (checkError) {
      logger.error('❌ Database error (column may not exist):', checkError);
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: `Database schema error: ${checkError.message}. Please run the migration SQL file first.`
        },
        { status: 500 }
      );
    }

    if (!checkLead) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Lead not found or not a WIN lead' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      review_status: reviewStatus,
    };

    // If marking as reviewed, record who reviewed it
    if (reviewStatus === 'reviewed' && userId) {
      updateData.reviewed_by = userId;
    } else if (reviewStatus === 'yet_to_review') {
      // If unmarking, clear the reviewer
      updateData.reviewed_by = null;
    }

    // Update the lead's review status
    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .update(updateData)
      .eq('invoice_no', invoiceNo)
      .eq('status', 'win')
      .select()
      .single();

    if (error) {
      logger.error('❌ Error updating review status:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: `Failed to update review status: ${error.message}` },
        { status: 500 }
      );
    }

    logger.info('✅ Review status updated successfully');

    return NextResponse.json<APIResponse>({
      success: true,
      data: lead,
      message: 'Review status updated successfully',
    });
  } catch (error: any) {
    logger.error('❌ Update review status error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: `Internal server error: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
