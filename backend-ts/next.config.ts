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
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
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
    // Fail build on type errors
    ignoreBuildErrors: false,
  },

  /* ESLint */
  eslint: {
    // Fail build on lint errors
    ignoreDuringBuilds: false,
  },

  /* Output */
  output: 'standalone',
};

export default nextConfig;
