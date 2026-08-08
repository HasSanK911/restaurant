/**
 * Production build of the DEMO.
 *
 * Optimised, prerendered and pointed at the public domain for canonical URLs
 * and Open Graph, but still reading from JSON Server. This is the configuration
 * used by `npm run build`, because the demo has to be able to prerender real
 * content without a Laravel API existing yet.
 *
 * When the Laravel API is live, build with `npm run build:laravel`, which uses
 * environment.prod.ts instead. See MIGRATION_GUIDE.md.
 */
export const environment = {
  production: true,
  apiUrl: 'http://localhost:3000',
  siteUrl: 'https://salateenrestaurant.pk',
  useMockAuth: true,
  onlinePaymentEnabled: false,
  defaultLocale: 'en-PK',
  currency: 'PKR',
  requestTimeoutMs: 15000,
  retryCount: 1,
} as const;
