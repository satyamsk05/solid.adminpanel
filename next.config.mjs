/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${process.env.BACKEND_URL || 'http://43.204.217.93:5001'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

