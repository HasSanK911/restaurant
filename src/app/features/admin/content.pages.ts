import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { ID } from '../../core/models/common.model';
import {
  BlogPost,
  ContactMessage,
  Faq,
  GalleryImage,
  Review,
  Testimonial,
} from '../../core/models/content.model';
import { AdminService } from '../../core/services/admin.service';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import {
  ResourceColumn,
  ResourceField,
  ResourcePageComponent,
} from './shared/resource-page.component';

const shortDate = (iso: string | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '--';

const stars = (rating: number) => `${rating}/5`;

/* ---------------------------------------------------------------- reviews -- */

@Component({
  selector: 'app-admin-reviews-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResourcePageComponent],
  template: `
    <app-resource-page
      eyebrow="Content"
      title="Reviews"
      description="Dish reviews left by customers. Approve before they appear on the site."
      singular="review"
      searchPlaceholder="Search by customer or wording"
      emptyIcon="star"
      [rows]="rows()"
      [loading]="loading()"
      [columns]="columns"
      [actions]="actions"
      [searchable]="searchable"
      [canDelete]="true"
      [onDelete]="remove"
      [onChanged]="refresh"
      [perPage]="20"
    />
  `,
})
export class AdminReviewsPage {
  private readonly content = inject(ContentService);
  private readonly api = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);
  private readonly reload = signal(0);

  protected readonly rows = toSignal(
    toObservable(this.reload).pipe(switchMap(() => this.api.reviews())),
    { initialValue: [] as Review[] },
  );
  protected readonly loading = computed(() => this.rows().length === 0 && this.reload() === 0);

  protected readonly columns: ResourceColumn<Review>[] = [
    { header: 'Customer', kind: 'strong', value: (r) => r.customerName, sub: (r) => shortDate(r.createdAt) },
    { header: 'Rating', value: (r) => stars(r.rating) },
    { header: 'Review', kind: 'strong', value: (r) => r.title, sub: (r) => r.body, hideBelow: 'md' },
    { header: 'Helpful', kind: 'muted', value: (r) => r.helpfulCount, hideBelow: 'lg' },
    {
      header: 'Reply',
      kind: 'status',
      value: (r) => (r.reply ? 'Replied' : 'No reply'),
      tone: (r) => (r.reply ? 'basil' : 'ink'),
      hideBelow: 'lg',
    },
    {
      header: 'Published',
      kind: 'toggle',
      value: () => '',
      checked: (r) => r.isApproved,
      onToggle: (r, v) => this.setApproved(r, v),
    },
  ];

  protected readonly actions = [
    {
      icon: 'quote' as const,
      label: 'Reply to this review',
      run: (row: Review) => this.reply(row),
    },
  ];

  protected readonly searchable = (r: Review) => `${r.customerName} ${r.title} ${r.body}`;
  protected readonly remove = (id: ID) => this.api.deleteReview(id);
  protected readonly refresh = () => this.reload.update((n) => n + 1);

  constructor() {
    this.seo.apply({ title: 'Reviews | Salateen Admin', description: '', path: 'admin/reviews', noIndex: true });
  }

  private setApproved(review: Review, isApproved: boolean): void {
    this.api.updateReview(review.id, { isApproved }).subscribe({
      next: () => this.refresh(),
      error: () => this.toast.error('That did not save'),
    });
  }

  private reply(review: Review): void {
    this.toast.info(
      'Replying to reviews',
      `Use the customer's own words. "${review.title}" from ${review.customerName}.`,
    );
  }
}

/* ----------------------------------------------------------- testimonials -- */

@Component({
  selector: 'app-admin-testimonials-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResourcePageComponent],
  template: `
    <app-resource-page
      eyebrow="Content"
      title="Testimonials"
      description="Longer guest stories shown on the home page and the testimonials page."
      singular="testimonial"
      createLabel="Add testimonial"
      searchPlaceholder="Search testimonials"
      emptyIcon="quote"
      [rows]="rows()"
      [loading]="loading()"
      [columns]="columns"
      [fields]="fields"
      [searchable]="searchable"
      [canCreate]="true"
      [canEdit]="true"
      [canDelete]="true"
      [blank]="blank"
      [onCreate]="create"
      [onUpdate]="update"
      [onDelete]="remove"
      [onChanged]="refresh"
    />
  `,
})
export class AdminTestimonialsPage {
  private readonly admin = inject(AdminService);
  private readonly seo = inject(SeoService);
  private readonly reload = signal(0);

