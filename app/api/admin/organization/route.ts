import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const organizationId = request.headers.get('x-organization-id');

    // Allow both admin and sales_rep to read organization data
    if (!organizationId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: organization, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (error) {
      logger.error('Error fetching organization:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to fetch organization' },
        { status: 500 }
      );
    }

    return NextResponse.json<APIResponse>({
      success: true,
      data: organization,
    });
  } catch (error) {
    logger.error('Get organization error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const organizationId = request.headers.get('x-organization-id');
    const userRole = request.headers.get('x-user-role');

    if (!organizationId || (userRole !== 'admin' && userRole !== 'manager')) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, contactNumber, logoUrl, googleReviewQrUrl } = body;

    const updateData: any = {};

    if (name) updateData.name = name.trim();
    if (contactNumber !== undefined) updateData.contact_number = contactNumber;
    if (logoUrl !== undefined) updateData.logo_url = logoUrl;
    if (googleReviewQrUrl !== undefined) updateData.google_review_qr_url = googleReviewQrUrl;

    const { data: organization, error } = await supabaseAdmin
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating organization:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to update organization' },
        { status: 500 }
      );
    }

    return NextResponse.json<APIResponse>({
      success: true,
      message: 'Organization updated successfully',
      data: organization,
    });
  } catch (error) {
    logger.error('Update organization error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
