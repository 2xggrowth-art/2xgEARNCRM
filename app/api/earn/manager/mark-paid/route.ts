import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse, UserRole } from '@/lib/types';
import { checkPermission } from '@/lib/permissions';

/**
 * POST /api/earn/manager/mark-paid
 * Mark incentives as paid (manager+ only)
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
    const { incentive_ids, payment_reference } = body;

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
      .eq('organization_id', organizationId)
      .eq('status', 'approved');

    if (fetchError) {
      console.error('Error fetching incentives:', fetchError);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to fetch incentives' },
        { status: 500 }
      );
    }

    if (!incentives || incentives.length === 0) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'No approved incentives found' },
        { status: 400 }
      );
    }

    // Mark as paid
    const { error: updateError } = await supabaseAdmin
      .from('monthly_incentives')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_reference,
      })
      .in('id', incentive_ids)
      .eq('organization_id', organizationId)
      .eq('status', 'approved');

    if (updateError) {
      console.error('Error marking as paid:', updateError);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to mark incentives as paid' },
        { status: 500 }
      );
    }

    const totalPaid = incentives.reduce((sum, i) => sum + Number(i.final_approved_amount || 0), 0);

    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        marked_paid: incentives.length,
        total_amount: totalPaid,
        payment_reference,
      },
      message: `Marked ${incentives.length} incentives as paid: ₹${totalPaid.toLocaleString('en-IN')}`,
    });
  } catch (error) {
    console.error('Mark paid error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
