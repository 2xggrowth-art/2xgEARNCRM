import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateOTP, getOTPExpiry, isValidPhone } from '@/lib/auth';
import { APIResponse } from '@/lib/types';
import { sendSMS, formatOTPMessage } from '@/lib/sms';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;

    // Validate phone number
    if (!phone || !isValidPhone(phone)) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Invalid phone number. Must be 10 digits.' },
        { status: 400 }
      );
    }

    // Rate limiting: Check if too many OTP requests from this phone
    const { data: recentOTPs } = await supabaseAdmin
      .from('otp_verifications')
      .select('created_at')
      .eq('phone', phone)
      .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (recentOTPs && recentOTPs.length >= 3) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Too many OTP requests. Please try again after 15 minutes.' },
        { status: 429 }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = getOTPExpiry();

    // Store OTP in database
    const { error: insertError } = await supabaseAdmin
      .from('otp_verifications')
      .insert({
        phone,
        otp,
        expires_at: expiresAt.toISOString(),
        verified: false,
      });

    if (insertError) {
      console.error('Error storing OTP:', insertError);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to generate OTP. Please try again.' },
        { status: 500 }
      );
    }

    // Send OTP via SMS
    const smsResult = await sendSMS(phone, formatOTPMessage(otp));

    if (!smsResult.success) {
      console.error('SMS sending failed:', smsResult.error);
      // Don't fail the request - still allow OTP to be used
    }

    return NextResponse.json<APIResponse>({
      success: true,
      message: 'OTP sent successfully',
      data: {
        phone,
        expiresAt: expiresAt.toISOString(),
        // For development only - remove in production
        otp: process.env.NODE_ENV === 'development' ? otp : undefined,
      },
    });
  } catch (error) {
    console.error('Request OTP error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
