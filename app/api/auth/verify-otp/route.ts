import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase';
import { generateToken, isValidPhone } from '@/lib/auth';
import { APIResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, otp } = body;

    // Validate inputs
    if (!phone || !isValidPhone(phone)) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    if (!otp || otp.length !== 6) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Invalid OTP' },
        { status: 400 }
      );
    }

    // Find the most recent non-verified OTP for this phone
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from('otp_verifications')
      .select('*')
      .eq('phone', phone)
      .eq('otp', otp)
      .eq('verified', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRecord) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    // Mark OTP as verified
    await supabaseAdmin
      .from('otp_verifications')
      .update({ verified: true })
      .eq('id', otpRecord.id);

    // Check if user exists
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single();

    if (userError || !user) {
      // User doesn't exist - needs registration
      return NextResponse.json<APIResponse>({
        success: true,
        data: {
          requiresRegistration: true,
          phone,
        },
      });
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
        requiresRegistration: false,
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
    logger.error('Verify OTP error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
