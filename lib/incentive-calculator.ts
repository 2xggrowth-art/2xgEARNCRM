/**
 * 2XG EARN Incentive Calculation Engine
 *
 * This module handles all incentive calculations based on the 2XG Earn specification:
 * - Commission calculation (category-based with premium multipliers)
 * - Streak bonuses (7/14/30 day milestones)
 * - Review bonuses (₹10 per review initiated)
 * - Penalty calculations
 * - Monthly incentive aggregation
 */

import { supabaseAdmin } from './supabase';
import {
  CommissionRate,
  IncentiveBreakdown,
  MonthlyIncentive,
  Penalty,
  PenaltyType,
  SaleCommissionBreakdown,
  StreakBreakdown,
  ReviewBreakdown,
  PenaltyBreakdown,
  IncentiveSummary,
  PENALTY_PERCENTAGES,
  STREAK_BONUSES,
} from './types';

// ================================================
// COMMISSION CALCULATION
// ================================================

export interface CommissionResult {
  commission_rate: number;
  multiplier_applied: number;
  effective_rate: number;
  commission_amount: number;
}

/**
 * Calculate commission for a single sale
 */
export async function calculateSaleCommission(
  salePrice: number,
  categoryId: string | null,
  organizationId: string
): Promise<CommissionResult> {
  // Default fallback
  const defaultResult: CommissionResult = {
    commission_rate: 0.8,
    multiplier_applied: 1.0,
    effective_rate: 0.8,
    commission_amount: salePrice * 0.008,
  };

  if (!organizationId) return defaultResult;

  // Get commission rate for category
  const { data: rates } = await supabaseAdmin
    .from('commission_rates')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('category_id', { nullsFirst: false });

  if (!rates || rates.length === 0) return defaultResult;

  // Find matching rate (category-specific first, then default)
  let rate = rates.find((r) => r.category_id === categoryId);
  if (!rate) {
    rate = rates.find((r) => r.category_id === null || r.category_name === 'Default');
  }
  if (!rate) return defaultResult;

  // Check if premium multiplier applies
  const isPremium = salePrice >= rate.premium_threshold;
  const multiplier = isPremium ? rate.multiplier : 1.0;
  const effectiveRate = rate.commission_percentage * multiplier;
  const commissionAmount = salePrice * (effectiveRate / 100);

  return {
    commission_rate: rate.commission_percentage,
    multiplier_applied: multiplier,
    effective_rate: effectiveRate,
    commission_amount: commissionAmount,
  };
}

/**
 * Get all commission rates for an organization
 */
export async function getCommissionRates(organizationId: string): Promise<CommissionRate[]> {
  const { data, error } = await supabaseAdmin
    .from('commission_rates')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('category_name');

  if (error) {
    console.error('Error fetching commission rates:', error);
    return [];
  }

  return data || [];
}

// ================================================
// STREAK BONUS CALCULATION
// ================================================

export interface StreakResult {
  current_streak: number;
  bonus_tier: 'none' | '7_days' | '14_days' | '30_days';
  bonus_amount: number;
}

/**
 * Calculate streak bonus for a user
 */
export async function calculateStreakBonus(userId: string): Promise<StreakResult> {
  const { data: streak } = await supabaseAdmin
    .from('streaks')
    .select('current_streak')
    .eq('user_id', userId)
    .single();

  if (!streak || !streak.current_streak) {
    return { current_streak: 0, bonus_tier: 'none', bonus_amount: 0 };
  }

  const currentStreak = streak.current_streak;

  // Cumulative bonuses: highest tier only
  if (currentStreak >= 30) {
    return { current_streak: currentStreak, bonus_tier: '30_days', bonus_amount: STREAK_BONUSES[30] };
  } else if (currentStreak >= 14) {
    return { current_streak: currentStreak, bonus_tier: '14_days', bonus_amount: STREAK_BONUSES[14] };
  } else if (currentStreak >= 7) {
    return { current_streak: currentStreak, bonus_tier: '7_days', bonus_amount: STREAK_BONUSES[7] };
  }

  return { current_streak: currentStreak, bonus_tier: 'none', bonus_amount: 0 };
}

