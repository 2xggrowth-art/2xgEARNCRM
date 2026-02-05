import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse, UserRole } from '@/lib/types';
import { checkPermission } from '@/lib/permissions';

/**
 * POST /api/earn/manager/approve
 * Approve or reject an incentive (manager+ only)
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole;
    const organizationId = request.headers.get('x-organization-id');

    if (!userId || !organizationId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permission
    const check = checkPermission(userRole, 'approve_incentives');
    if (!check.authorized) {
      return NextResponse.json<APIResponse>(
        { success: false, error: check.error },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { incentive_id, approved, review_notes, final_amount } = body;

    if (!incentive_id) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Incentive ID is required' },
        { status: 400 }
      );
    }

    if (typeof approved !== 'boolean') {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Approved must be true or false' },
        { status: 400 }
      );
    }

    // Get the incentive
    const { data: incentive, error: fetchError } = await supabaseAdmin
      .from('monthly_incentives')
      .select('*')
      .eq('id', incentive_id)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !incentive) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Incentive not found' },
        { status: 404 }
      );
    }

    if (incentive.status !== 'pending_review' && incentive.status !== 'calculating') {
      return NextResponse.json<APIResponse>(
        { success: false, error: `Cannot approve incentive with status: ${incentive.status}` },
        { status: 400 }
      );
    }

    // Determine final amount
    let approvedAmount = final_amount;
    if (approved && !approvedAmount) {
      // Use capped amount if available, otherwise net incentive
      approvedAmount = incentive.capped_amount || incentive.net_incentive;
    }

    // Update the incentive
    const updateData: any = {
      status: approved ? 'approved' : 'rejected',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      review_notes,
    };

    if (approved) {
      updateData.final_approved_amount = approvedAmount;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('monthly_incentives')
      .update(updateData)
      .eq('id', incentive_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating incentive:', updateError);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to update incentive' },
        { status: 500 }
      );
    }

    return NextResponse.json<APIResponse>({
      success: true,
      data: updated,
      message: approved
        ? `Incentive approved: ₹${approvedAmount.toLocaleString('en-IN')}`
        : 'Incentive rejected',
    });
  } catch (error) {
    console.error('Manager approve error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
