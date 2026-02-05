import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse, UserRole } from '@/lib/types';
import { checkPermission } from '@/lib/permissions';
import {
  calculateMonthlyIncentive,
  saveMonthlyIncentive,
} from '@/lib/incentive-calculator';

/**
 * POST /api/earn/incentives/finalize
 * Finalize incentives for all users in an organization for a given month
 * This calculates and submits incentives for manager review
 * Manager+ only
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
    const { month } = body;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Month is required in YYYY-MM format' },
        { status: 400 }
      );
    }

    // Get all sales reps in the organization
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .eq('organization_id', organizationId)
      .in('role', ['sales_rep', 'staff']);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Calculate and save incentives for each user
    const results: { user_id: string; user_name: string; status: string; error?: string }[] = [];

    for (const user of users || []) {
      try {
        const breakdown = await calculateMonthlyIncentive(user.id, month);
        await saveMonthlyIncentive(user.id, month, breakdown, 'pending_review');
        results.push({
          user_id: user.id,
          user_name: user.name,
          status: 'success',
        });
      } catch (err: any) {
        results.push({
          user_id: user.id,
          user_name: user.name,
          status: 'error',
          error: err.message,
        });
      }
    }

    const successCount = results.filter((r) => r.status === 'success').length;
    const errorCount = results.filter((r) => r.status === 'error').length;

    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        month,
        total_users: users?.length || 0,
        success_count: successCount,
        error_count: errorCount,
        results,
      },
      message: `Finalized ${successCount} incentives, ${errorCount} errors`,
    });
  } catch (error) {
    console.error('Finalize incentives error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
