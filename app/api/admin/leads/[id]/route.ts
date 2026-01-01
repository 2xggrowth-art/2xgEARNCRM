import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const organizationId = request.headers.get('x-organization-id');
    const userRole = request.headers.get('x-user-role');

    // Verify admin role
    if (userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Only admins can delete leads.' },
        { status: 403 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID not found' },
        { status: 400 }
      );
    }

    // Verify the lead belongs to the admin's organization before deleting
    const { data: lead, error: fetchError } = await supabaseAdmin
      .from('leads')
      .select('id, organization_id')
      .eq('id', leadId)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found or access denied' },
        { status: 404 }
      );
    }

    // Delete the lead
    const { error: deleteError } = await supabaseAdmin
      .from('leads')
      .delete()
      .eq('id', leadId)
      .eq('organization_id', organizationId);

    if (deleteError) {
      console.error('Error deleting lead:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete lead' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Lead deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/admin/leads/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
