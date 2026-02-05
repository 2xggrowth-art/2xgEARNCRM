/**
 * Manager: Assign Team Member to Manager
 * POST /api/manager/team/assign - Assign staff/sales_rep to a manager
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  requirePermission,
  apiResponse,
  getRequestBody,
  getUserFromRequest,
} from '@/lib/middleware';


export async function POST(request: NextRequest) {
  // Check permission
  const authCheck = requirePermission(request, 'manage_team');
  if (!authCheck.authorized) {
    return authCheck.response!;
  }

  const user = authCheck.user!;

  const body = await getRequestBody<{
    userId: string;
    managerId: string;
  }>(request);

  if (!body) {
    return apiResponse.error('Invalid request body');
  }

  const { userId, managerId } = body;

  if (!userId || !managerId) {
    return apiResponse.error('Missing userId or managerId');
  }

  try {
    // Verify the user exists and is in the same organization
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, role, organization_id')
      .eq('id', userId)
      .single();

    if (userError || !targetUser) {
      return apiResponse.error('User not found');
    }

    // Verify the manager exists and is a manager role
    const { data: manager, error: managerError } = await supabaseAdmin
      .from('users')
      .select('id, role, organization_id')
      .eq('id', managerId)
      .single();

    if (managerError || !manager) {
      return apiResponse.error('Manager not found');
    }

    if (manager.role !== 'manager') {
      return apiResponse.error('Target user is not a manager');
    }

    // Verify same organization (unless super_admin)
    if (user.role !== 'super_admin') {
      if (targetUser.organization_id !== user.organizationId ||
          manager.organization_id !== user.organizationId) {
        return apiResponse.forbidden('Cannot assign users from different organizations');
      }
    }

    // Verify user role is staff or sales_rep
    if (targetUser.role !== 'staff' && targetUser.role !== 'sales_rep') {
      return apiResponse.error('Can only assign staff or sales_rep roles to managers');
    }

    // Assign manager
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ manager_id: managerId })
      .eq('id', userId);

    if (updateError) throw updateError;

    return apiResponse.success(
      { userId, managerId },
      'Manager assigned successfully'
    );
  } catch (error: any) {
    console.error('Error assigning manager:', error);
    return apiResponse.serverError(error.message);
  }
}
