import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse } from '@/lib/types';

export async function PUT(request: NextRequest) {
  try {
    const organizationId = request.headers.get('x-organization-id');
    const userRole = request.headers.get('x-user-role');

    if (!organizationId || userRole !== 'admin') {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { categoryOrders } = body;

    // Validate input
    if (!Array.isArray(categoryOrders)) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Invalid request: categoryOrders must be an array' },
        { status: 400 }
      );
    }

    // Update each category's display_order
    const updatePromises = categoryOrders.map(
      (item: { id: string; display_order: number }) => {
        return supabaseAdmin
          .from('categories')
          .update({ display_order: item.display_order })
          .eq('id', item.id)
          .eq('organization_id', organizationId);
      }
    );

    const results = await Promise.all(updatePromises);

    // Check for errors
    const errors = results.filter((result) => result.error);
    if (errors.length > 0) {
      console.error('Error updating category orders:', errors);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to update category order' },
        { status: 500 }
      );
    }

    return NextResponse.json<APIResponse>({
      success: true,
      message: 'Category order updated successfully',
    });
  } catch (error) {
    console.error('Reorder categories error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