  protected readonly rows = toSignal(
    toObservable(this.reload).pipe(switchMap(() => this.admin.testimonials())),
    { initialValue: [] as Testimonial[] },
  );
  protected readonly loading = computed(() => this.rows().length === 0 && this.reload() === 0);

  protected readonly columns: ResourceColumn<Testimonial>[] = [
    { header: 'Guest', kind: 'strong', value: (r) => r.name, sub: (r) => r.location },
    { header: 'Rating', value: (r) => stars(r.rating) },
    { header: 'Quote', kind: 'strong', value: (r) => r.title, sub: (r) => r.quote, hideBelow: 'md' },
    { header: 'Context', kind: 'muted', value: (r) => r.visitContext, hideBelow: 'lg' },
    {
      header: 'Featured',
      kind: 'toggle',
      value: () => '',
      checked: (r) => r.isFeatured,
      onToggle: (r, v) => this.patch(r.id, { isFeatured: v }),
    },
    {
      header: 'Approved',
      kind: 'toggle',
      value: () => '',
      checked: (r) => r.isApproved,
      onToggle: (r, v) => this.patch(r.id, { isApproved: v }),
    },
  ];

  protected readonly fields: ResourceField[] = [
    { key: 'name', label: 'Guest name', required: true },
    { key: 'location', label: 'Location', hint: 'Swabi, Mardan, Nowshera...' },
    { key: 'rating', label: 'Rating out of 5', type: 'number' },
    { key: 'visitContext', label: 'Visit context', hint: 'Family dinner, walima, regular...' },
    { key: 'title', label: 'Headline', required: true, span: 2 },
    { key: 'quote', label: 'Quote', type: 'textarea', required: true, span: 2 },
    { key: 'isFeatured', label: 'Show on the home page', type: 'checkbox' },
    { key: 'isApproved', label: 'Approved for publication', type: 'checkbox' },
  ];

  protected readonly blank = {
    name: '',
    location: 'Swabi',
    rating: 5,
    title: '',
    quote: '',
    visitContext: '',
    isFeatured: false,
    isApproved: true,
    avatar: null,
  };

  protected readonly searchable = (r: Testimonial) => `${r.name} ${r.title} ${r.quote} ${r.location}`;
  protected readonly create = (value: Record<string, unknown>) =>
    this.admin.createTestimonial({ ...this.blank, createdAt: new Date().toISOString(), ...value } as never);
  protected readonly update = (id: ID, value: Record<string, unknown>) =>
    this.admin.updateTestimonial(id, value as never);
  protected readonly remove = (id: ID) => this.admin.deleteTestimonial(id);
  protected readonly refresh = () => this.reload.update((n) => n + 1);

  constructor() {
    this.seo.apply({
      title: 'Testimonials | Salateen Admin',
      description: '',
      path: 'admin/testimonials',
      noIndex: true,
    });
  }

  private patch(id: ID, value: Partial<Testimonial>): void {
    this.admin.updateTestimonial(id, value).subscribe(() => this.refresh());
  }
}

/* ---------------------------------------------------------------- gallery -- */

@Component({
  selector: 'app-admin-gallery-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResourcePageComponent],
  template: `
    <app-resource-page
      eyebrow="Content"
      title="Gallery"
      description="Photographs shown on the gallery page and across the site."
      singular="photograph"
      createLabel="Add photograph"
      searchPlaceholder="Search by title or caption"
      emptyIcon="image"
      [rows]="rows()"
      [loading]="loading()"
      [columns]="columns"
      [fields]="fields"
      [searchable]="searchable"
      [canCreate]="true"
      [canEdit]="true"
      [canDelete]="true"
      [blank]="blank"
      [onCreate]="create"
      [onUpdate]="update"
      [onDelete]="remove"
      [onChanged]="refresh"
      [perPage]="20"
    />
  `,
})
export class AdminGalleryPage {
  private readonly admin = inject(AdminService);
  private readonly seo = inject(SeoService);
  private readonly reload = signal(0);

  protected readonly rows = toSignal(
    toObservable(this.reload).pipe(switchMap(() => this.admin.galleryImages())),
    { initialValue: [] as GalleryImage[] },
  );
  protected readonly loading = computed(() => this.rows().length === 0 && this.reload() === 0);

