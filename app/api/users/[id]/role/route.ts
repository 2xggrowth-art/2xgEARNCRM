/**
 * Update User Role
 * PUT /api/users/[id]/role - Update a user's role
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { apiResponse, getRequestBody, getUserFromRequest } from '@/lib/middleware';
import { UserRole } from '@/lib/types';
import { canManageUser } from '@/lib/permissions';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getUserFromRequest(request);

  if (!user) {
    return apiResponse.unauthorized();
  }

  const userId = params.id;

  const body = await getRequestBody<{
    role: UserRole;
  }>(request);

  if (!body || !body.role) {
    return apiResponse.error('Missing role in request body');
  }

  const { role: newRole } = body;

  // Validate role
  const validRoles: UserRole[] = ['super_admin', 'manager', 'staff', 'sales_rep'];
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
    console.error('Error updating user role:', error);
    return apiResponse.serverError(error.message);
  }
}
