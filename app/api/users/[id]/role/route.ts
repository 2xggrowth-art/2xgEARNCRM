/**
 * Update User Role
 * PUT /api/users/[id]/role - Update a user's role
 */

import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { apiResponse, getRequestBody, getUserFromRequest } from '@/lib/middleware';
import { UserRole } from '@/lib/types';
import { canManageUser } from '@/lib/permissions';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);

  if (!user) {
    return apiResponse.unauthorized();
  }

  // Await params in Next.js 16
  const { id: userId } = await params;

  const body = await getRequestBody<{
    role: UserRole;
  }>(request);

  if (!body || !body.role) {
    return apiResponse.error('Missing role in request body');
  }

  const newRole = body.role as UserRole;

  // Validate role
  const validRoles = ['super_admin', 'manager', 'staff', 'sales_rep'] as const;
  if (!validRoles.includes(newRole)) {
    return apiResponse.error('Invalid role');
  }

  try {
    // Get target user
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('id, role, organization_id')
      .eq('id', userId)
      .single();

    if (fetchError || !targetUser) {
      return apiResponse.notFound('User not found');
    }

    // Check if current user can manage target user
    if (!canManageUser(user.role, targetUser.role)) {
      return apiResponse.forbidden('You cannot manage this user');
    }

    // Verify same organization (unless super_admin)
    if (user.role !== 'super_admin') {
      if (targetUser.organization_id !== user.organizationId) {
        return apiResponse.forbidden('Cannot update users from different organizations');
      }
    }

    // Check if current user can create users with the new role
    if (user.role === 'manager' && (newRole === 'super_admin' || newRole === 'manager')) {
      return apiResponse.forbidden('Managers cannot promote users to manager or super_admin');
    }

    // Update role
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId);

    if (updateError) throw updateError;

    return apiResponse.success(
      { userId, role: newRole },
      'User role updated successfully'
    );
  } catch (error: any) {
    logger.error('Error updating user role:', error);
    return apiResponse.serverError(error.message);
  }
}
