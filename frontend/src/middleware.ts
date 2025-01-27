import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: [
    '/',
    '/settings',
    '/threads/:path*',
    // Add other protected routes here
  ],
}; 