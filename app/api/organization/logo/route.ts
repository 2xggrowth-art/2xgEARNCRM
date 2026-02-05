import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { APIResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const organizationId = request.headers.get('x-organization-id');

    // If no organization ID is provided, try to get the first organization's logo
    let query = supabaseAdmin.from('organizations').select('logo_url');

    if (organizationId) {
      query = query.eq('id', organizationId).limit(1);
    } else {
      console.log('⚠️ No organization ID provided, fetching first organization logo');
      query = query.limit(1);
    }

    const { data: organizations, error } = await query;

    if (error) {
      console.error('Error fetching organization logo:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to fetch logo' },
        { status: 500 }
      );
    }

    // Get the first organization from the array
    const organization = organizations && organizations.length > 0 ? organizations[0] : null;

    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        logo_url: organization?.logo_url || null,
      },
    });
  } catch (error) {
    console.error('Get logo error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