// ================================================
// REVIEW BONUS CALCULATION
// ================================================

export interface ReviewResult {
  reviews_initiated: number;
  bonus_per_review: number;
  total_bonus: number;
}

/**
 * Calculate review bonus for a user in a month
 * Reviews are ONLY counted from Win leads where review_status is 'reviewed'
 * (meaning the customer has actually submitted a review)
 * Pending or yet_to_review status leads do NOT qualify for review bonus
 */
export async function calculateReviewBonus(userId: string, month: string): Promise<ReviewResult> {
  // Use the same date format as other calculations
  const startDate = `${month}-01`;
  const [yearNum, monthNum] = month.split('-').map(Number);
  const nextMonthNum = monthNum === 12 ? 1 : monthNum + 1;
  const nextYearNum = monthNum === 12 ? yearNum + 1 : yearNum;
  const endDate = `${nextYearNum}-${String(nextMonthNum).padStart(2, '0')}-01`;

  // Count Win leads where customer has actually reviewed (review_status = 'reviewed' ONLY)
  // Pending or yet_to_review status leads do NOT count for review bonus
  const { count, error } = await supabaseAdmin
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('sales_rep_id', userId)
    .eq('status', 'win')
    .eq('review_status', 'reviewed')  // ONLY count actual reviews, not pending
    .gte('created_at', startDate)
    .lt('created_at', endDate);

  if (error) {
    console.error('Error calculating review bonus:', error);
  }

  const reviewCount = count || 0;
  const bonusPerReview = 10;

  return {
    reviews_initiated: reviewCount,
    bonus_per_review: bonusPerReview,
    total_bonus: reviewCount * bonusPerReview,
  };
}

// ================================================
// PENALTY CALCULATION
// ================================================

export interface PenaltyResult {
  total_percentage: number;
  penalty_count: number;
  penalties: PenaltyBreakdown[];
}

/**
 * Calculate total penalties for a user in a month
 */
export async function calculatePenalties(userId: string, month: string): Promise<PenaltyResult> {
  const { data: penalties } = await supabaseAdmin
    .from('penalties')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('status', 'active');

  if (!penalties || penalties.length === 0) {
    return { total_percentage: 0, penalty_count: 0, penalties: [] };
  }

  const penaltyBreakdown: PenaltyBreakdown[] = penalties.map((p) => ({
    id: p.id,
    type: p.penalty_type as PenaltyType,
    percentage: p.penalty_percentage,
    description: p.description,
    incident_date: p.incident_date,
  }));

  const totalPercentage = Math.min(
    penalties.reduce((sum, p) => sum + p.penalty_percentage, 0),
    100 // Cap at 100%
  );

  return {
    total_percentage: totalPercentage,
    penalty_count: penalties.length,
    penalties: penaltyBreakdown,
  };
}

/**
 * Calculate penalty percentage for specific penalty types
 */
export function calculatePenaltyPercentage(
  penaltyType: PenaltyType,
  value?: number
): number {
  switch (penaltyType) {
    case 'late_arrival':
    case 'unauthorized_absence':
    case 'back_to_back_offs':
    case 'non_escalated_lost_lead':
    case 'missing_documentation':
      return PENALTY_PERCENTAGES[penaltyType];

    case 'low_compliance':
      // (96 - score) × 10%, max 50%
      if (value !== undefined && value < 96) {
        return Math.min((96 - value) * 10, 50);
      }
      return 0;

    case 'high_error_rate':
      // (rate - 1) × 10%, max 50%
      if (value !== undefined && value > 1) {
        return Math.min((value - 1) * 10, 50);
      }
      return 0;

    case 'low_team_eval':
      // (4.0 - score) × 15%
      if (value !== undefined && value < 4.0) {
        return (4.0 - value) * 15;
      }
      return 0;

    case 'client_disrespect':
      return 100; // Full forfeiture

    default:
      return 0;
  }
}

// ================================================
// MONTHLY INCENTIVE CALCULATION
// ================================================

/**
 * Calculate complete monthly incentive for a user
 */
