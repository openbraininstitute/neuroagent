/**
 * Readiness check endpoint
 * Returns a JSON object indicating the API is ready to accept traffic
 */

export async function GET() {
  return Response.json({ status: 'ok' });
}
