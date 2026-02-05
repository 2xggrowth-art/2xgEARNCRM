import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse, UserRole, TEAM_POOL_DISTRIBUTION } from '@/lib/types';
import { checkPermission } from '@/lib/permissions';
import { getCurrentMonth, calculateTeamPool } from '@/lib/incentive-calculator';

/**
 * GET /api/earn/team-pool
 * Get team pool distribution for a month
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

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || getCurrentMonth();

    // Get existing distribution
    const { data: distribution, error } = await supabaseAdmin
      .from('team_pool_distributions')
      .select(`
        *,
        top_performer:users!team_pool_distributions_top_performer_user_id_fkey (name),
        second_performer:users!team_pool_distributions_second_performer_user_id_fkey (name),
        third_performer:users!team_pool_distributions_third_performer_user_id_fkey (name),
        manager:users!team_pool_distributions_manager_user_id_fkey (name),
        approved_by_user:users!team_pool_distributions_approved_by_fkey (name)
      `)
      .eq('organization_id', organizationId)
      .eq('month', month)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching team pool:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to fetch team pool' },
        { status: 500 }
      );
    }

    // Transform data
    const transformedDistribution = distribution
      ? {
          ...distribution,
          top_performer_name: distribution.top_performer?.name,
          second_performer_name: distribution.second_performer?.name,
          third_performer_name: distribution.third_performer?.name,
          manager_name: distribution.manager?.name,
          approved_by_name: distribution.approved_by_user?.name,
        }
      : null;

    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        month,
        distribution: transformedDistribution,
        distribution_rules: TEAM_POOL_DISTRIBUTION,
      },
    });
  } catch (error) {
    console.error('Team pool GET error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/earn/team-pool
 * Calculate team pool distribution (manager+ only)
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
    const { month = getCurrentMonth(), total_pool_amount } = body;

    if (!total_pool_amount || total_pool_amount <= 0) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Total pool amount is required and must be positive' },
        { status: 400 }
      );
    }

    // Calculate distribution
    const poolResult = await calculateTeamPool(organizationId, month, total_pool_amount);

    // Save to database
    const distributionData: any = {
      organization_id: organizationId,
      month,
      total_pool_amount,
      status: 'pending_approval',
      distribution_json: poolResult,
    };

    // Add performer data
    if (poolResult.performers[0]) {
      distributionData.top_performer_user_id = poolResult.performers[0].user_id;
      distributionData.top_performer_amount = poolResult.performers[0].amount;
    }
    if (poolResult.performers[1]) {
      distributionData.second_performer_user_id = poolResult.performers[1].user_id;
      distributionData.second_performer_amount = poolResult.performers[1].amount;
    }
    if (poolResult.performers[2]) {
      distributionData.third_performer_user_id = poolResult.performers[2].user_id;
      distributionData.third_performer_amount = poolResult.performers[2].amount;
    }
    if (poolResult.manager) {
      distributionData.manager_user_id = poolResult.manager.user_id;
      distributionData.manager_amount = poolResult.manager.amount;
    }

    distributionData.support_staff_amount = poolResult.support_staff.reduce(
      (sum, s) => sum + s.amount,
      0
    );
    distributionData.others_pool_amount = poolResult.others.reduce((sum, o) => sum + o.amount, 0);

    const { data: distribution, error } = await supabaseAdmin
      .from('team_pool_distributions')
      .upsert(distributionData, {
        onConflict: 'organization_id,month',
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving team pool:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to save team pool' },
        { status: 500 }
      );
    }

    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        distribution,
        breakdown: poolResult,
      },
      message: 'Team pool calculated successfully',
    });
  } catch (error) {
    console.error('Team pool POST error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/earn/team-pool
 * Approve team pool distribution (manager+ only)
 */
export async function PUT(request: NextRequest) {
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
    const { month, action, distribution_notes } = body;

    if (!month) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Month is required' },
        { status: 400 }
      );
    }

    if (!action || !['approve', 'distribute'].includes(action)) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Action must be "approve" or "distribute"' },
        { status: 400 }
      );
    }

    // Get existing distribution
    const { data: existing } = await supabaseAdmin
      .from('team_pool_distributions')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('month', month)
      .single();

    if (!existing) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Team pool distribution not found' },
        { status: 404 }
      );
    }

    // Update based on action
    const updateData: any = {};

    if (action === 'approve') {
      if (existing.status !== 'pending_approval') {
        return NextResponse.json<APIResponse>(
          { success: false, error: 'Can only approve pending distributions' },
          { status: 400 }
        );
      }
      updateData.status = 'approved';
      updateData.approved_by = userId;
      updateData.approved_at = new Date().toISOString();
    } else if (action === 'distribute') {
      if (existing.status !== 'approved') {
        return NextResponse.json<APIResponse>(
          { success: false, error: 'Can only distribute approved distributions' },
          { status: 400 }
        );
      }
      updateData.status = 'distributed';
      updateData.distributed_at = new Date().toISOString();
    }

    if (distribution_notes) {
      updateData.distribution_notes = distribution_notes;
    }

    const { data: updated, error } = await supabaseAdmin
      .from('team_pool_distributions')
      .update(updateData)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating team pool:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to update team pool' },
        { status: 500 }
      );
    }

    return NextResponse.json<APIResponse>({
      success: true,
      data: updated,
      message: `Team pool ${action === 'approve' ? 'approved' : 'marked as distributed'}`,
    });
  } catch (error) {
    console.error('Team pool PUT error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
