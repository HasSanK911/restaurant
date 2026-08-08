import { ID, IsoDateTime, Money, Timestamped } from './common.model';

export interface Banner extends Timestamped {
  id: ID;
  title: string;
  subtitle: string;
  eyebrow: string;
  image: string;
  ctaLabel: string;
  ctaLink: string;
  secondaryCtaLabel?: string;
  secondaryCtaLink?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Offer extends Timestamped {
  id: ID;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  badge: string;
  originalPrice?: Money;
  offerPrice?: Money;
  discountPercent?: number;
  couponCode?: string;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  terms: string[];
  isActive: boolean;
  isFeatured: boolean;
}

export interface Chef extends Timestamped {
  id: ID;
  slug: string;
  name: string;
  title: string;
  bio: string;
  photo: string;
  yearsExperience: number;
  specialities: string[];
  signatureItemIds: ID[];
  quote: string;
  isFeatured: boolean;
}

export interface Testimonial extends Timestamped {
  id: ID;
  name: string;
  location: string;
  avatar?: string;
  rating: number;
  title: string;
  quote: string;
  visitContext: string;
  isFeatured: boolean;
  isApproved: boolean;
}

export interface Review extends Timestamped {
  id: ID;
  menuItemId: ID | null;
  orderId: ID | null;
  customerId: ID | null;
  customerName: string;
  rating: number;
  title: string;
  body: string;
  images: string[];
  isApproved: boolean;
  reply?: string;
  repliedAt?: IsoDateTime;
  helpfulCount: number;
}

export type GalleryCategory =
  | 'interior'
  | 'exterior'
  | 'food'
  | 'bbq'
  | 'ambience'
  | 'events'
  | 'brand';

export interface GalleryImage extends Timestamped {
  id: ID;
  title: string;
  caption: string;
  image: string;
  category: GalleryCategory;
  width: number;
  height: number;
  sortOrder: number;
  isFeatured: boolean;
}

export interface BlogPost extends Timestamped {
  id: ID;
  slug: string;
  title: string;
  excerpt: string;
  /** Markdown-lite: paragraphs, `## ` headings and `- ` bullets. */
  body: string;
  coverImage: string;
  authorName: string;
  authorTitle: string;
  authorAvatar?: string;
  category: string;
  tags: string[];
  readMinutes: number;
  publishedAt: IsoDateTime;
  isPublished: boolean;
  isFeatured: boolean;
  seoTitle?: string;
  seoDescription?: string;
}

export interface Faq extends Timestamped {
  id: ID;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isPublished: boolean;
}

export interface ContactMessage extends Timestamped {
  id: ID;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  topic: 'general' | 'catering' | 'feedback' | 'complaint' | 'careers' | 'partnership';
  status: 'new' | 'read' | 'replied' | 'archived';
  reply?: string;
  repliedAt?: IsoDateTime;
}

export interface EventListing extends Timestamped {
  id: ID;
  slug: string;
  title: string;
  description: string;
  image: string;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  venue: string;
  capacity: number;
  pricePerHead: Money | null;
  highlights: string[];
  isPublished: boolean;
}

export interface CateringPackage extends Timestamped {
  id: ID;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  image: string;
  pricePerHead: Money;
  minGuests: number;
  courses: string[];
  includes: string[];
  isPopular: boolean;
  isActive: boolean;
}

export interface JobOpening extends Timestamped {
  id: ID;
  slug: string;
  title: string;
  department: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  experience: string;
  salaryRange: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  isOpen: boolean;
}

export interface Branch extends Timestamped {
  id: ID;
  slug: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  image: string;
  status: 'open' | 'coming-soon';
  openingDate?: string;
  mapUrl: string;
}

export type NotificationKind =
  | 'order'
  | 'reservation'
  | 'inventory'
  | 'review'
  | 'system'
  | 'promotion';

export interface AppNotification extends Timestamped {
  id: ID;
  /** null targets every admin-side user. */
  userId: ID | null;
  kind: NotificationKind;
  title: string;
  body: string;
  link?: string;
  isRead: boolean;
  severity: 'info' | 'success' | 'warning' | 'danger';
}

export interface SystemLogEntry extends Timestamped {
  id: ID;
  level: 'info' | 'warning' | 'error';
  actor: string;
  action: string;
  target: string;
  ip: string;
  meta?: Record<string, unknown>;
}
