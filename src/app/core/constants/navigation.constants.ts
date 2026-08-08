import { Permission } from '../models/user.model';

export interface NavLink {
  label: string;
  path: string;
  description?: string;
  icon?: string;
  exact?: boolean;
  badge?: string;
  external?: boolean;
}

export interface NavGroup {
  label: string;
  path?: string;
  /** Present on entries that open the mega menu instead of navigating. */
  columns?: { heading: string; links: NavLink[] }[];
  feature?: { title: string; blurb: string; image: string; link: string; cta: string };
}

export const PRIMARY_NAV: NavGroup[] = [
  { label: 'Home', path: '/' },
  {
    label: 'Menu',
    path: '/menu',
    columns: [
      {
        heading: 'From the Coals',
        links: [
          { label: 'Charcoal BBQ', path: '/menu/c/bbq', description: 'Seekh, tikka and chops' },
          { label: 'Chapli Kabab', path: '/menu/c/chapli-kabab', description: 'The Peshawari classic' },
          { label: 'Mutton', path: '/menu/c/mutton', description: 'Karahi, shinwari, dumpukht' },
          { label: 'Beef', path: '/menu/c/beef', description: 'Boneless karahi by the kilo' },
        ],
      },
      {
        heading: 'From the Kitchen',
        links: [
          { label: 'Chicken Karahi', path: '/menu/c/chicken', description: 'Regular, white, achari' },
          { label: 'Handi', path: '/menu/c/handi', description: 'Slow-cooked in clay' },
          { label: 'Pulao & Rice', path: '/menu/c/pulao-rice', description: 'Kabuli pulao, fried rice' },
          { label: 'Salan & Sides', path: '/menu/c/salan', description: 'Daal mash, mix sabzi' },
        ],
      },
      {
        heading: 'More',
        links: [
          { label: 'Breads & Naan', path: '/menu/c/breads' },
          { label: 'Desserts', path: '/menu/c/desserts' },
          { label: 'Tea & Drinks', path: '/menu/c/beverages' },
          { label: 'Full Menu', path: '/menu' },
        ],
      },
    ],
    feature: {
      title: 'The Grand Platter',
      blurb: 'Ten hands around one tray. Mutton, chicken, seekh and Kabuli rice.',
      image: 'assets/images/food/grand-platter',
      link: '/menu/grand-platter-for-ten',
      cta: 'See the platter',
    },
  },
  {
    label: 'Experience',
    columns: [
      {
        heading: 'The Restaurant',
        links: [
          { label: 'About Us', path: '/about' },
          { label: 'Our Story', path: '/our-story' },
          { label: 'Gallery', path: '/gallery' },
          { label: 'Testimonials', path: '/testimonials' },
        ],
      },
      {
        heading: 'Occasions',
        links: [
          { label: 'Events', path: '/events' },
          { label: 'Catering', path: '/catering' },
          { label: 'Book a Table', path: '/reservation' },
          { label: 'Branches', path: '/branches' },
        ],
      },
      {
        heading: 'Read',
        links: [
          { label: 'Journal', path: '/blog' },
          { label: 'FAQ', path: '/faq' },
          { label: 'Careers', path: '/careers' },
          { label: 'Contact', path: '/contact' },
        ],
      },
    ],
    feature: {
      title: 'Family Halls',
      blurb: 'Partitioned family seating for up to 40 guests, with full privacy.',
      image: 'assets/images/interior/family-hall-lit',
      link: '/reservation',
      cta: 'Reserve a hall',
    },
  },
  { label: 'Offers', path: '/offers' },
  { label: 'Reservation', path: '/reservation' },
  { label: 'Contact', path: '/contact' },
];

export const MOBILE_TAB_NAV: NavLink[] = [
  { label: 'Home', path: '/', icon: 'home', exact: true },
  { label: 'Menu', path: '/menu', icon: 'menu' },
  { label: 'Book', path: '/reservation', icon: 'calendar' },
  { label: 'Cart', path: '/cart', icon: 'bag' },
  { label: 'Account', path: '/account', icon: 'user' },
];

