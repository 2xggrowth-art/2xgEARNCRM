import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isValidPhone, isValidName, isValidPIN, hashPIN } from '@/lib/auth';
import { APIResponse } from '@/lib/types';

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

    console.log('Team API - Headers:', {
      organizationId,
      userRole,
      allHeaders: Object.fromEntries(request.headers.entries()),
    });

    if (!organizationId || userRole !== 'admin') {
      console.error('Team API - Unauthorized:', { organizationId, userRole });
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Unauthorized - Missing organization or not admin' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { phone, name, pin } = body;

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

    if (!pin || !isValidPIN(pin)) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'PIN must be 4 digits' },
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

    // Hash the PIN
    const pinHash = await hashPIN(pin);

    // Create user with PIN
    const { data: newUser, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        phone,
        name: name.trim(),
        role: 'sales_rep',
        organization_id: organizationId,
        pin_hash: pinHash,
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

    return NextResponse.json<APIResponse>({
      success: true,
      message: 'Sales rep added successfully. They can now login with their phone and PIN.',
      data: {
        user: {
          id: newUser.id,
          name: newUser.name,
          phone: newUser.phone,
          role: newUser.role,
        },
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
