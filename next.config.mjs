import { withSentryConfig } from '@sentry/nextjs';
/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
    };

    // Add loader for .wasm files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource', // Use 'asset/resource' for Webpack 5
    });

    // Add loader for .zkey files (binary files)
    config.module.rules.push({
      test: /\.zkey$/,
      type: 'asset/resource', // Handle binary files like .zkey as assets
    });

    // Solve "Module not found: Can't resolve 'pino-pretty'" warning
    config.externals.push('pino-pretty', 'encoding');

    return config;
  },
  // Headers configuration for Safe App compatibility
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN', // Allow framing from same origin and Safe domains
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://app.safe.global https://*.safe.global https://safe.global;",
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*', // Allow requests from any origin for manifest.json
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-Requested-With, content-type, Authorization',
          },
        ],
      },
      {
        // Specific headers for manifest.json
        source: '/manifest.json',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600', // Cache for 1 hour
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: 'test-hrn',
  project: 'javascript-nextjs',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: '/monitoring',

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});
