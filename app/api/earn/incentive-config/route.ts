import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse, UserRole, OrganizationIncentiveConfig, DEFAULT_INCENTIVE_CONFIG } from '@/lib/types';
import { checkPermission } from '@/lib/permissions';

/**
 * GET /api/earn/incentive-config
 * Fetch incentive config for the organization (auto-creates default if missing)
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

    // Try fetching existing config
    let { data: config, error } = await supabaseAdmin
      .from('organization_incentive_config')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    // If no config exists, create default row (lazy init)
    if (!config || (error && error.code === 'PGRST116')) {
      const { data: newConfig, error: insertError } = await supabaseAdmin
        .from('organization_incentive_config')
        .insert({ organization_id: organizationId })
        .select()
        .single();

      if (insertError) {
        // Might already exist from race condition, try fetching again
        const { data: retryConfig } = await supabaseAdmin
          .from('organization_incentive_config')
          .select('*')
          .eq('organization_id', organizationId)
          .single();
        config = retryConfig;
      } else {
        config = newConfig;
      }
    }

    if (!config) {
      // Return defaults if DB is unavailable
      return NextResponse.json<APIResponse>({
        success: true,
        data: { ...DEFAULT_INCENTIVE_CONFIG, organization_id: organizationId },
      });
    }

    return NextResponse.json<APIResponse>({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Incentive config GET error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/earn/incentive-config
 * Update incentive config for the organization (manager+ only)
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

    // Check permission - manager+ can configure
    const check = checkPermission(userRole, 'approve_incentives');
    if (!check.authorized) {
      return NextResponse.json<APIResponse>(
        { success: false, error: check.error },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate team pool sums to 100
    const poolSum =
      (body.team_pool_top_performer || 0) +
      (body.team_pool_second_performer || 0) +
      (body.team_pool_third_performer || 0) +
      (body.team_pool_manager || 0) +
      (body.team_pool_support_staff || 0) +
      (body.team_pool_others || 0);

    if (Math.abs(poolSum - 100) > 0.01) {
      return NextResponse.json<APIResponse>(
        { success: false, error: `Team pool must total 100%. Currently: ${poolSum.toFixed(1)}%` },
        { status: 400 }
      );
    }

    // Build update object with only valid fields
    const updateData: Record<string, unknown> = {};
    const validFields = [
      'streak_bonus_7_days', 'streak_bonus_14_days', 'streak_bonus_30_days',
      'review_bonus_per_review',
      'penalty_late_arrival', 'penalty_unauthorized_absence', 'penalty_back_to_back_offs',
      'penalty_low_compliance', 'penalty_high_error_rate', 'penalty_non_escalated_lost_lead',
      'penalty_missing_documentation', 'penalty_low_team_eval', 'penalty_client_disrespect',
      'compliance_threshold', 'error_rate_threshold', 'team_eval_threshold',
      'team_pool_top_performer', 'team_pool_second_performer', 'team_pool_third_performer',
      'team_pool_manager', 'team_pool_support_staff', 'team_pool_others',
      'default_monthly_target', 'salary_cap_enabled',
    ];

    for (const field of validFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Validate all numeric values are >= 0
    for (const [key, value] of Object.entries(updateData)) {
      if (key !== 'salary_cap_enabled' && typeof value === 'number' && value < 0) {
        return NextResponse.json<APIResponse>(
          { success: false, error: `${key} cannot be negative` },
          { status: 400 }
        );
      }
    }

    // Upsert config
    const { data: config, error } = await supabaseAdmin
      .from('organization_incentive_config')
      .upsert(
        { organization_id: organizationId, ...updateData },
        { onConflict: 'organization_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving incentive config:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to save configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json<APIResponse>({
      success: true,
      data: config,
      message: 'Incentive configuration saved successfully',
    });
  } catch (error) {
    console.error('Incentive config PUT error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
