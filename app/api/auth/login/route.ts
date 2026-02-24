import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase';
import { generateToken, isValidPhone, isValidPIN, verifyPIN } from '@/lib/auth';
import { APIResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, pin } = body;

    // Validate inputs
    if (!phone || !isValidPhone(phone)) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    if (!pin || !isValidPIN(pin)) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'PIN must be 4 digits' },
        { status: 400 }
      );
    }

    // Find user by phone
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single();

    if (userError || !user) {
      logger.error('Login - user lookup failed:', { phone, userError: userError?.message });
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Invalid phone number or PIN' },
        { status: 401 }
      );
    }

    // Check if user has PIN set
    if (!user.pin_hash) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Account not set up. Please contact your administrator.' },
        { status: 401 }
      );
    }

    // Verify PIN
    const isPINValid = await verifyPIN(pin, user.pin_hash);

    if (!isPINValid) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Invalid phone number or PIN' },
        { status: 401 }
      );
    }

    // Update last login
    await supabaseAdmin
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      phone: user.phone,
      role: user.role,
      organizationId: user.organization_id,
    });

    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          organizationId: user.organization_id,
        },
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
