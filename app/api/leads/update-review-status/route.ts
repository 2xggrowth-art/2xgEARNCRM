import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse } from '@/lib/types';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceNo, reviewStatus } = body;

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

    // Update the lead's review status (no organization_id check needed, invoice_no is unique)
    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .update({ review_status: reviewStatus })
      .eq('invoice_no', invoiceNo)
      .eq('status', 'win')
      .select()
      .single();

    if (error) {
      console.error('Error updating review status:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to update review status' },
        { status: 500 }
      );
    }

    if (!lead) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    return NextResponse.json<APIResponse>({
      success: true,
      data: lead,
      message: 'Review status updated successfully',
    });
  } catch (error) {
    console.error('Update review status error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
