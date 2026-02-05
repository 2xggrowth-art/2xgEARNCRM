import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse, UserRole, MonthlyIncentive } from '@/lib/types';
import { checkPermission } from '@/lib/permissions';
import {
  calculateMonthlyIncentive,
  saveMonthlyIncentive,
  getCurrentMonth,
} from '@/lib/incentive-calculator';

/**
 * GET /api/earn/incentives
 * Get incentive calculation for a user/month
 * Query params: user_id (optional), month (optional, defaults to current)
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
    const targetUserId = searchParams.get('user_id') || userId;
    const month = searchParams.get('month') || getCurrentMonth();

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

    // Calculate the incentive
    const breakdown = await calculateMonthlyIncentive(targetUserId, month);

    // Get existing incentive record if any
    const { data: existing } = await supabaseAdmin
      .from('monthly_incentives')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('month', month)
      .single();

    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        user_id: targetUserId,
        month,
        breakdown,
        saved_incentive: existing,
      },
    });
  } catch (error) {
    console.error('Incentives GET error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/earn/incentives
 * Calculate and save incentive for a user/month
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

    const body = await request.json();
    const { user_id: targetUserId = userId, month = getCurrentMonth() } = body;

    // If calculating for another user, check permission
    if (targetUserId !== userId) {
      const check = checkPermission(userRole, 'approve_incentives');
      if (!check.authorized) {
        return NextResponse.json<APIResponse>(
          { success: false, error: check.error },
          { status: 403 }
        );
      }
    }

    // Calculate the incentive
    const breakdown = await calculateMonthlyIncentive(targetUserId, month);

    // Save to database
    const saved = await saveMonthlyIncentive(targetUserId, month, breakdown, 'calculating');

    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        user_id: targetUserId,
        month,
        breakdown,
        saved_incentive: saved,
      },
      message: 'Incentive calculated and saved',
    });
  } catch (error) {
    console.error('Incentives POST error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
