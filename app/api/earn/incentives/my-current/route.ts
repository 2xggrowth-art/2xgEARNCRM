import { NextRequest, NextResponse } from 'next/server';
import { APIResponse } from '@/lib/types';
import {
  calculateMonthlyIncentive,
  getCurrentMonth,
} from '@/lib/incentive-calculator';

/**
 * GET /api/earn/incentives/my-current
 * Get current month incentive projection for the logged-in sales rep
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const month = getCurrentMonth();

    console.log('Calculating incentive for user:', userId, 'month:', month);

    // Calculate the incentive
    const breakdown = await calculateMonthlyIncentive(userId, month);

    console.log('Incentive calculated:', {
      sales_count: breakdown.sales.length,
      gross_commission: breakdown.summary.gross_commission,
      final_amount: breakdown.summary.final_amount,
    });

    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        user_id: userId,
        month,
        projection: breakdown.summary,
        sales_count: breakdown.sales.length,
        streak: breakdown.streak,
        reviews: breakdown.reviews,
        penalties_count: breakdown.penalties.length,
        breakdown,
      },
    });
  } catch (error) {
    console.error('My current incentive error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
