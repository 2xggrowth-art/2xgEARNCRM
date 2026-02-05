import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse, UserRole } from '@/lib/types';
import { checkPermission } from '@/lib/permissions';

/**
 * POST /api/earn/commission-rates/seed
 * Seed default commission rates for an organization (manager+ only)
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

    // Default commission rates based on 2XG Earn specification
    const defaultRates = [
      // Kids: 1.0%
      {
        organization_id: organizationId,
        category_name: 'Kids',
        commission_percentage: 1.0,
        multiplier: 1.0,
        premium_threshold: 50000,
        is_active: true,
      },
      // Single Speed: 0.8%
      {
        organization_id: organizationId,
        category_name: 'Single Speed',
        commission_percentage: 0.8,
        multiplier: 1.0,
        premium_threshold: 50000,
        is_active: true,
      },
      // Geared: 0.8%
      {
        organization_id: organizationId,
        category_name: 'Geared',
        commission_percentage: 0.8,
        multiplier: 1.0,
        premium_threshold: 50000,
        is_active: true,
      },
      // 2nd Hand: 0.8%
      {
        organization_id: organizationId,
        category_name: '2nd Hand',
        commission_percentage: 0.8,
        multiplier: 1.0,
        premium_threshold: 50000,
        is_active: true,
      },
      // Services: 0.8%
      {
        organization_id: organizationId,
        category_name: 'Services',
        commission_percentage: 0.8,
        multiplier: 1.0,
        premium_threshold: 50000,
        is_active: true,
      },
      // Premium: 0.7% with 1.5x multiplier for sales >= 50k
      {
        organization_id: organizationId,
        category_name: 'Premium',
        commission_percentage: 0.7,
        multiplier: 1.5,
        premium_threshold: 50000,
        is_active: true,
      },
      // Electric: 0.7% with 1.5x multiplier for sales >= 50k
      {
        organization_id: organizationId,
        category_name: 'Electric',
        commission_percentage: 0.7,
        multiplier: 1.5,
        premium_threshold: 50000,
        is_active: true,
      },
      // Default fallback: 0.8%
      {
        organization_id: organizationId,
        category_name: 'Default',
        commission_percentage: 0.8,
        multiplier: 1.0,
        premium_threshold: 50000,
        is_active: true,
      },
    ];

    // Upsert all rates
    const { data: rates, error } = await supabaseAdmin
      .from('commission_rates')
      .upsert(defaultRates, {
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
      data: rates,
      message: `Seeded ${rates?.length || 0} commission rates`,
    });
  } catch (error) {
    console.error('Seed commission rates error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
