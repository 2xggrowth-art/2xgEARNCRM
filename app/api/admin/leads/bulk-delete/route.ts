import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const organizationId = request.headers.get('x-organization-id');
    const userRole = request.headers.get('x-user-role');

    // Verify admin role
    if (userRole !== 'admin' && userRole !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Only admins can bulk delete leads.' },
        { status: 403 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID not found' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { leadIds } = body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No lead IDs provided' },
        { status: 400 }
      );
    }

    // Verify all leads belong to the admin's organization
    const { data: leadsToDelete, error: fetchError } = await supabaseAdmin
      .from('leads')
      .select('id, organization_id')
      .in('id', leadIds)
      .eq('organization_id', organizationId);

    if (fetchError) {
      logger.error('Error fetching leads for verification:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to verify leads' },
        { status: 500 }
      );
    }

    if (!leadsToDelete || leadsToDelete.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid leads found for deletion' },
        { status: 404 }
      );
    }

    // Check if all requested leads belong to the organization
    if (leadsToDelete.length !== leadIds.length) {
      return NextResponse.json(
        { success: false, error: 'Some leads do not belong to your organization' },
        { status: 403 }
      );
    }

    // Delete the leads
    const { error: deleteError } = await supabaseAdmin
      .from('leads')
      .delete()
      .in('id', leadIds)
      .eq('organization_id', organizationId);

    if (deleteError) {
      logger.error('Error bulk deleting leads:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete leads' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${leadIds.length} lead(s)`,
      deletedCount: leadIds.length,
    });
  } catch (error) {
    logger.error('Error in POST /api/admin/leads/bulk-delete:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
