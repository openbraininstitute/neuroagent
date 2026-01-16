import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js middleware for request processing
 *
 * This middleware runs on all requests and handles:
 * - Request ID generation for correlation
 * - CORS headers (additional to next.config.ts)
 * - Path prefix stripping if needed
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Generate and add request ID for correlation (using crypto.randomUUID from Web Crypto API)
  const requestId = crypto.randomUUID();
  response.headers.set('X-Request-ID', requestId);

  // Add CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Request-ID'
    );
  }

  return response;
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
