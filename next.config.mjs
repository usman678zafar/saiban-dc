/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  experimental: {
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'playwright-core'],
    outputFileTracingIncludes: {
      '/api/applications/[id]/review': ['./public/fonts/NotoNastaliqUrdu-Regular.ttf'],
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
};

export default nextConfig;
