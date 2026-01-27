import nextAuthMiddleware, { NextRequestWithAuth } from "next-auth/middleware";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  // Define public paths that don't require authentication
  const isPublicPath = path === "/login";

  // If it's a public path, allow access
  if (isPublicPath) {
    return NextResponse.next();
  }

  // For all other routes, use nextAuthMiddleware
  // This will automatically redirect to /login if not authenticated
  return nextAuthMiddleware(request as NextRequestWithAuth);
}

// Configure which paths the middleware will run on
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};