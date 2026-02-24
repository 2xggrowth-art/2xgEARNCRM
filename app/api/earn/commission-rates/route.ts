import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse, UserRole, CommissionRate } from '@/lib/types';
import { checkPermission } from '@/lib/permissions';

/**
 * GET /api/earn/commission-rates
 * List commission rates for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const organizationId = request.headers.get('x-organization-id');

    if (!organizationId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: rates, error } = await supabaseAdmin
      .from('commission_rates')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('category_name');

    if (error) {
      console.error('Error fetching commission rates:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to fetch commission rates' },
        { status: 500 }
      );
    }

    return NextResponse.json<APIResponse<CommissionRate[]>>({
      success: true,
      data: rates || [],
    });
  } catch (error) {
    console.error('Commission rates GET error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/earn/commission-rates
 * Create or update a commission rate (manager+ only)
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
      category_name,
      category_id,
      commission_percentage,
      multiplier = 1.0,
      min_sale_price = 0,
      premium_threshold = 50000,
    } = body;

    // Validation
    if (!category_name) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      );
    }

    if (commission_percentage === undefined || commission_percentage < 0 || commission_percentage > 100) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Commission percentage must be between 0 and 100' },
        { status: 400 }
      );
    }

    if (multiplier < 1 || multiplier > 10) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Multiplier must be between 1 and 10' },
        { status: 400 }
      );
    }

    // Upsert the rate
    const { data: rate, error } = await supabaseAdmin
      .from('commission_rates')
      .upsert(
        {
          organization_id: organizationId,
          category_name,
          category_id: category_id || null,
          commission_percentage,
          multiplier,
          min_sale_price,
          premium_threshold,
          is_active: true,
        },
        {
          onConflict: 'organization_id,category_name',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error creating commission rate:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to create commission rate' },
        { status: 500 }
      );
    }

    return NextResponse.json<APIResponse<CommissionRate>>({
      success: true,
      data: rate,
      message: 'Commission rate saved successfully',
    });
  } catch (error) {
    console.error('Commission rates POST error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/earn/commission-rates
 * Update an existing commission rate (manager+ only)
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

    const check = checkPermission(userRole, 'approve_incentives');
    if (!check.authorized) {
      return NextResponse.json<APIResponse>(
        { success: false, error: check.error },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, commission_percentage, multiplier, min_sale_price, premium_threshold } = body;

    if (!id) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Rate ID is required' },
        { status: 400 }
      );
    }

    if (commission_percentage !== undefined && (commission_percentage < 0 || commission_percentage > 100)) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Commission percentage must be between 0 and 100' },
        { status: 400 }
      );
    }

    if (multiplier !== undefined && (multiplier < 1 || multiplier > 10)) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Multiplier must be between 1 and 10' },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {};
    if (commission_percentage !== undefined) updateData.commission_percentage = commission_percentage;
    if (multiplier !== undefined) updateData.multiplier = multiplier;
    if (min_sale_price !== undefined) updateData.min_sale_price = min_sale_price;
    if (premium_threshold !== undefined) updateData.premium_threshold = premium_threshold;

    const { data: rate, error } = await supabaseAdmin
      .from('commission_rates')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      console.error('Error updating commission rate:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to update commission rate' },
        { status: 500 }
      );
    }

    return NextResponse.json<APIResponse>({
      success: true,
      data: rate,
      message: 'Commission rate updated',
    });
  } catch (error) {
    console.error('Commission rates PUT error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/earn/commission-rates
 * Soft delete a commission rate (manager+ only)
 */
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const rateId = searchParams.get('id');

    if (!rateId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Rate ID is required' },
        { status: 400 }
      );
    }

    // Soft delete by setting is_active to false
    const { error } = await supabaseAdmin
      .from('commission_rates')
      .update({ is_active: false })
      .eq('id', rateId)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('Error deleting commission rate:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to delete commission rate' },
        { status: 500 }
      );
    }

    return NextResponse.json<APIResponse>({
      success: true,
      message: 'Commission rate deleted',
    });
  } catch (error) {
    console.error('Commission rates DELETE error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
