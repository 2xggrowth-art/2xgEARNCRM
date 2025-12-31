import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isValidPhone, isValidName, generateOTP, getOTPExpiry } from '@/lib/auth';
import { APIResponse } from '@/lib/types';
import { sendSMS, formatInviteMessage } from '@/lib/sms';

// Get all team members
export async function GET(request: NextRequest) {
  try {
    const organizationId = request.headers.get('x-organization-id');
    const userRole = request.headers.get('x-user-role');

    if (!organizationId || userRole !== 'admin') {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, name, phone, role, created_at, last_login')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching team:', error);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to fetch team members' },
        { status: 500 }
      );
    }

    return NextResponse.json<APIResponse>({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('Get team error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Add new team member (send invite OTP)
export async function POST(request: NextRequest) {
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
    const { phone, name } = body;

    // Validation
    if (!phone || !isValidPhone(phone)) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    if (!name || !isValidName(name)) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Name must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', phone)
      .single();

    if (existingUser) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'User with this phone number already exists' },
        { status: 400 }
      );
    }

    // Create user directly as sales rep (no OTP needed for admin-added users)
    const { data: newUser, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        phone,
        name: name.trim(),
        role: 'sales_rep',
        organization_id: organizationId,
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user:', userError);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Generate OTP for first login
    const otp = generateOTP();
    const expiresAt = getOTPExpiry();

    await supabaseAdmin.from('otp_verifications').insert({
      phone,
      otp,
      expires_at: expiresAt.toISOString(),
      verified: false,
    });

    // Send SMS with OTP to the new user
    const smsResult = await sendSMS(phone, formatInviteMessage(name, otp));

    if (!smsResult.success) {
      console.error('SMS sending failed:', smsResult.error);
      // Don't fail the request - admin can share OTP manually
    }

    return NextResponse.json<APIResponse>({
      success: true,
      message: 'Sales rep added successfully. OTP sent to their phone.',
      data: {
        user: newUser,
        // For development only
        otp: process.env.NODE_ENV === 'development' ? otp : undefined,
      },
    });
  } catch (error) {
    console.error('Add team member error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
