/**
 * Request ID correlation middleware utilities
 *
 * Provides functions to generate and manage request IDs for tracing
 * requests through the system. Request IDs are used for logging and
 * debugging to correlate related operations.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Header name for request ID
 */
export const REQUEST_ID_HEADER = 'X-Request-ID';

/**
 * Generate a unique request ID
 *
 * Uses the Web Crypto API's randomUUID() function to generate
 * a cryptographically secure UUID v4.
 *
 * @returns A unique request ID (UUID v4)
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Get the request ID from a request, or generate a new one if not present
 *
 * @param request - The incoming request
 * @returns The request ID from the request header, or a newly generated one
 */
export function getOrGenerateRequestId(request: NextRequest): string {
  const existingId = request.headers.get(REQUEST_ID_HEADER);
  return existingId || generateRequestId();
}

/**
 * Add request ID to a response
 *
 * If the request already has a request ID, it will be preserved.
 * Otherwise, a new request ID will be generated.
 *
 * @param response - The response to add the request ID to
 * @param request - The incoming request
 * @returns The response with request ID header added
 */
export function addRequestIdHeader(
  response: NextResponse,
  request: NextRequest
): NextResponse {
  const requestId = getOrGenerateRequestId(request);
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

/**
 * Create a response with request ID header
 *
 * Helper function to create a new response with the request ID header set.
 *
 * @param body - Response body
 * @param init - Response initialization options
 * @param request - The incoming request
 * @returns A new response with request ID header
 */
export function createResponseWithRequestId(
  body: BodyInit | null,
  init: ResponseInit | undefined,
  request: NextRequest
): NextResponse {
  const response = new NextResponse(body, init);
  return addRequestIdHeader(response, request);
}
