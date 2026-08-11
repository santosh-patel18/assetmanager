/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployments
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,

  // Remove X-Powered-By header (don't advertise tech stack)
  poweredByHeader: false,

  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Security headers are handled in middleware.ts for finer control,
  // but we add baseline headers here as a safety net
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },

  // Redirect HTTP to HTTPS in production
  async redirects() {
    return [];
  },
};

module.exports = nextConfig;
