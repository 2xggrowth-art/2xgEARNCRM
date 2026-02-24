import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse, UserRole } from '@/lib/types';
import { checkPermission } from '@/lib/permissions';

// Default commission config per category name (used when seeding)
// Categories not listed here get the fallback 0.8% / 1.0x
const CATEGORY_COMMISSION_DEFAULTS: Record<string, { percentage: number; multiplier: number }> = {
  'Electric': { percentage: 0.7, multiplier: 1.5 },
  'Premium Geared': { percentage: 0.7, multiplier: 1.5 },
  'Kids': { percentage: 1.0, multiplier: 1.0 },
};
const FALLBACK_PERCENTAGE = 0.8;
const FALLBACK_MULTIPLIER = 1.0;
const DEFAULT_PREMIUM_THRESHOLD = 50000;

/**
 * POST /api/earn/commission-rates/seed
 * Seed commission rates based on the ACTUAL categories in the organization.
 * Creates one commission rate per category + a "Default" fallback.
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

    // Fetch actual categories for this organization
    const { data: categories, error: catError } = await supabaseAdmin
      .from('categories')
      .select('id, name')
      .eq('organization_id', organizationId)
      .order('display_order');

    if (catError) {
      console.error('Error fetching categories:', catError);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to fetch categories' },
        { status: 500 }
      );
    }

    // Build commission rates from actual categories
    const rates = (categories || []).map((cat) => {
      const defaults = CATEGORY_COMMISSION_DEFAULTS[cat.name];
      return {
        organization_id: organizationId,
        category_name: cat.name,
        category_id: cat.id,
        commission_percentage: defaults?.percentage ?? FALLBACK_PERCENTAGE,
        multiplier: defaults?.multiplier ?? FALLBACK_MULTIPLIER,
        premium_threshold: DEFAULT_PREMIUM_THRESHOLD,
        is_active: true,
      };
    });

    // Always add a Default fallback rate (no category_id)
    rates.push({
      organization_id: organizationId,
      category_name: 'Default',
      category_id: null as any,
      commission_percentage: FALLBACK_PERCENTAGE,
      multiplier: FALLBACK_MULTIPLIER,
      premium_threshold: DEFAULT_PREMIUM_THRESHOLD,
      is_active: true,
    });

    // Upsert all rates
    const { data: savedRates, error } = await supabaseAdmin
      .from('commission_rates')
      .upsert(rates, {
        onConflict: 'organization_id,category_name',
      })
      .select();

    if (error) {
      console.error('Error seeding commission rates:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to seed commission rates' },
        { status: 500 }
      );
    }

    return NextResponse.json<APIResponse>({
      success: true,
      data: savedRates,
      message: `Seeded ${savedRates?.length || 0} commission rates from ${categories?.length || 0} categories`,
    });
  } catch (error) {
    console.error('Seed commission rates error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
