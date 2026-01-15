import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase';
import { isValidPIN, hashPIN } from '@/lib/auth';
import { APIResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const organizationId = request.headers.get('x-organization-id');
    const userRole = request.headers.get('x-user-role');

    // Only admins can reset PINs
    if (!organizationId || (userRole !== 'admin' && userRole !== 'manager')) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, newPin } = body;

    // Validate PIN
    if (!newPin || !isValidPIN(newPin)) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'PIN must be 4 digits' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Verify the user belongs to the same organization
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, organization_id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.organization_id !== organizationId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Unauthorized - user not in your organization' },
        { status: 403 }
      );
    }

    // Hash the new PIN
    const pinHash = await hashPIN(newPin);

    // Update the user's PIN
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ pin_hash: pinHash })
      .eq('id', userId);

    if (updateError) {
      logger.error('Error updating PIN:', updateError);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to update PIN' },
        { status: 500 }
      );
    }

    return NextResponse.json<APIResponse>({
      success: true,
      message: 'PIN reset successfully',
    });
  } catch (error) {
    logger.error('Reset PIN error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