  protected readonly columns: ResourceColumn<GalleryImage>[] = [
    { header: 'Photograph', kind: 'image', value: (r) => r.image, sub: (r) => r.title },
    { header: 'Category', kind: 'muted', value: (r) => r.category },
    { header: 'Caption', kind: 'muted', value: (r) => r.caption, hideBelow: 'md' },
    { header: 'Order', kind: 'muted', value: (r) => r.sortOrder, hideBelow: 'lg' },
    {
      header: 'Featured',
      kind: 'toggle',
      value: () => '',
      checked: (r) => r.isFeatured,
      onToggle: (r, v) => this.patch(r.id, { isFeatured: v }),
    },
  ];

  protected readonly fields: ResourceField[] = [
    { key: 'title', label: 'Title', required: true },
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      options: [
        { value: 'food', label: 'Food' },
        { value: 'bbq', label: 'BBQ' },
        { value: 'interior', label: 'Interior' },
        { value: 'exterior', label: 'Exterior' },
        { value: 'ambience', label: 'Ambience' },
        { value: 'events', label: 'Events' },
        { value: 'brand', label: 'Brand' },
      ],
    },
    { key: 'image', label: 'Image path', span: 2, hint: 'assets/images/food/... (no extension)' },
    { key: 'caption', label: 'Caption', type: 'textarea', span: 2 },
    { key: 'sortOrder', label: 'Sort order', type: 'number' },
    { key: 'isFeatured', label: 'Feature it', type: 'checkbox' },
  ];

  protected readonly blank = {
    title: '',
    caption: '',
    image: 'assets/images/food/karahi-closeup',
    category: 'food',
    width: 1600,
    height: 1200,
    sortOrder: 99,
    isFeatured: false,
  };

  protected readonly searchable = (r: GalleryImage) => `${r.title} ${r.caption} ${r.category}`;
  protected readonly create = (value: Record<string, unknown>) =>
    this.admin.createGalleryImage({ ...this.blank, createdAt: new Date().toISOString(), ...value } as never);
  protected readonly update = (id: ID, value: Record<string, unknown>) =>
    this.admin.updateGalleryImage(id, value as never);
  protected readonly remove = (id: ID) => this.admin.deleteGalleryImage(id);
  protected readonly refresh = () => this.reload.update((n) => n + 1);

  constructor() {
    this.seo.apply({ title: 'Gallery | Salateen Admin', description: '', path: 'admin/gallery', noIndex: true });
  }

  private patch(id: ID, value: Partial<GalleryImage>): void {
    this.admin.updateGalleryImage(id, value).subscribe(() => this.refresh());
  }
}

/* ------------------------------------------------------------------ blogs -- */

@Component({
  selector: 'app-admin-blogs-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResourcePageComponent],
  template: `
    <app-resource-page
      eyebrow="Content"
      title="Journal"
      description="Long-form articles. Bodies support ## headings, - bullets and *emphasis*."
      singular="article"
      createLabel="Write an article"
      searchPlaceholder="Search articles"
      emptyIcon="pen"
      [rows]="rows()"
      [loading]="loading()"
      [columns]="columns"
      [fields]="fields"
      [searchable]="searchable"
      [canCreate]="true"
      [canEdit]="true"
      [canDelete]="true"
      [blank]="blank"
      [onCreate]="create"
      [onUpdate]="update"
      [onDelete]="remove"
      [onChanged]="refresh"
    />
  `,
})
export class AdminBlogsPage {
  private readonly admin = inject(AdminService);
  private readonly seo = inject(SeoService);
  private readonly reload = signal(0);

  protected readonly rows = toSignal(
    toObservable(this.reload).pipe(switchMap(() => this.admin.blogPosts())),
    { initialValue: [] as BlogPost[] },
  );
  protected readonly loading = computed(() => this.rows().length === 0 && this.reload() === 0);

