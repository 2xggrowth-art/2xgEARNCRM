/**
 * Permission and Role Management System
 * Phase 2.1 - Role Hierarchy
 */

import { UserRole } from './types';

// Permission definitions
export type Permission =
  // Super Admin permissions
  | 'view_all_organizations'
  | 'manage_organizations'
  | 'view_system_reports'
  | 'manage_all_users'
  | 'manage_permissions'
  | 'view_all_leads'
  | 'export_system_data'
  // Manager permissions
  | 'view_team_leads'
  | 'manage_team'
  | 'set_targets'
  | 'view_reports'
  | 'export_data'
  | 'manage_categories'
  | 'view_organization_settings'
  | 'update_organization_settings'
  | 'reset_team_pins'
  | 'approve_incentives'
  // Staff permissions
  | 'view_assigned_leads'
  | 'create_leads'
  | 'view_own_reports'
  | 'update_own_leads'
  | 'view_categories'
  | 'view_targets'
  // Sales Rep permissions
  | 'view_own_leads'
  | 'view_own_incentives';

/**
 * Role hierarchy levels (higher number = more access)
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 4,
  manager: 3,
  staff: 2,
  sales_rep: 1,
};

/**
 * Permission mapping for each role
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    'view_all_organizations',
    'manage_organizations',
    'view_system_reports',
    'manage_all_users',
    'manage_permissions',
    'view_all_leads',
    'export_system_data',
    // Super admin inherits all lower permissions
    'view_team_leads',
    'manage_team',
    'set_targets',
    'view_reports',
    'export_data',
    'manage_categories',
    'view_organization_settings',
    'update_organization_settings',
    'reset_team_pins',
    'approve_incentives',
    'view_assigned_leads',
    'create_leads',
    'view_own_reports',
    'update_own_leads',
    'view_categories',
    'view_targets',
    'view_own_leads',
    'view_own_incentives',
  ],
  manager: [
    'view_team_leads',
    'manage_team',
    'set_targets',
    'view_reports',
    'export_data',
    'manage_categories',
    'view_organization_settings',
    'update_organization_settings',
    'reset_team_pins',
    'approve_incentives',
    // Manager inherits staff and sales_rep permissions
    'view_assigned_leads',
    'create_leads',
    'view_own_reports',
    'update_own_leads',
    'view_categories',
    'view_targets',
    'view_own_leads',
    'view_own_incentives',
  ],
  staff: [
    'view_assigned_leads',
    'create_leads',
    'view_own_reports',
    'update_own_leads',
    'view_categories',
    'view_targets',
    // Staff inherits sales_rep permissions
    'view_own_leads',
    'view_own_incentives',
  ],
  sales_rep: [
    'create_leads',
    'view_own_leads',
    'update_own_leads',
    'view_categories',
    'view_targets',
    'view_own_incentives',
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if role1 is higher than role2 in hierarchy
 */
export function isHigherRole(role1: UserRole, role2: UserRole): boolean {
  return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2];
}

/**
 * Check if role1 is higher or equal to role2 in hierarchy
 */
export function isHigherOrEqualRole(role1: UserRole, role2: UserRole): boolean {
  return ROLE_HIERARCHY[role1] >= ROLE_HIERARCHY[role2];
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Get the default redirect path for a role
 */
export function getDefaultDashboard(role: UserRole): string {
  switch (role) {
    case 'super_admin':
      return '/super-admin/dashboard';
    case 'manager':
      return '/manager/dashboard';
    case 'staff':
      return '/staff/dashboard';
    case 'sales_rep':
      return '/dashboard';
    default:
      return '/login';
  }
}

/**
 * Validate if a user can manage another user (based on role hierarchy)
 */
export function canManageUser(managerRole: UserRole, targetRole: UserRole): boolean {
  // Super admins can manage anyone
  if (managerRole === 'super_admin') return true;

  // Managers can manage staff and sales_rep
  if (managerRole === 'manager') {
    return targetRole === 'staff' || targetRole === 'sales_rep';
  }

  // Staff cannot manage anyone
  if (managerRole === 'staff') return false;

  // Sales reps cannot manage anyone
  return false;
}

/**
 * Validate if a role can create a user with a specific role
 */
export function canCreateUserWithRole(
  creatorRole: UserRole,
  newUserRole: UserRole
): boolean {
  // Super admins can create any role
  if (creatorRole === 'super_admin') return true;

  // Managers can create staff and sales_rep
  if (creatorRole === 'manager') {
    return newUserRole === 'staff' || newUserRole === 'sales_rep';
  }

  // Others cannot create users
  return false;
}

/**
 * Get allowed roles that a user can create
 */
export function getAllowedRolesToCreate(creatorRole: UserRole): UserRole[] {
  switch (creatorRole) {
    case 'super_admin':
      return ['super_admin', 'manager', 'staff', 'sales_rep'];
    case 'manager':
      return ['staff', 'sales_rep'];
    default:
      return [];
  }
}

/**
 * Validate if a role requires a manager assignment
 */
export function requiresManager(role: UserRole): boolean {
  return role === 'staff' || role === 'sales_rep';
}

/**
 * Permission middleware helper for API routes
 */
export interface PermissionCheckResult {
  authorized: boolean;
  error?: string;
}

/**
 * Check if request has required permission
 */
export function checkPermission(
  userRole: UserRole | null | undefined,
  requiredPermission: Permission
): PermissionCheckResult {
  if (!userRole) {
    return {
      authorized: false,
      error: 'User role not provided',
    };
  }

  if (!hasPermission(userRole, requiredPermission)) {
    return {
      authorized: false,
      error: `Permission denied. Required: ${requiredPermission}`,
    };
  }

  return { authorized: true };
}

/**
 * Check if request has any of the required permissions
 */
export function checkAnyPermission(
  userRole: UserRole | null | undefined,
  requiredPermissions: Permission[]
): PermissionCheckResult {
  if (!userRole) {
    return {
      authorized: false,
      error: 'User role not provided',
    };
  }

  const hasAnyPermission = requiredPermissions.some((permission) =>
    hasPermission(userRole, permission)
  );

  if (!hasAnyPermission) {
    return {
      authorized: false,
      error: `Permission denied. Required one of: ${requiredPermissions.join(', ')}`,
    };
  }

  return { authorized: true };
}

/**
 * Check if request has all required permissions
 */
export function checkAllPermissions(
  userRole: UserRole | null | undefined,
  requiredPermissions: Permission[]
): PermissionCheckResult {
  if (!userRole) {
    return {
      authorized: false,
      error: 'User role not provided',
    };
  }

  const missingPermissions = requiredPermissions.filter(
    (permission) => !hasPermission(userRole, permission)
  );

  if (missingPermissions.length > 0) {
    return {
      authorized: false,
      error: `Permission denied. Missing: ${missingPermissions.join(', ')}`,
    };
  }

  return { authorized: true };
}

/**
 * Get user-friendly role name
 */
export function getRoleName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    super_admin: 'Super Admin',
    manager: 'Manager',
    staff: 'Staff',
    sales_rep: 'Sales Representative',
  };
  return roleNames[role] || role;
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    super_admin: 'Full system access across all organizations',
    manager: 'Manage team and view organization-level reports',
    staff: 'Limited administrative access with assigned leads',
    sales_rep: 'Create and manage own leads in the field',
  };
  return descriptions[role] || '';
}
