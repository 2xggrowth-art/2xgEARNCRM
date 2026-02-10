/**
 * Super Admin: Organization Management
 * GET  /api/super-admin/organizations - List all organizations
 * POST /api/super-admin/organizations - Create new organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requirePermission, apiResponse, getRequestBody } from '@/lib/middleware';


/**
 * GET - List all organizations (Super Admin only)
 */
export async function GET(request: NextRequest) {
  // Check permission
  const authCheck = requirePermission(request, 'view_all_organizations');
  if (!authCheck.authorized) {
    return authCheck.response!;
  }

  try {
    // Fetch all organizations with user count
    const { data: organizations, error } = await supabaseAdmin
      .from('organizations')
      .select(`
        id,
        name,
        logo_url,
        contact_number,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get user counts and manager details for each organization
    const orgsWithCounts = await Promise.all(
      (organizations || []).map(async (org) => {
        const { count: userCount } = await supabaseAdmin
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id);

        const { count: leadCount } = await supabaseAdmin
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id);

        // Get manager/admin details (register page assigns 'admin', create org assigns 'manager')
        const { data: manager } = await supabaseAdmin
          .from('users')
          .select('id, name, phone, role')
          .eq('organization_id', org.id)
          .in('role', ['manager', 'admin'])
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        return {
          ...org,
          userCount: userCount || 0,
          leadCount: leadCount || 0,
          manager: manager || null,
        };
      })
    );

    return apiResponse.success(orgsWithCounts);
  } catch (error: any) {
    console.error('Error fetching organizations:', error);
    return apiResponse.serverError(error.message);
  }
}

/**
 * POST - Create new organization (Super Admin only)
 */
export async function POST(request: NextRequest) {
  // Check permission
  const authCheck = requirePermission(request, 'manage_organizations');
  if (!authCheck.authorized) {
    return authCheck.response!;
  }

  const body = await getRequestBody<{
    name: string;
    contactNumber?: string;
    adminName: string;
    adminPhone: string;
    adminPin: string;
  }>(request);

  if (!body) {
    return apiResponse.error('Invalid request body');
  }

  const { name, contactNumber, adminName, adminPhone, adminPin } = body;

  // Validation
  if (!name || !adminName || !adminPhone || !adminPin) {
    return apiResponse.error('Missing required fields');
  }

  if (!/^[0-9]{10}$/.test(adminPhone)) {
    return apiResponse.error('Invalid phone number format');
  }

  if (!/^[0-9]{4}$/.test(adminPin)) {
    return apiResponse.error('PIN must be 4 digits');
  }

  try {
    // Check if phone already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', adminPhone)
      .single();

    if (existingUser) {
      return apiResponse.error('Phone number already registered');
    }

    // Create organization
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name,
        contact_number: contactNumber || null,
      })
      .select()
      .single();

    if (orgError) throw orgError;

    // Hash PIN
    const bcrypt = require('bcryptjs');
    const pinHash = await bcrypt.hash(adminPin, 10);

    // Create manager user for the organization
    const { data: adminUser, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        phone: adminPhone,
        name: adminName,
        role: 'manager',
        organization_id: organization.id,
        pin_hash: pinHash,
      })
      .select()
      .single();

    if (userError) {
      // Rollback: delete organization
      await supabaseAdmin.from('organizations').delete().eq('id', organization.id);
      throw userError;
    }

    // Create default categories
    const defaultCategories = [
      'Electric',
      'Geared',
      'Premium Geared',
      'Single Speed',
      'Kids',
    ];

    const { error: categoryError } = await supabaseAdmin.from('categories').insert(
      defaultCategories.map((categoryName) => ({
        organization_id: organization.id,
        name: categoryName,
      }))
    );

    if (categoryError) {
      console.error('Error creating categories:', categoryError);
      // Non-critical, continue
    }

    return apiResponse.success(
      {
        organization,
        adminUser: {
          id: adminUser.id,
          name: adminUser.name,
          phone: adminUser.phone,
          role: adminUser.role,
        },
      },
      'Organization created successfully'
    );
  } catch (error: any) {
    console.error('Error creating organization:', error);
    return apiResponse.serverError(error.message);
  }
}

/**
 * DELETE - Delete an organization and all its data (Super Admin only)
 */
export async function DELETE(request: NextRequest) {
  const authCheck = requirePermission(request, 'manage_organizations');
  if (!authCheck.authorized) {
    return authCheck.response!;
  }

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('id');

  if (!orgId) {
    return apiResponse.error('Organization ID is required');
  }

  try {
    // Verify organization exists
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .eq('id', orgId)
      .single();

    if (orgError || !org) {
      return apiResponse.error('Organization not found');
    }

    // All child tables have ON DELETE CASCADE, so deleting the org cascades everything
    const { error: deleteError } = await supabaseAdmin
      .from('organizations')
      .delete()
      .eq('id', orgId);

    if (deleteError) throw deleteError;

    return apiResponse.success(null, `Organization "${org.name}" deleted successfully`);
  } catch (error: any) {
    console.error('Error deleting organization:', error);
    return apiResponse.serverError(error.message);
  }
}
