/**
 * Health check endpoint
 * Returns a simple 200 status to indicate the API is running
 */

export async function GET() {
  return new Response('200', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
