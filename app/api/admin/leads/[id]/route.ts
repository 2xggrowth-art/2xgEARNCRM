import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const organizationId = request.headers.get('x-organization-id');
    const userRole = request.headers.get('x-user-role');

    // Verify admin role
    if (userRole !== 'admin' && userRole !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Only admins can update incentives.' },
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
    const { has_incentive, incentive_amount } = body;

    // Verify the lead belongs to the admin's organization
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

    // Prepare update data
    const updateData: any = {
      has_incentive,
      updated_at: new Date().toISOString(),
    };

    // If has_incentive is true, set the amount, otherwise clear it
    if (has_incentive === true && incentive_amount !== undefined) {
      updateData.incentive_amount = incentive_amount;
    } else if (has_incentive === false) {
      updateData.incentive_amount = null;
    }

    // Update the lead
    const { data: updatedLead, error: updateError } = await supabaseAdmin
      .from('leads')
      .update(updateData)
      .eq('id', leadId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating lead incentive:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update incentive' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Incentive updated successfully',
      data: updatedLead,
    });
  } catch (error) {
    logger.error('Error in PATCH /api/admin/leads/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const organizationId = request.headers.get('x-organization-id');
    const userRole = request.headers.get('x-user-role');

    // Verify admin role
    if (userRole !== 'admin' && userRole !== 'manager') {
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
      logger.error('Error deleting lead:', deleteError);
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
    logger.error('Error in DELETE /api/admin/leads/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