export const FOOTER_NAV: { heading: string; links: NavLink[] }[] = [
  {
    heading: 'Explore',
    links: [
      { label: 'Menu', path: '/menu' },
      { label: 'Offers', path: '/offers' },
      { label: 'Gallery', path: '/gallery' },
      { label: 'Events', path: '/events' },
      { label: 'Catering', path: '/catering' },
      { label: 'Branches', path: '/branches' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About Us', path: '/about' },
      { label: 'Our Story', path: '/our-story' },
      { label: 'Journal', path: '/blog' },
      { label: 'Testimonials', path: '/testimonials' },
      { label: 'Careers', path: '/careers' },
      { label: 'Contact', path: '/contact' },
    ],
  },
  {
    heading: 'Order',
    links: [
      { label: 'Order Online', path: '/menu' },
      { label: 'Book a Table', path: '/reservation' },
      { label: 'Track Order', path: '/order/track' },
      { label: 'My Account', path: '/account' },
      { label: 'FAQ', path: '/faq' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', path: '/privacy-policy' },
      { label: 'Terms of Service', path: '/terms' },
      { label: 'Refund Policy', path: '/refund-policy' },
    ],
  },
];

export interface AdminNavItem extends NavLink {
  permission?: Permission;
  children?: AdminNavItem[];
}

export interface AdminNavSection {
  heading: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavSection[] = [
  {
    heading: 'Overview',
    items: [
      { label: 'Dashboard', path: '/admin', icon: 'grid', exact: true, permission: 'dashboard.view' },
      { label: 'Analytics', path: '/admin/analytics', icon: 'chart', permission: 'reports.view' },
      { label: 'Reports', path: '/admin/reports', icon: 'document', permission: 'reports.view' },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { label: 'Orders', path: '/admin/orders', icon: 'bag', permission: 'orders.view' },
      { label: 'Kitchen Queue', path: '/admin/kitchen-queue', icon: 'flame', permission: 'kitchen.view' },
      { label: 'Reservations', path: '/admin/reservations', icon: 'calendar', permission: 'reservations.view' },
      { label: 'Tables', path: '/admin/tables', icon: 'table', permission: 'reservations.view' },
      { label: 'Delivery Areas', path: '/admin/delivery-areas', icon: 'map', permission: 'settings.view' },
    ],
  },
  {
    heading: 'Catalogue',
    items: [
      { label: 'Categories', path: '/admin/categories', icon: 'layers', permission: 'menu.view' },
      { label: 'Menu Items', path: '/admin/menu', icon: 'utensils', permission: 'menu.view' },
      { label: 'Offers', path: '/admin/offers', icon: 'tag', permission: 'offers.view' },
      { label: 'Coupons', path: '/admin/coupons', icon: 'ticket', permission: 'coupons.view' },
    ],
  },
  {
    heading: 'Inventory',
    items: [
      { label: 'Stock', path: '/admin/inventory', icon: 'box', permission: 'inventory.view' },
      { label: 'Movement Logs', path: '/admin/inventory-logs', icon: 'list', permission: 'inventory.view' },
      { label: 'Suppliers', path: '/admin/suppliers', icon: 'truck', permission: 'inventory.view' },
    ],
  },
  {
    heading: 'People',
    items: [
      { label: 'Customers', path: '/admin/customers', icon: 'users', permission: 'customers.view' },
      { label: 'Staff', path: '/admin/staff', icon: 'badge', permission: 'staff.view' },
      { label: 'Users', path: '/admin/users', icon: 'user', permission: 'users.view' },
      { label: 'Roles', path: '/admin/roles', icon: 'shield', permission: 'roles.view' },
      { label: 'Permissions', path: '/admin/permissions', icon: 'key', permission: 'roles.view' },
    ],
  },
  {
    heading: 'Content',
    items: [
      { label: 'Reviews', path: '/admin/reviews', icon: 'star', permission: 'reviews.view' },
      { label: 'Testimonials', path: '/admin/testimonials', icon: 'quote', permission: 'content.view' },
      { label: 'Gallery', path: '/admin/gallery', icon: 'image', permission: 'content.view' },
      { label: 'Journal', path: '/admin/blogs', icon: 'pen', permission: 'content.view' },
      { label: 'FAQs', path: '/admin/faqs', icon: 'help', permission: 'content.view' },
      { label: 'Messages', path: '/admin/messages', icon: 'mail', permission: 'content.view' },
    ],
  },
  {
    heading: 'System',
    items: [
      { label: 'Restaurant Settings', path: '/admin/settings', icon: 'settings', permission: 'settings.view' },
      { label: 'Working Hours', path: '/admin/working-hours', icon: 'clock', permission: 'settings.view' },
      { label: 'Notifications', path: '/admin/notifications', icon: 'bell' },
      { label: 'System Logs', path: '/admin/logs', icon: 'terminal', permission: 'logs.view' },
      { label: 'My Profile', path: '/admin/profile', icon: 'user-circle' },
    ],
  },
];

export const ACCOUNT_NAV: NavLink[] = [
  { label: 'Overview', path: '/account', icon: 'grid', exact: true },
  { label: 'My Orders', path: '/account/orders', icon: 'bag' },
  { label: 'Reservations', path: '/account/reservations', icon: 'calendar' },
  { label: 'Wishlist', path: '/account/wishlist', icon: 'heart' },
  { label: 'Addresses', path: '/account/addresses', icon: 'map' },
  { label: 'My Reviews', path: '/account/reviews', icon: 'star' },
  { label: 'Coupons', path: '/account/coupons', icon: 'ticket' },
  { label: 'Notifications', path: '/account/notifications', icon: 'bell' },
  { label: 'Settings', path: '/account/settings', icon: 'settings' },
];
