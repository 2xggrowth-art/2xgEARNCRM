import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse, UserRole, MonthlyIncentive } from '@/lib/types';
import { checkPermission } from '@/lib/permissions';

/**
 * GET /api/earn/incentives/history
 * Get historical incentives for a user
 * Query params: user_id (optional), limit (optional, default 12)
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
    const limit = parseInt(searchParams.get('limit') || '12', 10);

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

    // Get historical incentives
    const { data: incentives, error } = await supabaseAdmin
      .from('monthly_incentives')
      .select('*')
      .eq('user_id', targetUserId)
      .order('month', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching incentive history:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to fetch incentive history' },
        { status: 500 }
      );
    }

    // Calculate totals
    const totals = (incentives || []).reduce(
      (acc, inc) => ({
        total_gross: acc.total_gross + (inc.gross_commission || 0),
        total_bonuses: acc.total_bonuses + (inc.streak_bonus || 0) + (inc.review_bonus || 0),
        total_penalties: acc.total_penalties + (inc.penalty_amount || 0),
        total_paid:
          acc.total_paid + (inc.status === 'paid' ? inc.final_approved_amount || inc.net_incentive || 0 : 0),
      }),
      { total_gross: 0, total_bonuses: 0, total_penalties: 0, total_paid: 0 }
    );

    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        user_id: targetUserId,
        incentives: incentives || [],
        totals,
      },
    });
  } catch (error) {
    console.error('Incentive history error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
