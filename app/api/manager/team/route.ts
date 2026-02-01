/**
 * Manager: Team Management
 * GET  /api/manager/team - Get manager's team members
 * POST /api/manager/team - Add new team member (staff/sales_rep)
 */

import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import {
  requirePermission,
  apiResponse,
  getRequestBody,
  getUserFromRequest,
} from '@/lib/middleware';
import { hashPIN, isValidPhone, isValidPIN, isValidName } from '@/lib/auth';
import { canCreateUserWithRole, requiresManager } from '@/lib/permissions';
import { supabaseAdmin as supabase } from '@/lib/supabase';

/**
 * GET - Get manager's team members
 */
export async function GET(request: NextRequest) {
  // Check permission
  const authCheck = requirePermission(request, 'manage_team');
  if (!authCheck.authorized) {
    return authCheck.response!;
  }

  const user = authCheck.user!;

  try {
    // Get all team members managed by this user
    const { data: teamMembers, error } = await supabase
      .from('users')
      .select('id, name, phone, role, created_at, last_login')
      .eq('manager_id', user.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get lead counts for each team member
    const teamWithStats = await Promise.all(
      (teamMembers || []).map(async (member) => {
        const { count: totalLeads } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('sales_rep_id', member.id);

        const { count: winCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('sales_rep_id', member.id)
          .eq('status', 'win');

        const { data: revenueData } = await supabase
          .from('leads')
          .select('sale_price')
          .eq('sales_rep_id', member.id)
          .eq('status', 'win');

        const revenue = revenueData?.reduce(
          (sum, lead) => sum + (parseFloat(lead.sale_price) || 0),
          0
        ) || 0;

        return {
          ...member,
          stats: {
            totalLeads: totalLeads || 0,
            winCount: winCount || 0,
            revenue,
            conversionRate:
              totalLeads && totalLeads > 0
                ? Math.round(((winCount || 0) / totalLeads) * 100)
                : 0,
          },
        };
      })
    );

    return apiResponse.success(teamWithStats);
  } catch (error: any) {
    logger.error('Error fetching team:', error);
    return apiResponse.serverError(error.message);
  }
}

/**
 * POST - Add new team member
 */
export async function POST(request: NextRequest) {
  // Check permission
  const authCheck = requirePermission(request, 'manage_team');
  if (!authCheck.authorized) {
    return authCheck.response!;
  }

  const user = authCheck.user!;

  const body = await getRequestBody<{
    name: string;
    phone: string;
    role: 'staff' | 'sales_rep';
    pin: string;
  }>(request);

  if (!body) {
    return apiResponse.error('Invalid request body');
  }

  const { name, phone, role, pin } = body;

  // Validation
  if (!isValidName(name)) {
    return apiResponse.error('Invalid name. Must be at least 2 characters.');
  }

  if (!isValidPhone(phone)) {
    return apiResponse.error('Invalid phone number. Must be 10 digits.');
  }

  if (!isValidPIN(pin)) {
    return apiResponse.error('Invalid PIN. Must be 4 digits.');
  }

  if (!role || (role !== 'staff' && role !== 'sales_rep')) {
    return apiResponse.error('Invalid role. Must be staff or sales_rep.');
  }

  // Check if manager can create this role
  if (!canCreateUserWithRole(user.role, role)) {
    return apiResponse.forbidden(
      'You do not have permission to create users with this role'
    );
  }

  try {
    // Check if phone already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .single();

    if (existingUser) {
      return apiResponse.error('Phone number already registered');
    }

    // Hash PIN
    const pinHash = await hashPIN(pin);

    // Create user
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        phone,
        name,
        role,
        organization_id: user.organizationId,
        manager_id: user.userId, // Assign current manager
        pin_hash: pinHash,
      })
      .select('id, name, phone, role, created_at')
      .single();

    if (userError) throw userError;

    return apiResponse.success(
      newUser,
      `${role === 'staff' ? 'Staff' : 'Sales Rep'} added successfully`
    );
  } catch (error: any) {
    logger.error('Error adding team member:', error);
    return apiResponse.serverError(error.message);
  }
}
