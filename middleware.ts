import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Note: Cannot import logger here as middleware runs in Edge runtime
// Use conditional logging based on environment
const isDev = process.env.NODE_ENV === 'development';

// JWT secret for verification (must be set in environment)
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || '');

// Define public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/customer',
  '/offers',
  '/api/auth/login',
  '/api/auth/request-otp',
  '/api/auth/verify-otp',
  '/api/auth/register',
  '/api/customers',
  '/api/organization/logo',
  '/api/offers/lead',
  '/api/offers/spin',
  '/api/offers/settings',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isDev) console.log('🔵 Middleware START for:', pathname);

  // Allow root path
  if (pathname === '/') {
    if (isDev) console.log('  ✅ Root path, skipping auth');
    return NextResponse.next();
  }

  // Allow public routes (exact match or startsWith for auth routes)
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route))) {
    if (isDev) console.log('  ✅ Public route, skipping auth');
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('/favicon.ico') ||
    pathname.includes('/manifest.json') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|json)$/)
  ) {
    if (isDev) console.log('  ✅ Static file, skipping auth');
    return NextResponse.next();
  }

  // Check for authentication token in cookies
  const token = request.cookies.get('auth_token')?.value;
  const userCookie = request.cookies.get('user')?.value;

  if (isDev) console.log('  🍪 Cookies found:', { hasToken: !!token, hasUserCookie: !!userCookie });

  if (!token || !userCookie) {
    if (isDev) console.log('  ❌ Missing auth cookies');
    // Redirect to login if accessing protected page routes
    if (!pathname.startsWith('/api')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Return 401 for API routes
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Verify JWT token and extract user data
  try {
    // Verify the JWT token
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Also validate the user cookie structure matches the JWT payload
    const userFromCookie = JSON.parse(userCookie);

    // Security: Ensure user cookie data matches JWT payload to prevent tampering
    if (
      userFromCookie.id !== payload.userId ||
      userFromCookie.role !== payload.role ||
      userFromCookie.organizationId !== payload.organizationId
    ) {
      if (isDev) {
        console.error('User cookie data does not match JWT payload - possible tampering');
      }
      throw new Error('Session data mismatch');
    }

    if (isDev) {
      console.log('Middleware - Authenticated user:', {
        pathname,
        userId: payload.userId,
        userRole: payload.role,
        organizationId: payload.organizationId,
      });
    }

    // Set headers on the request using verified JWT data
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId as string || '');
    requestHeaders.set('x-user-role', payload.role as string || '');
    requestHeaders.set('x-organization-id', payload.organizationId as string || '');

    if (isDev) {
      console.log('Middleware - Headers being set:', {
        'x-user-id': requestHeaders.get('x-user-id'),
        'x-user-role': requestHeaders.get('x-user-role'),
        'x-organization-id': requestHeaders.get('x-organization-id'),
      });
    }

    // Use NextResponse.next() with custom headers
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    return response;
  } catch (error) {
    // JWT verification failed or cookie data mismatch
    // Always log errors, but don't expose sensitive details in production
    if (isDev) {
      console.error('Middleware authentication error:', error);
    } else {
      console.error('Authentication failed');
    }

    // Clear invalid cookies
    const response = pathname.startsWith('/api')
      ? NextResponse.json(
          { success: false, error: 'Invalid or expired session' },
          { status: 401 }
        )
      : NextResponse.redirect(new URL('/login', request.url));

    // Clear the invalid cookies
    response.cookies.delete('auth_token');
    response.cookies.delete('user');

    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
