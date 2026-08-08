export const environment = {
  production: false,
  /**
   * JSON Server sits on :3000 during development. When the Laravel API lands,
   * this becomes `https://api.salateenrestaurant.pk/api/v1` and nothing else in
   * the app has to change. See MIGRATION_GUIDE.md.
   */
  apiUrl: 'http://localhost:3000',
  siteUrl: 'http://localhost:4200',
  /** Toggles the mock-auth shim. Flip to false once Sanctum is live. */
  useMockAuth: true,
  /** Payment gateways stay disabled for this build (cash only). */
  onlinePaymentEnabled: false,
  defaultLocale: 'en-PK',
  currency: 'PKR',
  requestTimeoutMs: 15000,
  retryCount: 1,
} as const;