export async function calculateMonthlyIncentive(
  userId: string,
  month: string
): Promise<IncentiveBreakdown> {
  // Get user info
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('organization_id, monthly_salary')
    .eq('id', userId)
    .single();

  if (!user || !user.organization_id) {
    throw new Error('User not found or has no organization');
  }

  const organizationId = user.organization_id;
  const monthlySalary = user.monthly_salary;

  // Check if user qualifies (met monthly target)
  const { data: target } = await supabaseAdmin
    .from('monthly_targets')
    .select('qualifies_for_incentive, achieved_amount')
    .eq('user_id', userId)
    .eq('month', month)
    .single();

  const qualifies = target?.qualifies_for_incentive ?? true; // Default to true if no target set

  // Get all qualified sales for the month
  // Use the same date format as targets/progress API which works correctly
  const startDate = `${month}-01`;
  const [yearNum, monthNum] = month.split('-').map(Number);
  const nextMonthNum = monthNum === 12 ? 1 : monthNum + 1;
  const nextYearNum = monthNum === 12 ? yearNum + 1 : yearNum;
  const endDate = `${nextYearNum}-${String(nextMonthNum).padStart(2, '0')}-01`;

  // Fetch all win leads for the month, including review_status to determine eligibility
  const { data: sales, error: salesError } = await supabaseAdmin
    .from('leads')
    .select('id, invoice_no, customer_name, sale_price, category_id, commission_rate_applied, commission_amount, review_qualified, review_status, created_at')
    .eq('sales_rep_id', userId)
    .eq('status', 'win')
    .gte('created_at', startDate)
    .lt('created_at', endDate);

  if (salesError) {
    console.error('Error fetching sales for incentive:', salesError);
  }

  console.log('Incentive calculation - Sales query result:', {
    userId,
    month,
    startDate,
    endDate,
    salesCount: sales?.length || 0,
    salesError: salesError?.message || null,
  });

  // Get category names separately to avoid join issues
  const categoryIds = [...new Set((sales || []).map((s: any) => s.category_id).filter(Boolean))];
  const { data: categories } = categoryIds.length > 0
    ? await supabaseAdmin.from('categories').select('id, name').in('id', categoryIds)
    : { data: [] };

  const categoryMap = new Map((categories || []).map((c: any) => [c.id, c.name]));

  // Build sales breakdown with on-the-fly commission calculation for legacy leads
  // Filter out any leads without sale_price (should not happen for win leads but just in case)
  const validSales = (sales || []).filter((s: any) => s.sale_price && s.sale_price > 0);

  const salesBreakdown: SaleCommissionBreakdown[] = await Promise.all(
    validSales.map(async (sale: any) => {
      // For leads created before the migration, commission_amount may be NULL
      // Calculate it on-the-fly if missing
      let commissionAmount = sale.commission_amount;
      let commissionRate = sale.commission_rate_applied;

      if (commissionAmount === null || commissionAmount === undefined) {
        // Calculate commission dynamically for legacy leads
        const result = await calculateSaleCommission(
          sale.sale_price,
          sale.category_id,
          organizationId
        );
        commissionAmount = result.commission_amount;
        commissionRate = result.effective_rate;
      }

      // IMPORTANT: Review qualification is based on review_status
      // Only leads with review_status = 'reviewed' qualify for commission
      // Pending, yet_to_review, or null status leads do NOT qualify
      const isReviewQualified = sale.review_status === 'reviewed';

      return {
        lead_id: sale.id,
        invoice_no: sale.invoice_no || '',
        customer_name: sale.customer_name,
        sale_price: sale.sale_price,
        category_name: categoryMap.get(sale.category_id) || 'Unknown',
        commission_rate: commissionRate || 0.8,
        multiplier_applied: (commissionRate || 0) > 1.0,
        commission_amount: commissionAmount || 0,
        review_qualified: isReviewQualified,  // Based on review_status, not the old review_qualified field
        created_at: sale.created_at,
      };
    })
  );

  // Calculate gross commission ONLY from leads where review_status = 'reviewed'
  // Pending, yet_to_review, or null status leads do NOT get commission
  const grossCommission = salesBreakdown
    .filter((s) => s.review_qualified === true)  // Only reviewed leads qualify
    .reduce((sum, s) => sum + s.commission_amount, 0);

  // Calculate streak bonus
  const streakResult = await calculateStreakBonus(userId);
  const streakBreakdown: StreakBreakdown = {
    current_streak: streakResult.current_streak,
    bonus_tier: streakResult.bonus_tier,
    bonus_amount: streakResult.bonus_amount,
  };

  // Calculate review bonus
  const reviewResult = await calculateReviewBonus(userId, month);
  const reviewBreakdown: ReviewBreakdown = {
    reviews_initiated: reviewResult.reviews_initiated,
    bonus_per_review: reviewResult.bonus_per_review,
    total_bonus: reviewResult.total_bonus,
  };

  // Calculate penalties
  const penaltyResult = await calculatePenalties(userId, month);

  // Calculate totals
  const grossTotal = grossCommission + streakResult.bonus_amount + reviewResult.total_bonus;
  const penaltyAmount = grossTotal * (penaltyResult.total_percentage / 100);
  const netBeforeCap = qualifies ? grossTotal - penaltyAmount : 0;

  // Apply salary cap
  let finalAmount = netBeforeCap;
  let capApplied = false;
  if (monthlySalary && netBeforeCap > monthlySalary) {
    finalAmount = monthlySalary;
    capApplied = true;
  }

  const summary: IncentiveSummary = {
    gross_commission: grossCommission,
    streak_bonus: streakResult.bonus_amount,
    review_bonus: reviewResult.total_bonus,
    gross_total: grossTotal,
    total_penalty_percentage: penaltyResult.total_percentage,
    penalty_amount: penaltyAmount,
    net_before_cap: netBeforeCap,
    salary_cap: monthlySalary,
    cap_applied: capApplied,
    final_amount: finalAmount,
  };

  return {
    sales: salesBreakdown,
    streak: streakBreakdown,
    reviews: reviewBreakdown,
    penalties: penaltyResult.penalties,
    summary,
  };
}

