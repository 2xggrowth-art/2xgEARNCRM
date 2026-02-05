import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse, UserRole, DEFAULT_MONTHLY_TARGET } from '@/lib/types';
import { checkPermission } from '@/lib/permissions';
import { getCurrentMonth, updateMonthlyTargetProgress } from '@/lib/incentive-calculator';

/**
 * GET /api/earn/targets/progress
 * Get target progress for a user
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

    // Update progress first
    await updateMonthlyTargetProgress(targetUserId, organizationId, month);

    // Get updated target
    const { data: target } = await supabaseAdmin
      .from('monthly_targets')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('month', month)
      .single();

    // Get sales breakdown
    const startDate = `${month}-01`;
    const [year, monthNum] = month.split('-').map(Number);
    const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
    const nextYear = monthNum === 12 ? year + 1 : year;
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    const { data: sales } = await supabaseAdmin
      .from('leads')
      .select('id, sale_price, created_at, invoice_no, customer_name')
      .eq('sales_rep_id', targetUserId)
      .eq('status', 'win')
      .gte('created_at', startDate)
      .lt('created_at', endDate)
      .order('created_at', { ascending: false });

    // Calculate stats
    const salesCount = sales?.length || 0;
    const totalSales = sales?.reduce((sum, s) => sum + (s.sale_price || 0), 0) || 0;
    const targetAmount = target?.target_amount || DEFAULT_MONTHLY_TARGET;
    const achievementPercentage = targetAmount > 0 ? (totalSales / targetAmount) * 100 : 0;
    const qualifies = totalSales >= targetAmount;
    const remaining = Math.max(0, targetAmount - totalSales);

    // Calculate daily rate needed to meet target
    const today = new Date();
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const currentDay = today.getMonth() + 1 === monthNum && today.getFullYear() === year
      ? today.getDate()
      : daysInMonth;
    const daysRemaining = daysInMonth - currentDay;
    const dailyRateNeeded = daysRemaining > 0 ? remaining / daysRemaining : 0;

    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        user_id: targetUserId,
        month,
        target_amount: targetAmount,
        achieved_amount: totalSales,
        achievement_percentage: Math.min(200, achievementPercentage).toFixed(1),
        qualifies_for_incentive: qualifies,
        remaining_amount: remaining,
        sales_count: salesCount,
        days_remaining: daysRemaining,
        daily_rate_needed: Math.round(dailyRateNeeded),
        recent_sales: (sales || []).slice(0, 5).map((s) => ({
          id: s.id,
          invoice_no: s.invoice_no,
          customer_name: s.customer_name,
          amount: s.sale_price,
          date: s.created_at,
        })),
      },
    });
  } catch (error) {
    console.error('Target progress error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
