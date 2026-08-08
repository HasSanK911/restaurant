import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, of, shareReplay } from 'rxjs';
import { API } from '../constants/api.constants';
import { ID, Paginated, QueryParams } from '../models/common.model';
import {
  AppNotification,
  Banner,
  BlogPost,
  Branch,
  CateringPackage,
  Chef,
  ContactMessage,
  EventListing,
  Faq,
  GalleryImage,
  JobOpening,
  Offer,
  Review,
  SystemLogEntry,
  Testimonial,
} from '../models/content.model';
import { Coupon } from '../models/order.model';
import { ApiService } from './api.service';

/**
 * Read-mostly marketing content. Small collections are cached as signals so
 * the footer, home page and mega menu can render without their own requests.
 */
@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly api = inject(ApiService);

  private cached<T>(path: string, params?: QueryParams): Observable<T[]> {
    return this.api.all<T>(path, params).pipe(
      catchError(() => of([] as T[])),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
  }

  readonly banners = toSignal(
    this.cached<Banner>(API.banners, { isActive: true, _sort: 'sortOrder' }),
    { initialValue: [] as Banner[] },
  );

  readonly offers = toSignal(this.cached<Offer>(API.offers, { isActive: true }), {
    initialValue: [] as Offer[],
  });

  readonly testimonials = toSignal(
    this.cached<Testimonial>(API.testimonials, { isApproved: true }),
    { initialValue: [] as Testimonial[] },
  );

  readonly chefs = toSignal(this.cached<Chef>(API.chefs), { initialValue: [] as Chef[] });

  readonly gallery = toSignal(this.cached<GalleryImage>(API.gallery, { _sort: 'sortOrder' }), {
    initialValue: [] as GalleryImage[],
  });

  readonly faqs = toSignal(this.cached<Faq>(API.faq, { isPublished: true, _sort: 'sortOrder' }), {
    initialValue: [] as Faq[],
  });

  readonly branches = toSignal(this.cached<Branch>(API.branches), {
    initialValue: [] as Branch[],
  });

  // ------------------------------------------------------------- blogs ----

  blogs(params?: QueryParams): Observable<Paginated<BlogPost>> {
    return this.api.list<BlogPost>(API.blogs, { isPublished: true, _sort: '-publishedAt', ...params });
  }

  allBlogs(params?: QueryParams): Observable<BlogPost[]> {
    return this.api.all<BlogPost>(API.blogs, { _sort: '-publishedAt', ...params });
  }

  blogBySlug(slug: string): Observable<BlogPost | undefined> {
    return this.api.byField<BlogPost>(API.blogs, 'slug', slug);
  }

  // ------------------------------------------------------------ offers ----

  offerBySlug(slug: string): Observable<Offer | undefined> {
    return this.api.byField<Offer>(API.offers, 'slug', slug);
  }

  // ------------------------------------------------------------ events ----

  events(): Observable<EventListing[]> {
    return this.api.all<EventListing>(API.events, { isPublished: true, _sort: 'startsAt' });
  }

  eventBySlug(slug: string): Observable<EventListing | undefined> {
    return this.api.byField<EventListing>(API.events, 'slug', slug);
  }

  // ---------------------------------------------------------- catering ----

  cateringPackages(): Observable<CateringPackage[]> {
    return this.api.all<CateringPackage>(API.cateringPackages, { isActive: true });
  }

  // ------------------------------------------------------------- jobs -----

  jobs(): Observable<JobOpening[]> {
    return this.api.all<JobOpening>(API.jobs);
  }

  jobBySlug(slug: string): Observable<JobOpening | undefined> {
    return this.api.byField<JobOpening>(API.jobs, 'slug', slug);
  }

  // ----------------------------------------------------------- reviews ----

  reviews(params?: QueryParams): Observable<Review[]> {
    return this.api.all<Review>(API.reviews, { _sort: '-createdAt', ...params });
  }

  reviewsForItem(menuItemId: ID): Observable<Review[]> {
    return this.api.all<Review>(API.reviews, { menuItemId, isApproved: true, _sort: '-createdAt' });
  }

  submitReview(review: Omit<Review, 'id'>): Observable<Review> {
    return this.api.post<Review>(API.reviews, review);
  }

  // ---------------------------------------------------------- coupons -----

  coupons(): Observable<Coupon[]> {
    return this.api.all<Coupon>(API.coupons);
  }

  couponByCode(code: string): Observable<Coupon | undefined> {
    return this.api.byField<Coupon>(API.coupons, 'code', code.trim().toUpperCase());
  }

  // ---------------------------------------------------------- contact -----

  sendMessage(message: Omit<ContactMessage, 'id'>): Observable<ContactMessage> {
    return this.api.post<ContactMessage>(API.contactMessages, message);
  }

  messages(params?: QueryParams): Observable<ContactMessage[]> {
    return this.api.all<ContactMessage>(API.contactMessages, { _sort: '-createdAt', ...params });
  }

  // ----------------------------------------------------- notifications ----

  notifications(params?: QueryParams): Observable<AppNotification[]> {
    return this.api.all<AppNotification>(API.notifications, { _sort: '-createdAt', ...params });
  }

  markNotificationRead(id: ID): Observable<AppNotification> {
    return this.api.patch<AppNotification>(API.notifications, id, { isRead: true });
  }

  // --------------------------------------------------------- sys logs -----

  systemLogs(params?: QueryParams): Observable<SystemLogEntry[]> {
    return this.api.all<SystemLogEntry>(API.systemLogs, { _sort: '-createdAt', ...params });
  }
}
