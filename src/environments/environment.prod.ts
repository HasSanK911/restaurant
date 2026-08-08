export const environment = {
  production: true,
  apiUrl: 'https://api.salateenrestaurant.pk/api/v1',
  siteUrl: 'https://salateenrestaurant.pk',
  useMockAuth: false,
  onlinePaymentEnabled: false,
  defaultLocale: 'en-PK',
  currency: 'PKR',
  requestTimeoutMs: 15000,
  retryCount: 1,
} as const;
