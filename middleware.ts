import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/customer',
  '/api/auth/login',
  '/api/auth/request-otp',
  '/api/auth/verify-otp',
  '/api/auth/register',
  '/api/customers',
  '/api/leads/check-invoice',
  '/api/leads/update-review-status',
  '/api/organization/logo',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log('🔵 Middleware START for:', pathname);

  // Allow root path
  if (pathname === '/') {
    console.log('  ✅ Root path, skipping auth');
    return NextResponse.next();
  }

  // Allow public routes (exact match or startsWith for auth routes)
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route))) {
    console.log('  ✅ Public route, skipping auth');
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('/favicon.ico') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)
  ) {
    console.log('  ✅ Static file, skipping auth');
    return NextResponse.next();
  }

  // Check for authentication token in cookies
  const token = request.cookies.get('auth_token')?.value;
  const userCookie = request.cookies.get('user')?.value;

  console.log('  🍪 Cookies found:', { hasToken: !!token, hasUserCookie: !!userCookie });

  if (!token || !userCookie) {
    console.log('  ❌ Missing auth cookies');
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

  // Parse user data from cookie and add to headers for API routes
  try {
    const user = JSON.parse(userCookie);

    console.log('Middleware - Parsed user from cookie:', {
      pathname,
      userId: user.id,
      userRole: user.role,
      organizationId: user.organizationId,
    });

    // Set headers on the request
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', user.id || '');
    requestHeaders.set('x-user-role', user.role || '');
    requestHeaders.set('x-organization-id', user.organizationId || '');

    console.log('Middleware - Headers being set:', {
      'x-user-id': requestHeaders.get('x-user-id'),
      'x-user-role': requestHeaders.get('x-user-role'),
      'x-organization-id': requestHeaders.get('x-organization-id'),
    });

    // Use NextResponse.next() with custom headers
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    return response;
  } catch (error) {
    console.error('Middleware error parsing user cookie:', error, 'Cookie value:', userCookie);
    // Invalid user cookie - redirect to login
    if (!pathname.startsWith('/api')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.json(
      { success: false, error: 'Invalid session' },
      { status: 401 }
    );
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
