import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse, UserRole } from '@/lib/types';
import { checkPermission } from '@/lib/permissions';

/**
 * POST /api/earn/manager/bulk-approve
 * Bulk approve multiple incentives (manager+ only)
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
    const { incentive_ids, review_notes } = body;

    if (!incentive_ids || !Array.isArray(incentive_ids) || incentive_ids.length === 0) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Incentive IDs array is required' },
        { status: 400 }
      );
    }

    // Get all incentives
    const { data: incentives, error: fetchError } = await supabaseAdmin
      .from('monthly_incentives')
      .select('*')
      .in('id', incentive_ids)
      .eq('organization_id', organizationId);

    if (fetchError) {
      console.error('Error fetching incentives:', fetchError);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to fetch incentives' },
        { status: 500 }
      );
    }

    // Filter to only pending_review or calculating
    const approvableIncentives = (incentives || []).filter(
      (i) => i.status === 'pending_review' || i.status === 'calculating'
    );

    if (approvableIncentives.length === 0) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'No approvable incentives found' },
        { status: 400 }
      );
    }

    // Approve each incentive
    const results: { id: string; status: string; amount?: number; error?: string }[] = [];

    for (const incentive of approvableIncentives) {
      try {
        const approvedAmount = incentive.capped_amount || incentive.net_incentive;

        const { error: updateError } = await supabaseAdmin
          .from('monthly_incentives')
          .update({
            status: 'approved',
            reviewed_by: userId,
            reviewed_at: new Date().toISOString(),
            review_notes: review_notes || 'Bulk approved',
            final_approved_amount: approvedAmount,
          })
          .eq('id', incentive.id);

        if (updateError) {
          results.push({ id: incentive.id, status: 'error', error: updateError.message });
        } else {
          results.push({ id: incentive.id, status: 'approved', amount: approvedAmount });
        }
      } catch (err: any) {
        results.push({ id: incentive.id, status: 'error', error: err.message });
      }
    }

    const approvedCount = results.filter((r) => r.status === 'approved').length;
    const errorCount = results.filter((r) => r.status === 'error').length;
    const totalApproved = results
      .filter((r) => r.status === 'approved')
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        requested: incentive_ids.length,
        approved: approvedCount,
        errors: errorCount,
        total_amount: totalApproved,
        results,
      },
      message: `Approved ${approvedCount} incentives, total: ₹${totalApproved.toLocaleString('en-IN')}`,
    });
  } catch (error) {
    console.error('Bulk approve error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
