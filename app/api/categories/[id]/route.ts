import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse } from '@/lib/types';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organizationId = request.headers.get('x-organization-id');
    const userRole = request.headers.get('x-user-role');

    if (!organizationId || userRole !== 'admin') {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: categoryId } = await params;

    // Check if the category belongs to this organization
    const { data: category, error: fetchError } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('id', categoryId)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !category) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    // Delete the category
    const { error: deleteError } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (deleteError) {
      console.error('Error deleting category:', deleteError);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to delete category' },
        { status: 500 }
      );
    }

    return NextResponse.json<APIResponse>({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