  protected readonly columns: ResourceColumn<BlogPost>[] = [
    { header: 'Article', kind: 'image', value: (r) => r.coverImage, sub: (r) => r.title },
    { header: 'Category', kind: 'muted', value: (r) => r.category, hideBelow: 'md' },
    { header: 'Author', kind: 'muted', value: (r) => r.authorName, hideBelow: 'lg' },
    { header: 'Read', kind: 'muted', value: (r) => `${r.readMinutes} min`, hideBelow: 'lg' },
    { header: 'Published', kind: 'date', value: (r) => shortDate(r.publishedAt), hideBelow: 'md' },
    {
      header: 'Live',
      kind: 'toggle',
      value: () => '',
      checked: (r) => r.isPublished,
      onToggle: (r, v) => this.patch(r.id, { isPublished: v }),
    },
  ];

  protected readonly fields: ResourceField[] = [
    { key: 'title', label: 'Title', required: true, span: 2 },
    { key: 'slug', label: 'Slug', required: true },
    { key: 'category', label: 'Category', hint: 'Kitchen Notes, Guides, Culture...' },
    { key: 'excerpt', label: 'Excerpt', type: 'textarea', span: 2 },
    { key: 'body', label: 'Body', type: 'textarea', span: 2, required: true },
    { key: 'coverImage', label: 'Cover image path', span: 2 },
    { key: 'authorName', label: 'Author' },
    { key: 'authorTitle', label: 'Author title' },
    { key: 'readMinutes', label: 'Read minutes', type: 'number' },
    { key: 'isPublished', label: 'Publish it', type: 'checkbox' },
  ];

  protected readonly blank = {
    title: '',
    slug: '',
    excerpt: '',
    body: '',
    coverImage: 'assets/images/bbq/open-fire-karahi',
    authorName: 'Gulzar Ahmad',
    authorTitle: 'Head Chef',
    category: 'Kitchen Notes',
    tags: [],
    readMinutes: 4,
    isPublished: false,
    isFeatured: false,
  };

  protected readonly searchable = (r: BlogPost) => `${r.title} ${r.excerpt} ${r.category}`;
  protected readonly create = (value: Record<string, unknown>) =>
    this.admin.createBlogPost({
      ...this.blank,
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      ...value,
    } as never);
  protected readonly update = (id: ID, value: Record<string, unknown>) =>
    this.admin.updateBlogPost(id, value as never);
  protected readonly remove = (id: ID) => this.admin.deleteBlogPost(id);
  protected readonly refresh = () => this.reload.update((n) => n + 1);

  constructor() {
    this.seo.apply({ title: 'Journal | Salateen Admin', description: '', path: 'admin/blogs', noIndex: true });
  }

  private patch(id: ID, value: Partial<BlogPost>): void {
    this.admin.updateBlogPost(id, value).subscribe(() => this.refresh());
  }
}

/* ------------------------------------------------------------------- faqs -- */

@Component({
  selector: 'app-admin-faqs-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResourcePageComponent],
  template: `
    <app-resource-page
      eyebrow="Content"
      title="FAQs"
      description="Answers shown on the FAQ page. These also feed the FAQ structured data Google reads."
      singular="question"
      createLabel="Add question"
      searchPlaceholder="Search questions"
      emptyIcon="help"
      [rows]="rows()"
      [loading]="loading()"
      [columns]="columns"
      [fields]="fields"
      [searchable]="searchable"
      [canCreate]="true"
      [canEdit]="true"
      [canDelete]="true"
      [blank]="blank"
      [onCreate]="create"
      [onUpdate]="update"
      [onDelete]="remove"
      [onChanged]="refresh"
      [perPage]="25"
    />
  `,
})
export class AdminFaqsPage {
  private readonly admin = inject(AdminService);
  private readonly seo = inject(SeoService);
  private readonly reload = signal(0);

  protected readonly rows = toSignal(
    toObservable(this.reload).pipe(switchMap(() => this.admin.faqs())),
    { initialValue: [] as Faq[] },
  );
  protected readonly loading = computed(() => this.rows().length === 0 && this.reload() === 0);

  protected readonly columns: ResourceColumn<Faq>[] = [
    { header: 'Question', kind: 'strong', value: (r) => r.question, sub: (r) => r.answer },
    { header: 'Category', kind: 'muted', value: (r) => r.category },
    { header: 'Order', kind: 'muted', value: (r) => r.sortOrder, hideBelow: 'md' },
    {
      header: 'Published',
      kind: 'toggle',
      value: () => '',
      checked: (r) => r.isPublished,
      onToggle: (r, v) => this.patch(r.id, { isPublished: v }),
    },
  ];

