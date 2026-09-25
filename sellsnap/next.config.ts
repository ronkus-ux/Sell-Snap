import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Uploads accept images up to 5MB (storage.ts); default 1MB body cap
      // would reject them with 413. ~20KB of multipart overhead included.
      bodySizeLimit: '6mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
      },
    ],
  },
};

export default nextConfig;
