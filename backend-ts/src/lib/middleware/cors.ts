/**
 * CORS (Cross-Origin Resource Sharing) middleware utilities
 *
 * Provides functions to add CORS headers to responses for API routes.
 * CORS configuration is also set in next.config.ts for static headers.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSettings } from '../config/settings';

/**
 * Add CORS headers to a response
 *
 * @param response - The response to add headers to
 * @param request - The incoming request (optional, for origin validation)
 * @returns The response with CORS headers added
 */
export function addCorsHeaders(
  response: NextResponse,
  request?: NextRequest
): NextResponse {
  const settings = getSettings();
  const corsOrigins = settings.misc.corsOrigins;

  // Determine allowed origins
  let allowedOrigins: string[] = ['*'];
  if (corsOrigins && corsOrigins.trim().length > 0) {
    allowedOrigins = corsOrigins
      .replace(/\s/g, '')
      .split(',')
      .filter((origin) => origin.length > 0);
  }

  // Set origin header
  if (request && allowedOrigins.length > 0 && allowedOrigins[0] !== '*') {
    const origin = request.headers.get('origin') || '';
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else if (allowedOrigins.length === 1 && allowedOrigins[0]) {
      response.headers.set('Access-Control-Allow-Origin', allowedOrigins[0]);
    }
  } else {
    response.headers.set('Access-Control-Allow-Origin', '*');
  }

  // Set other CORS headers
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS, PATCH'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Request-ID'
  );
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours

  return response;
}

/**
 * Handle CORS preflight OPTIONS requests
 *
 * @param request - The incoming OPTIONS request
 * @returns A response with CORS headers for preflight
 */
export function handleCorsPreflightRequest(request: NextRequest): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  return addCorsHeaders(response, request);
}

/**
 * Check if a request is a CORS preflight request
 *
 * @param request - The incoming request
 * @returns True if this is a CORS preflight request
 */
export function isCorsPreflightRequest(request: NextRequest): boolean {
  return (
    request.method === 'OPTIONS' &&
    request.headers.has('origin') &&
    request.headers.has('access-control-request-method')
  );
}
