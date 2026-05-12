import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/projects',
        permanent: false,
      },
      {
        source: '/projects/new',
        destination: '/projects',
        permanent: false,
      },
      {
        source: '/dashboard/projects/new',
        destination: '/projects',
        permanent: false,
      },
      {
        source: '/dashboard/projects/:path*',
        destination: '/projects/:path*',
        permanent: false,
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/projects',
        destination: '/dashboard/projects',
      },
      {
        source: '/projects/:path*',
        destination: '/dashboard/projects/:path*',
      },
    ]
  },
};

export default nextConfig;
