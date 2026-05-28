
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /**
   * allowedDevOrigins — Next.js 15+
   *
   * When accessing the dev server from a device on the same local network
   * (e.g. http://192.168.x.x:9002), Next.js blocks `/_next/*` resource
   * requests with a CORS/origin check by default.
   *
   * List every LAN IP / hostname that should be permitted during development.
   * These values are ignored in production builds entirely.
   *
   * ⚠️  Do NOT add production domains here — use proper CORS headers for prod.
   */
  allowedDevOrigins: [
    'http://192.168.31.210:9002',  // Current dev machine LAN address
    'http://localhost:9002',       // Standard localhost (always needed as baseline)
  ],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
