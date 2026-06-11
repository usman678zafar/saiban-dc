const reviewPdfTraceIncludes = [
  './public/fonts/NotoNastaliqUrdu-Regular.ttf',
  './public/fonts/**/*',
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  experimental: {
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'playwright-core'],
    outputFileTracingIncludes: {
      '/api/applications/[id]/review': reviewPdfTraceIncludes,
      '/api/applications/*/review': reviewPdfTraceIncludes,
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
