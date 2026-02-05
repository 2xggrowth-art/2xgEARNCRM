import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse, UserRole, Penalty, PenaltyType, PENALTY_PERCENTAGES } from '@/lib/types';
import { checkPermission } from '@/lib/permissions';
import { calculatePenaltyPercentage, getCurrentMonth } from '@/lib/incentive-calculator';

/**
 * GET /api/earn/penalties
 * List penalties for a user/month
 * Query params: user_id (optional), month (optional), status (optional)
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
    const targetUserId = searchParams.get('user_id');
    const month = searchParams.get('month');
    const status = searchParams.get('status');

    // Build query
    let query = supabaseAdmin
      .from('penalties')
      .select(`
        *,
        users!penalties_user_id_fkey (name),
        created_by_user:users!penalties_created_by_fkey (name)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    // Filter by user
    if (targetUserId) {
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
      query = query.eq('user_id', targetUserId);
    } else {
      // If not a manager, only show own penalties
      if (userRole === 'sales_rep' || userRole === 'staff') {
        query = query.eq('user_id', userId);
      }
    }

    if (month) {
      query = query.eq('month', month);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: penalties, error } = await query;

    if (error) {
      console.error('Error fetching penalties:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to fetch penalties' },
        { status: 500 }
      );
    }

    // Transform data
    const transformedPenalties = (penalties || []).map((p: any) => ({
      ...p,
      user_name: p.users?.name,
      created_by_name: p.created_by_user?.name,
    }));

    return NextResponse.json<APIResponse>({
      success: true,
      data: transformedPenalties,
    });
  } catch (error) {
    console.error('Penalties GET error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/earn/penalties
 * Create a new penalty (manager+ only)
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
    const {
      user_id: targetUserId,
      penalty_type,
      description,
      incident_date,
      related_lead_id,
      value, // For calculated penalties like low_compliance
    } = body;

    // Validation
    if (!targetUserId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const validPenaltyTypes: PenaltyType[] = [
      'late_arrival',
      'unauthorized_absence',
      'back_to_back_offs',
      'low_compliance',
      'high_error_rate',
      'non_escalated_lost_lead',
      'missing_documentation',
      'low_team_eval',
      'client_disrespect',
    ];

    if (!penalty_type || !validPenaltyTypes.includes(penalty_type)) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Invalid penalty type' },
        { status: 400 }
      );
    }

    // Calculate penalty percentage
    const penaltyPercentage = calculatePenaltyPercentage(penalty_type as PenaltyType, value);

    if (penaltyPercentage <= 0) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Calculated penalty percentage is zero or negative' },
        { status: 400 }
      );
    }

    // Determine month
    const month = incident_date
      ? incident_date.substring(0, 7)
      : getCurrentMonth();

    // Create the penalty
    const { data: penalty, error } = await supabaseAdmin
      .from('penalties')
      .insert({
        user_id: targetUserId,
        organization_id: organizationId,
        month,
        penalty_type,
        penalty_percentage: penaltyPercentage,
        description,
        incident_date,
        related_lead_id,
        status: 'active',
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating penalty:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to create penalty' },
        { status: 500 }
      );
    }

    return NextResponse.json<APIResponse>({
      success: true,
      data: penalty,
      message: `Penalty created: ${penaltyPercentage}% deduction`,
    });
  } catch (error) {
    console.error('Penalties POST error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
