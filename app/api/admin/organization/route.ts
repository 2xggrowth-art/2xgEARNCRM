import { NextRequest, NextResponse } from 'next/server';
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
      console.error('Error fetching organization:', error);
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
    console.error('Get organization error:', error);
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

    if (!organizationId || userRole !== 'admin') {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, whatsappPhoneNumberId, whatsappAccessToken, contactNumber, logoUrl, googleReviewQrUrl } = body;

    const updateData: any = {};

    if (name) updateData.name = name.trim();
    if (contactNumber !== undefined) updateData.contact_number = contactNumber;
    if (whatsappPhoneNumberId !== undefined)
      updateData.whatsapp_phone_number_id = whatsappPhoneNumberId;
    if (whatsappAccessToken !== undefined)
      updateData.whatsapp_access_token = whatsappAccessToken;
    if (logoUrl !== undefined) updateData.logo_url = logoUrl;
    if (googleReviewQrUrl !== undefined) updateData.google_review_qr_url = googleReviewQrUrl;

    const { data: organization, error } = await supabaseAdmin
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)
      .select()
      .single();

    if (error) {
      console.error('Error updating organization:', error);
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
    console.error('Update organization error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