/**
 * Save monthly incentive calculation to database
 */
export async function saveMonthlyIncentive(
  userId: string,
  month: string,
  breakdown: IncentiveBreakdown,
  status: 'calculating' | 'pending_review' = 'calculating'
): Promise<MonthlyIncentive | null> {
  // Get user info
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('organization_id, monthly_salary')
    .eq('id', userId)
    .single();

  if (!user) return null;

  const incentiveData = {
    user_id: userId,
    organization_id: user.organization_id,
    month,
    gross_commission: breakdown.summary.gross_commission,
    streak_bonus: breakdown.summary.streak_bonus,
    review_bonus: breakdown.summary.review_bonus,
    penalty_count: breakdown.penalties.length,
    penalty_percentage: breakdown.summary.total_penalty_percentage,
    penalty_amount: breakdown.summary.penalty_amount,
    net_incentive: breakdown.summary.net_before_cap,
    user_monthly_salary: breakdown.summary.salary_cap,
    salary_cap_applied: breakdown.summary.cap_applied,
    capped_amount: breakdown.summary.cap_applied ? breakdown.summary.final_amount : null,
    status,
    breakdown_json: breakdown,
    submitted_at: status === 'pending_review' ? new Date().toISOString() : null,
  };

  const { data, error } = await supabaseAdmin
    .from('monthly_incentives')
    .upsert(incentiveData, {
      onConflict: 'user_id,month',
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving monthly incentive:', error);
    return null;
  }

  return data;
}

// ================================================
// TEAM POOL CALCULATION
// ================================================

export interface TeamPoolResult {
  total_pool: number;
  performers: {
    rank: number;
    user_id: string;
    user_name: string;
    total_sales: number;
    percentage: number;
    amount: number;
  }[];
  manager: {
    user_id: string;
    user_name: string;
    percentage: number;
    amount: number;
  } | null;
  support_staff: {
    user_id: string;
    user_name: string;
    share: number;
    amount: number;
  }[];
  others: {
    user_id: string;
    user_name: string;
    share: number;
    amount: number;
  }[];
}

/**
 * Calculate team pool distribution for an organization
 */
export async function calculateTeamPool(
  organizationId: string,
  month: string,
  totalPoolAmount: number
): Promise<TeamPoolResult> {
  // Get all sales reps with their total sales for the month
  const { data: salesData } = await supabaseAdmin
    .from('leads')
    .select(`
      sales_rep_id,
      sale_price,
      users!inner (
        id,
        name,
        role,
        staff_type
      )
    `)
    .eq('organization_id', organizationId)
    .eq('status', 'win')
    .gte('created_at', `${month}-01`)
    .lt('created_at', getNextMonth(month));

  // Aggregate sales by user
  const salesByUser = new Map<string, { name: string; role: string; staff_type: string; total: number }>();
  (salesData || []).forEach((sale: any) => {
    const userId = sale.sales_rep_id;
    const existing = salesByUser.get(userId);
    if (existing) {
      existing.total += sale.sale_price || 0;
    } else {
      salesByUser.set(userId, {
        name: sale.users?.name || 'Unknown',
        role: sale.users?.role || 'sales_rep',
        staff_type: sale.users?.staff_type || 'sales',
        total: sale.sale_price || 0,
      });
    }
  });

  // Sort by total sales to find top performers
  const sortedUsers = Array.from(salesByUser.entries())
    .filter(([_, data]) => data.staff_type === 'sales')
    .sort((a, b) => b[1].total - a[1].total);

  // Calculate distribution
  const performers: TeamPoolResult['performers'] = [];
  const percentages = [20, 12, 8]; // Top 3 performers

  sortedUsers.slice(0, 3).forEach(([userId, data], index) => {
    performers.push({
      rank: index + 1,
      user_id: userId,
      user_name: data.name,
      total_sales: data.total,
      percentage: percentages[index],
      amount: totalPoolAmount * (percentages[index] / 100),
    });
  });

  // Find manager
  const managerEntry = Array.from(salesByUser.entries()).find(
    ([_, data]) => data.role === 'manager' || data.staff_type === 'manager'
  );
  const manager = managerEntry
    ? {
        user_id: managerEntry[0],
        user_name: managerEntry[1].name,
        percentage: 20,
        amount: totalPoolAmount * 0.2,
      }
    : null;

  // Support staff (20% split equally)
  const supportEntries = Array.from(salesByUser.entries()).filter(
    ([_, data]) => data.staff_type === 'support'
  );
  const supportAmount = totalPoolAmount * 0.2;
  const supportShare = supportEntries.length > 0 ? supportAmount / supportEntries.length : 0;
  const support_staff = supportEntries.map(([userId, data]) => ({
    user_id: userId,
    user_name: data.name,
    share: supportShare,
    amount: supportShare,
  }));

  // Others (remaining sales reps not in top 3, 20% split equally)
  const otherEntries = sortedUsers.slice(3);
  const othersAmount = totalPoolAmount * 0.2;
  const othersShare = otherEntries.length > 0 ? othersAmount / otherEntries.length : 0;
  const others = otherEntries.map(([userId, data]) => ({
    user_id: userId,
    user_name: data.name,
    share: othersShare,
    amount: othersShare,
  }));

  return {
    total_pool: totalPoolAmount,
    performers,
    manager,
    support_staff,
    others,
  };
}

// ================================================
// HELPER FUNCTIONS
// ================================================

/**
 * Get the next month in YYYY-MM format
 */
function getNextMonth(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
  const nextYear = monthNum === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

/**
 * Get current month in YYYY-MM format
 */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Update monthly target achieved amount from sales
 */
export async function updateMonthlyTargetProgress(
  userId: string,
  organizationId: string,
  month: string
): Promise<void> {
  // Calculate total sales for the month
  const { data: salesSum } = await supabaseAdmin
    .from('leads')
    .select('sale_price')
    .eq('sales_rep_id', userId)
    .eq('status', 'win')
    .gte('created_at', `${month}-01`)
    .lt('created_at', getNextMonth(month));

  const totalSales = (salesSum || []).reduce((sum, s) => sum + (s.sale_price || 0), 0);

  // Upsert monthly target
  await supabaseAdmin.from('monthly_targets').upsert(
    {
      user_id: userId,
      organization_id: organizationId,
      month,
      achieved_amount: totalSales,
    },
    {
      onConflict: 'user_id,month',
    }
  );
}
