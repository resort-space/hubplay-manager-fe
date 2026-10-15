import type { NextConfig } from 'next';

const backendUrl = (process.env.BACKEND_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backendUrl}/api/:path*` }];
  },
  webpack: (config) => {
    config.resolve.fallback = { ...(config.resolve.fallback || {}), path: false, lna: false };
    return config;
  },
};

export default nextConfig;
