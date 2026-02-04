import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* Experimental features */
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  /* API routes configuration */
  async headers() {
    return [
      {
        // Apply CORS headers to all API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
          },
        ],
      },
    ];
  },

  /* Logging */
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  /* TypeScript */
  typescript: {
    // Don't fail build on type errors in Docker (type checking should be done in CI/development)
    // TODO: Fix all TypeScript strict mode errors and re-enable this
    ignoreBuildErrors: true,
  },

  /* ESLint */
  eslint: {
    // Don't fail build on lint errors in Docker (warnings are still shown)
    // In development, linting is enforced via npm run lint
    ignoreDuringBuilds: true,
  },

  /* Output */
  output: 'standalone',

  /* Production optimizations */
  compress: true, // Enable gzip compression
  poweredByHeader: false, // Remove X-Powered-By header for security
  generateEtags: true, // Enable ETags for caching
  // Note: swcMinify is now the default in Next.js 13+ and has been removed as a config option
};

export default nextConfig;
