import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse, UserRole } from '@/lib/types';
import { checkPermission } from '@/lib/permissions';
import { getCurrentMonth } from '@/lib/incentive-calculator';

/**
 * GET /api/earn/manager
 * Get pending incentive approvals and team overview (manager+ only)
 * Query params: month (optional)
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || getCurrentMonth();

    // Get pending approvals
    const { data: pendingIncentives, error: pendingError } = await supabaseAdmin
      .from('monthly_incentives')
      .select(`
        *,
        users (id, name, phone, role)
      `)
      .eq('organization_id', organizationId)
      .eq('month', month)
      .eq('status', 'pending_review')
      .order('gross_commission', { ascending: false });

    if (pendingError) {
      console.error('Error fetching pending incentives:', pendingError);
    }

    // Get all incentives for the month (for overview)
    const { data: allIncentives, error: allError } = await supabaseAdmin
      .from('monthly_incentives')
      .select(`
        *,
        users (id, name, phone, role)
      `)
      .eq('organization_id', organizationId)
      .eq('month', month)
      .order('net_incentive', { ascending: false });

    if (allError) {
      console.error('Error fetching all incentives:', allError);
    }

    // Get disputed penalties
    const { data: disputedPenalties } = await supabaseAdmin
      .from('penalties')
      .select(`
        *,
        users (name)
      `)
      .eq('organization_id', organizationId)
      .eq('month', month)
      .eq('status', 'disputed');

    // Calculate summary
    const summary = {
      pending_count: pendingIncentives?.length || 0,
      approved_count: allIncentives?.filter((i) => i.status === 'approved').length || 0,
      paid_count: allIncentives?.filter((i) => i.status === 'paid').length || 0,
      total_gross: allIncentives?.reduce((sum, i) => sum + Number(i.gross_commission || 0), 0) || 0,
      total_net: allIncentives?.reduce((sum, i) => sum + Number(i.net_incentive || 0), 0) || 0,
      total_penalties: allIncentives?.reduce((sum, i) => sum + Number(i.penalty_amount || 0), 0) || 0,
      disputed_penalties_count: disputedPenalties?.length || 0,
    };

    // Transform data
    const transformedPending = (pendingIncentives || []).map((i: any) => ({
      ...i,
      user_name: i.users?.name,
      user_phone: i.users?.phone,
      user_role: i.users?.role,
    }));

    const transformedAll = (allIncentives || []).map((i: any) => ({
      ...i,
      user_name: i.users?.name,
      user_phone: i.users?.phone,
      user_role: i.users?.role,
    }));

    const transformedDisputed = (disputedPenalties || []).map((p: any) => ({
      ...p,
      user_name: p.users?.name,
    }));

    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        month,
        summary,
        pending_approvals: transformedPending,
        all_incentives: transformedAll,
        disputed_penalties: transformedDisputed,
      },
    });
  } catch (error) {
    console.error('Manager GET error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
