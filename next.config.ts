import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  webpack: (config: unknown) => {
    const webpackConfig = config as { resolve?: { alias?: Record<string, string> } };
    webpackConfig.resolve = webpackConfig.resolve || {};
    webpackConfig.resolve.alias = {
      ...(webpackConfig.resolve.alias || {}),
      '@': path.resolve(__dirname, 'src'),
    };
    return webpackConfig;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'www.hub.majoli.io', 'majoli-hub-images-s3.s3.eu-north-1.amazonaws.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
  },
  experimental: {
    serverActions: {},
  },
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;