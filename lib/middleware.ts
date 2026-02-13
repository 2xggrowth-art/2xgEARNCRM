/**
 * Authentication and Permission Middleware Helpers
 * For Next.js API Routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from './auth';
import { UserRole, JWTPayload } from './types';
import { Permission, checkPermission, checkAnyPermission } from './permissions';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

/**
 * Extract and verify user from request headers
 */
export function getUserFromRequest(request: NextRequest): JWTPayload | null {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = extractTokenFromHeader(authHeader);
    if (token) {
      const user = verifyToken(token);
      if (user) return user;
    }
  }

  // Fallback to custom headers (backward compatibility)
  const userId = request.headers.get('x-user-id');
  const organizationId = request.headers.get('x-organization-id');
  const rawRole = request.headers.get('x-user-role');
  // Normalize 'admin' → 'manager' (register page historically used 'admin')
  const userRole = (rawRole === 'admin' ? 'manager' : rawRole) as UserRole | null;
  const phone = request.headers.get('x-user-phone');

  if (userId && organizationId && userRole) {
    return {
      userId,
      organizationId,
      role: userRole,
      phone: phone || '',
    };
  }

  return null;
}

/**
 * Require authentication
 */
export function requireAuth(request: NextRequest): {
  authorized: boolean;
  user?: JWTPayload;
  response?: NextResponse;
} {
  const user = getUserFromRequest(request);

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'Unauthorized. Please login.' },
        { status: 401 }
      ),
    };
  }

  return {
    authorized: true,
    user,
  };
}

/**
 * Require specific role
 */
export function requireRole(request: NextRequest, allowedRoles: UserRole[]): {
  authorized: boolean;
  user?: JWTPayload;
  response?: NextResponse;
} {
  const authResult = requireAuth(request);

  if (!authResult.authorized || !authResult.user) {
    return authResult;
  }

  if (!allowedRoles.includes(authResult.user.role)) {
    return {
      authorized: false,
      user: authResult.user,
      response: NextResponse.json(
        {
          success: false,
          error: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    user: authResult.user,
  };
}

/**
 * Require specific permission
 */
export function requirePermission(request: NextRequest, permission: Permission): {
  authorized: boolean;
  user?: JWTPayload;
  response?: NextResponse;
} {
  const authResult = requireAuth(request);

  if (!authResult.authorized || !authResult.user) {
    return authResult;
  }

  const permissionCheck = checkPermission(authResult.user.role, permission);

  if (!permissionCheck.authorized) {
    return {
      authorized: false,
      user: authResult.user,
      response: NextResponse.json(
        {
          success: false,
          error: permissionCheck.error || 'Permission denied',
        },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    user: authResult.user,
  };
}

/**
 * Require any of the specified permissions
 */
export function requireAnyPermission(
  request: NextRequest,
  permissions: Permission[]
): {
  authorized: boolean;
  user?: JWTPayload;
  response?: NextResponse;
} {
  const authResult = requireAuth(request);

  if (!authResult.authorized || !authResult.user) {
    return authResult;
  }

  const permissionCheck = checkAnyPermission(authResult.user.role, permissions);

  if (!permissionCheck.authorized) {
    return {
      authorized: false,
      user: authResult.user,
      response: NextResponse.json(
        {
          success: false,
          error: permissionCheck.error || 'Permission denied',
        },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    user: authResult.user,
  };
}

/**
 * Validate same organization access
 */
export function requireSameOrganization(
  user: JWTPayload,
  targetOrganizationId: string
): {
  authorized: boolean;
  response?: NextResponse;
} {
  // Super admins can access any organization
  if (user.role === 'super_admin') {
    return { authorized: true };
  }

  if (user.organizationId !== targetOrganizationId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'Access denied. Organization mismatch.' },
        { status: 403 }
      ),
    };
  }

  return { authorized: true };
}

/**
 * API Response helpers
 */
export const apiResponse = {
  success: <T>(data: T, message?: string) => {
    return NextResponse.json({ success: true, data, message });
  },

  error: (error: string, status: number = 400) => {
    return NextResponse.json({ success: false, error }, { status });
  },

  unauthorized: (message: string = 'Unauthorized') => {
    return NextResponse.json({ success: false, error: message }, { status: 401 });
  },

  forbidden: (message: string = 'Permission denied') => {
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  },

  notFound: (message: string = 'Resource not found') => {
    return NextResponse.json({ success: false, error: message }, { status: 404 });
  },

  serverError: (message: string = 'Internal server error') => {
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  },
};

/**
 * Validate request body
 */
export async function getRequestBody<T>(request: NextRequest): Promise<T | null> {
  try {
    return await request.json();
  } catch (error) {
    return null;
  }
}

/**
 * Extract query parameters
 */
export function getQueryParams(request: NextRequest): URLSearchParams {
  const { searchParams } = new URL(request.url);
  return searchParams;
}
