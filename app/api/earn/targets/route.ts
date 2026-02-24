import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse, UserRole, MonthlyTarget } from '@/lib/types';
import { checkPermission } from '@/lib/permissions';
import { getCurrentMonth, updateMonthlyTargetProgress, getIncentiveConfig } from '@/lib/incentive-calculator';

/**
 * GET /api/earn/targets
 * Get monthly targets
 * Query params: user_id (optional), month (optional)
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

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('user_id');
    const month = searchParams.get('month') || getCurrentMonth();

    // Build query
    let query = supabaseAdmin
      .from('monthly_targets')
      .select(`
        *,
        users (name)
      `)
      .eq('organization_id', organizationId)
      .eq('month', month);

    // Filter by user
    if (targetUserId) {
      // If requesting another user's data, check permission
      if (targetUserId !== userId) {
        const check = checkPermission(userRole, 'view_team_leads');
        if (!check.authorized) {
          return NextResponse.json<APIResponse>(
            { success: false, error: check.error },
            { status: 403 }
          );
        }
      }
      query = query.eq('user_id', targetUserId);
    } else {
      // If not a manager, only show own target
      if (userRole === 'sales_rep' || userRole === 'staff') {
        query = query.eq('user_id', userId);
      }
    }

    const { data: targets, error } = await query;

    if (error) {
      console.error('Error fetching targets:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to fetch targets' },
        { status: 500 }
      );
    }

    // Transform data
    const transformedTargets = (targets || []).map((t: any) => ({
      ...t,
      user_name: t.users?.name,
    }));

    return NextResponse.json<APIResponse>({
      success: true,
      data: transformedTargets,
    });
  } catch (error) {
    console.error('Targets GET error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/earn/targets
 * Create or update a monthly target (manager+ only)
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
    const check = checkPermission(userRole, 'set_targets');
    if (!check.authorized) {
      return NextResponse.json<APIResponse>(
        { success: false, error: check.error },
        { status: 403 }
      );
    }

    // Fetch org config for dynamic default target
    const orgConfig = await getIncentiveConfig(organizationId);

    const body = await request.json();
    const {
      user_id: targetUserId,
      month = getCurrentMonth(),
      target_amount = orgConfig.default_monthly_target,
    } = body;

    if (!targetUserId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Month must be in YYYY-MM format' },
        { status: 400 }
      );
    }

    if (target_amount < 0) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Target amount cannot be negative' },
        { status: 400 }
      );
    }

    // Verify user belongs to organization
    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('id, organization_id')
      .eq('id', targetUserId)
      .eq('organization_id', organizationId)
      .single();

    if (!targetUser) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'User not found in organization' },
        { status: 404 }
      );
    }

    // Calculate current achieved amount
    await updateMonthlyTargetProgress(targetUserId, organizationId, month);

    // Get or create the target
    const { data: existingTarget } = await supabaseAdmin
      .from('monthly_targets')
      .select('achieved_amount')
      .eq('user_id', targetUserId)
      .eq('month', month)
      .single();

    // Upsert the target
    const { data: target, error } = await supabaseAdmin
      .from('monthly_targets')
      .upsert(
        {
          user_id: targetUserId,
          organization_id: organizationId,
          month,
          target_amount,
          achieved_amount: existingTarget?.achieved_amount || 0,
          set_by_user_id: userId,
        },
        {
          onConflict: 'user_id,month',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error setting target:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to set target' },
        { status: 500 }
      );
    }

    return NextResponse.json<APIResponse>({
      success: true,
      data: target,
      message: `Target set: ₹${target_amount.toLocaleString('en-IN')}`,
    });
  } catch (error) {
    console.error('Targets POST error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
