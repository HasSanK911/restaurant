import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard, permissionGuard, roleGuard } from './core/guards/auth.guard';
import { cartNotEmptyGuard } from './core/guards/checkout.guard';

/**
 * Route table.
 *
 * Every page is lazily loaded so the initial bundle carries only the shell.
 * `PreloadAllModules` (see app.config.ts) warms the rest once the app is idle,
 * which keeps navigation instant without paying for it up front.
 */
export const routes: Routes = [
  // ORDER MATTERS. The public shell is matched on a path prefix of '' and ends
  // with a '**' child, so it would swallow every URL. Anything that must not be
  // wrapped in the public chrome is therefore declared before it.

  // ------------------------------------------------------------------ auth
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/auth-layout.component').then((m) => m.AuthLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
        title: 'Sign In | Salateen Restaurant Swabi',
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register.page').then((m) => m.RegisterPage),
        title: 'Create an Account | Salateen Restaurant Swabi',
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/forgot-password.page').then((m) => m.ForgotPasswordPage),
        title: 'Reset Password | Salateen Restaurant Swabi',
      },
    ],
  },

  // ----------------------------------------------------------------- admin
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/admin/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'analytics',
        canActivate: [permissionGuard('reports.view')],
        loadComponent: () => import('./features/admin/analytics.page').then((m) => m.AnalyticsPage),
      },
      {
        path: 'reports',
        canActivate: [permissionGuard('reports.view')],
        loadComponent: () => import('./features/admin/reports.page').then((m) => m.ReportsPage),
      },
      {
        path: 'orders',
        canActivate: [permissionGuard('orders.view')],
        loadComponent: () => import('./features/admin/orders.page').then((m) => m.AdminOrdersPage),
      },
      {
        path: 'orders/:id',
        canActivate: [permissionGuard('orders.view')],
        loadComponent: () =>
          import('./features/admin/order-detail.page').then((m) => m.AdminOrderDetailPage),
      },
      {
        path: 'kitchen-queue',
        canActivate: [permissionGuard('kitchen.view')],
        loadComponent: () =>
          import('./features/admin/kitchen-queue.page').then((m) => m.KitchenQueuePage),
      },
      {
        path: 'reservations',
        canActivate: [permissionGuard('reservations.view')],
        loadComponent: () =>
          import('./features/admin/reservations.page').then((m) => m.AdminReservationsPage),
      },
      {
        path: 'tables',
        canActivate: [permissionGuard('reservations.view')],
        loadComponent: () => import('./features/admin/operations.pages').then((m) => m.AdminTablesPage),
      },
      {
        path: 'delivery-areas',
        canActivate: [permissionGuard('settings.view')],
        loadComponent: () =>
          import('./features/admin/operations.pages').then((m) => m.DeliveryAreasPage),
      },
      {
        path: 'categories',
        canActivate: [permissionGuard('menu.view')],
        loadComponent: () =>
          import('./features/admin/catalogue.pages').then((m) => m.AdminCategoriesPage),
      },
      {
        path: 'menu',
        canActivate: [permissionGuard('menu.view')],
        loadComponent: () => import('./features/admin/catalogue.pages').then((m) => m.AdminMenuPage),
      },
      {
        path: 'offers',
        canActivate: [permissionGuard('offers.view')],
        loadComponent: () => import('./features/admin/catalogue.pages').then((m) => m.AdminOffersPage),
      },
      {
        path: 'coupons',
        canActivate: [permissionGuard('coupons.view')],
        loadComponent: () =>
          import('./features/admin/catalogue.pages').then((m) => m.AdminCouponsPage),
      },
      {
        path: 'inventory',
        canActivate: [permissionGuard('inventory.view')],
        loadComponent: () =>
          import('./features/admin/inventory.page').then((m) => m.AdminInventoryPage),
      },
      {
        path: 'inventory-logs',
        canActivate: [permissionGuard('inventory.view')],
        loadComponent: () =>
          import('./features/admin/operations.pages').then((m) => m.InventoryLogsPage),
      },
      {
        path: 'suppliers',
        canActivate: [permissionGuard('inventory.view')],
        loadComponent: () =>
          import('./features/admin/operations.pages').then((m) => m.AdminSuppliersPage),
      },
      {
        path: 'customers',
        canActivate: [permissionGuard('customers.view')],
        loadComponent: () =>
          import('./features/admin/people.pages').then((m) => m.AdminCustomersPage),
      },
      {
        path: 'staff',
        canActivate: [permissionGuard('staff.view')],
        loadComponent: () => import('./features/admin/people.pages').then((m) => m.AdminStaffPage),
      },
      {
        path: 'users',
        canActivate: [permissionGuard('users.view')],
        loadComponent: () => import('./features/admin/people.pages').then((m) => m.AdminUsersPage),
      },
      {
        path: 'roles',
        canActivate: [permissionGuard('roles.view')],
        loadComponent: () => import('./features/admin/people.pages').then((m) => m.AdminRolesPage),
      },
      {
        path: 'permissions',
        canActivate: [permissionGuard('roles.view')],
        loadComponent: () =>
          import('./features/admin/people.pages').then((m) => m.AdminPermissionsPage),
      },
      {
        path: 'reviews',
        canActivate: [permissionGuard('reviews.view')],
        loadComponent: () =>
          import('./features/admin/content.pages').then((m) => m.AdminReviewsPage),
      },
      {
        path: 'testimonials',
        canActivate: [permissionGuard('content.view')],
        loadComponent: () =>
          import('./features/admin/content.pages').then((m) => m.AdminTestimonialsPage),
      },
      {
        path: 'gallery',
        canActivate: [permissionGuard('content.view')],
        loadComponent: () =>
          import('./features/admin/content.pages').then((m) => m.AdminGalleryPage),
      },
      {
        path: 'blogs',
        canActivate: [permissionGuard('content.view')],
        loadComponent: () => import('./features/admin/content.pages').then((m) => m.AdminBlogsPage),
      },
      {
        path: 'faqs',
        canActivate: [permissionGuard('content.view')],
        loadComponent: () => import('./features/admin/content.pages').then((m) => m.AdminFaqsPage),
      },
      {
        path: 'messages',
        canActivate: [permissionGuard('content.view')],
        loadComponent: () =>
          import('./features/admin/content.pages').then((m) => m.AdminMessagesPage),
      },
      {
        path: 'settings',
        canActivate: [permissionGuard('settings.view')],
        loadComponent: () =>
          import('./features/admin/system.pages').then((m) => m.AdminSettingsPage),
      },
      {
        path: 'working-hours',
        canActivate: [permissionGuard('settings.view')],
        loadComponent: () =>
          import('./features/admin/system.pages').then((m) => m.WorkingHoursPage),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/admin/system.pages').then((m) => m.AdminNotificationsPage),
      },
      {
        path: 'logs',
        canActivate: [permissionGuard('logs.view')],
        loadComponent: () => import('./features/admin/system.pages').then((m) => m.AdminLogsPage),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/admin/system.pages').then((m) => m.AdminProfilePage),
      },
    ],
  },

  // --------------------------------------------------------------- kitchen
  // Standalone full-screen display for the pass. No site chrome.
  {
    path: 'kitchen',
    canActivate: [roleGuard('kitchen', 'admin', 'manager')],
    loadComponent: () => import('./features/kitchen/kitchen.page').then((m) => m.KitchenPage),
    title: 'Kitchen Display | Salateen Restaurant',
  },

  // ---------------------------------------------------------------- public
  {
    path: '',
    loadComponent: () =>
      import('./layouts/public/public-layout.component').then((m) => m.PublicLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage),
        title: 'Salateen Restaurant Swabi | Pakistani BBQ & Family Fine Dining',
      },
      {
        path: 'about',
        loadComponent: () => import('./features/about/about.page').then((m) => m.AboutPage),
      },
      {
        path: 'our-story',
        loadComponent: () => import('./features/about/our-story.page').then((m) => m.OurStoryPage),
      },

      // ---- menu
      {
        path: 'menu',
        loadComponent: () => import('./features/menu/menu.page').then((m) => m.MenuPage),
      },
      {
        path: 'menu/c/:categorySlug',
        loadComponent: () => import('./features/menu/menu.page').then((m) => m.MenuPage),
      },
      {
        path: 'menu/:slug',
        loadComponent: () =>
          import('./features/menu/menu-detail.page').then((m) => m.MenuDetailPage),
      },

      // ---- ordering
      {
        path: 'cart',
        loadComponent: () => import('./features/checkout/cart.page').then((m) => m.CartPage),
        title: 'Your Order',
      },
      {
        path: 'checkout',
        canActivate: [cartNotEmptyGuard],
        loadComponent: () =>
          import('./features/checkout/checkout.page').then((m) => m.CheckoutPage),
        title: 'Checkout',
      },
      {
        path: 'order/confirmation/:id',
        loadComponent: () =>
          import('./features/checkout/order-confirmation.page').then(
            (m) => m.OrderConfirmationPage,
          ),
      },
      {
        path: 'order/track',
        loadComponent: () =>
          import('./features/checkout/track-order.page').then((m) => m.TrackOrderPage),
      },
      {
        path: 'order/track/:reference',
        loadComponent: () =>
          import('./features/checkout/track-order.page').then((m) => m.TrackOrderPage),
      },

      // ---- reservations
      {
        path: 'reservation',
        loadComponent: () =>
          import('./features/reservation/reservation.page').then((m) => m.ReservationPage),
      },
      {
        path: 'reservation/confirmation/:id',
        loadComponent: () =>
          import('./features/reservation/reservation-confirmation.page').then(
            (m) => m.ReservationConfirmationPage,
          ),
      },

      // ---- content
      {
        path: 'gallery',
        loadComponent: () => import('./features/gallery/gallery.page').then((m) => m.GalleryPage),
      },
      {
        path: 'offers',
        loadComponent: () => import('./features/offers/offers.page').then((m) => m.OffersPage),
      },
      {
        path: 'offers/:slug',
        loadComponent: () =>
          import('./features/offers/offer-detail.page').then((m) => m.OfferDetailPage),
      },
      {
        path: 'testimonials',
        loadComponent: () =>
          import('./features/testimonials/testimonials.page').then((m) => m.TestimonialsPage),
      },
      {
        path: 'blog',
        loadComponent: () => import('./features/blog/blog.page').then((m) => m.BlogPage),
      },
      {
        path: 'blog/:slug',
        loadComponent: () =>
          import('./features/blog/blog-detail.page').then((m) => m.BlogDetailPage),
      },
      {
        path: 'faq',
        loadComponent: () => import('./features/faq/faq.page').then((m) => m.FaqPage),
      },
      {
        path: 'contact',
        loadComponent: () => import('./features/contact/contact.page').then((m) => m.ContactPage),
      },
      {
        path: 'events',
        loadComponent: () => import('./features/events/events.page').then((m) => m.EventsPage),
      },
      {
        path: 'catering',
        loadComponent: () =>
          import('./features/catering/catering.page').then((m) => m.CateringPage),
      },
      {
        path: 'branches',
        loadComponent: () =>
          import('./features/branches/branches.page').then((m) => m.BranchesPage),
      },
      {
        path: 'careers',
        loadComponent: () => import('./features/careers/careers.page').then((m) => m.CareersPage),
      },
      {
        path: 'careers/:slug',
        loadComponent: () =>
          import('./features/careers/job-detail.page').then((m) => m.JobDetailPage),
      },

      // ---- legal (one component, three documents, chosen by route data)
      {
        path: 'privacy-policy',
        data: { doc: 'privacy' },
        loadComponent: () => import('./features/legal/legal.page').then((m) => m.LegalPage),
      },
      {
        path: 'terms',
        data: { doc: 'terms' },
        loadComponent: () => import('./features/legal/legal.page').then((m) => m.LegalPage),
      },
      {
        path: 'refund-policy',
        data: { doc: 'refund' },
        loadComponent: () => import('./features/legal/legal.page').then((m) => m.LegalPage),
      },

      // ---- customer account
      {
        path: 'account',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/account/account-layout.component').then((m) => m.AccountLayoutComponent),
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/account/overview.page').then((m) => m.AccountOverviewPage),
          },
          {
            path: 'orders',
            loadComponent: () =>
              import('./features/account/orders.page').then((m) => m.AccountOrdersPage),
          },
          {
            path: 'orders/:id',
            loadComponent: () =>
              import('./features/account/order-detail.page').then((m) => m.AccountOrderDetailPage),
          },
          {
            path: 'reservations',
            loadComponent: () =>
              import('./features/account/reservations.page').then(
                (m) => m.AccountReservationsPage,
              ),
          },
          {
            path: 'wishlist',
            loadComponent: () =>
              import('./features/account/wishlist.page').then((m) => m.AccountWishlistPage),
          },
          {
            path: 'addresses',
            loadComponent: () =>
              import('./features/account/addresses.page').then((m) => m.AccountAddressesPage),
          },
          {
            path: 'reviews',
            loadComponent: () =>
              import('./features/account/reviews.page').then((m) => m.AccountReviewsPage),
          },
          {
            path: 'coupons',
            loadComponent: () =>
              import('./features/account/coupons.page').then((m) => m.AccountCouponsPage),
          },
          {
            path: 'notifications',
            loadComponent: () =>
              import('./features/account/notifications.page').then(
                (m) => m.AccountNotificationsPage,
              ),
          },
          {
            path: 'settings',
            loadComponent: () =>
              import('./features/account/settings.page').then((m) => m.AccountSettingsPage),
          },
        ],
      },

      // ---- errors inside the public shell
      {
        path: '500',
        loadComponent: () =>
          import('./features/errors/server-error.page').then((m) => m.ServerErrorPage),
      },
      {
        path: '404',
        loadComponent: () => import('./features/errors/not-found.page').then((m) => m.NotFoundPage),
      },

      // Catch-all. Must be the last child of the public shell: it renders the
      // 404 page inside the normal site chrome, and SeoService marks it so the
      // SSR server answers a real 404 rather than a soft one.
      {
        path: '**',
        loadComponent: () => import('./features/errors/not-found.page').then((m) => m.NotFoundPage),
      },
    ],
  },
];
