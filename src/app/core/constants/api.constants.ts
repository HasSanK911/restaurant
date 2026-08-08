/**
 * Every network endpoint the app knows about, in one place.
 *
 * JSON Server exposes each db.json top-level key as a REST collection, so these
 * paths already match a conventional Laravel `apiResource` layout. Migration is
 * a base-URL swap plus the handful of endpoints marked LARAVEL below.
 */
export const API = {
  restaurant: '/restaurant',
  settings: '/settings',
  categories: '/categories',
  menu: '/menu',
  menuImages: '/menuImages',
  banners: '/banners',
  offers: '/offers',
  chefs: '/chefs',
  reservations: '/reservations',
  orders: '/orders',
  customers: '/customers',
  deliveryAreas: '/deliveryAreas',
  inventory: '/inventory',
  inventoryLogs: '/inventoryLogs',
  suppliers: '/suppliers',
  staff: '/staff',
  users: '/users',
  roles: '/roles',
  permissions: '/permissions',
  testimonials: '/testimonials',
  gallery: '/gallery',
  blogs: '/blogs',
  faq: '/faq',
  coupons: '/coupons',
  contactMessages: '/contactMessages',
  notifications: '/notifications',
  reviews: '/reviews',
  tables: '/tables',
  events: '/events',
  cateringPackages: '/cateringPackages',
  jobs: '/jobs',
  branches: '/branches',
  systemLogs: '/systemLogs',
  dashboardStats: '/dashboardStats',
  analytics: '/analytics',
} as const;

export type ApiResource = (typeof API)[keyof typeof API];

/** Endpoints that JSON Server cannot serve and the Laravel API must provide. */
export const LARAVEL_ONLY_ENDPOINTS = [
  'POST /auth/login',
  'POST /auth/register',
  'POST /auth/logout',
  'GET  /auth/me',
  'POST /coupons/validate',
  'GET  /reservations/availability',
  'POST /orders/{id}/status',
] as const;

export const STORAGE_KEYS = {
  cart: 'salateen.cart.v1',
  session: 'salateen.session.v1',
  recentlyViewed: 'salateen.recent.v1',
  wishlist: 'salateen.wishlist.v1',
  cookieConsent: 'salateen.consent.v1',
  adminSidebar: 'salateen.admin.sidebar.v1',
} as const;
