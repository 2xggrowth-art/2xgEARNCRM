import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase';
import { generateToken, isValidPhone, isValidName, isValidPIN, hashPIN } from '@/lib/auth';
import { APIResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, name, organizationName, pin } = body;

    // Validate inputs
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

    // Validate organization name is provided
    if (!organizationName) {
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Organization name is required' },
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
        { success: false, error: 'User already exists' },
        { status: 400 }
      );
    }

    // Create new organization
    const { data: newOrg, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({ name: organizationName })
      .select()
      .single();

    if (orgError || !newOrg) {
      logger.error('Error creating organization:', orgError);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to create organization' },
        { status: 500 }
      );
    }

    // Create default categories for the new organization
    const defaultCategories = [
      'Electric',
      'Geared',
      'Premium Geared',
      'Single Speed',
      'Kids',
    ];

    const categoriesData = defaultCategories.map((categoryName) => ({
      organization_id: newOrg.id,
      name: categoryName,
    }));

    await supabaseAdmin.from('categories').insert(categoriesData);

    // Hash the PIN
    const pinHash = await hashPIN(pin);

    // Create admin user with PIN
    const { data: newUser, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        phone,
        name,
        role: 'admin',
        organization_id: newOrg.id,
        pin_hash: pinHash,
        last_login: new Date().toISOString(),
      })
      .select()
      .single();

    if (userError || !newUser) {
      logger.error('Error creating user:', userError);
      return NextResponse.json<APIResponse>(
        { success: false, error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Generate JWT token
    const token = generateToken({
      userId: newUser.id,
      phone: newUser.phone,
      role: newUser.role,
      organizationId: newUser.organization_id,
    });

    return NextResponse.json<APIResponse>({
      success: true,
      message: 'Registration successful',
      data: {
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          phone: newUser.phone,
          role: newUser.role,
          organizationId: newUser.organization_id,
        },
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