  protected readonly fields: ResourceField[] = [
    { key: 'question', label: 'Question', required: true, span: 2 },
    { key: 'answer', label: 'Answer', type: 'textarea', required: true, span: 2 },
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      options: [
        { value: 'Ordering', label: 'Ordering' },
        { value: 'Menu', label: 'Menu' },
        { value: 'Reservations', label: 'Reservations' },
        { value: 'Visiting', label: 'Visiting' },
        { value: 'Catering', label: 'Catering' },
        { value: 'General', label: 'General' },
      ],
    },
    { key: 'sortOrder', label: 'Sort order', type: 'number' },
    { key: 'isPublished', label: 'Publish it', type: 'checkbox' },
  ];

  protected readonly blank = {
    question: '',
    answer: '',
    category: 'General',
    sortOrder: 99,
    isPublished: true,
  };

  protected readonly searchable = (r: Faq) => `${r.question} ${r.answer} ${r.category}`;
  protected readonly create = (value: Record<string, unknown>) =>
    this.admin.createFaq({ ...this.blank, createdAt: new Date().toISOString(), ...value } as never);
  protected readonly update = (id: ID, value: Record<string, unknown>) =>
    this.admin.updateFaq(id, value as never);
  protected readonly remove = (id: ID) => this.admin.deleteFaq(id);
  protected readonly refresh = () => this.reload.update((n) => n + 1);

  constructor() {
    this.seo.apply({ title: 'FAQs | Salateen Admin', description: '', path: 'admin/faqs', noIndex: true });
  }

  private patch(id: ID, value: Partial<Faq>): void {
    this.admin.updateFaq(id, value).subscribe(() => this.refresh());
  }
}

/* --------------------------------------------------------------- messages -- */

@Component({
  selector: 'app-admin-messages-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResourcePageComponent],
  template: `
    <app-resource-page
      eyebrow="Content"
      title="Messages"
      description="Enquiries sent through the contact form. Catering enquiries usually want a phone call."
      singular="message"
      searchPlaceholder="Search by name, subject or wording"
      emptyIcon="mail"
      [rows]="rows()"
      [loading]="loading()"
      [columns]="columns"
      [actions]="actions"
      [searchable]="searchable"
      [perPage]="20"
    />
  `,
})
export class AdminMessagesPage {
  private readonly content = inject(ContentService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);
  private readonly reload = signal(0);

  protected readonly rows = toSignal(
    toObservable(this.reload).pipe(switchMap(() => this.content.messages())),
    { initialValue: [] as ContactMessage[] },
  );
  protected readonly loading = computed(() => this.rows().length === 0 && this.reload() === 0);

  protected readonly columns: ResourceColumn<ContactMessage>[] = [
    { header: 'From', kind: 'strong', value: (r) => r.name, sub: (r) => r.phone },
    { header: 'Topic', kind: 'muted', value: (r) => r.topic, hideBelow: 'md' },
    { header: 'Subject', kind: 'strong', value: (r) => r.subject, sub: (r) => r.message },
    { header: 'Received', kind: 'date', value: (r) => shortDate(r.createdAt), hideBelow: 'lg' },
    {
      header: 'Status',
      kind: 'status',
      value: (r) => r.status,
      tone: (r) =>
        ({ new: 'clay', read: 'basil', replied: 'emerald', archived: 'ink' })[r.status] ?? 'ink',
    },
  ];

  protected readonly actions = [
    {
      icon: 'phone' as const,
      label: 'Call the sender',
      run: (row: ContactMessage) => {
        if (typeof window !== 'undefined') window.location.href = `tel:${row.phone}`;
      },
    },
    {
      icon: 'mail' as const,
      label: 'Email the sender',
      visible: (row: ContactMessage) => !!row.email,
      run: (row: ContactMessage) => {
        if (typeof window !== 'undefined')
          window.location.href = `mailto:${row.email}?subject=Re: ${row.subject}`;
      },
    },
    {
      icon: 'eye' as const,
      label: 'Read the full message',
      run: (row: ContactMessage) => this.toast.info(row.subject, row.message),
    },
  ];

  protected readonly searchable = (r: ContactMessage) =>
    `${r.name} ${r.subject} ${r.message} ${r.topic}`;

  constructor() {
    this.seo.apply({ title: 'Messages | Salateen Admin', description: '', path: 'admin/messages', noIndex: true });
  }
}
