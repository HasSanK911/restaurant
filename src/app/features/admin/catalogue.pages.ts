import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { ID } from '../../core/models/common.model';
import { MenuCategory, MenuItem } from '../../core/models/menu.model';
import { Coupon } from '../../core/models/order.model';
import { Offer } from '../../core/models/content.model';
import { AdminService } from '../../core/services/admin.service';
import { SeoService } from '../../core/services/seo.service';
import {
  ResourceColumn,
  ResourceField,
  ResourcePageComponent,
} from './shared/resource-page.component';

/** Formats whole rupees the way the admin tables expect. */
const money = (value: number | undefined | null) =>
  value === null || value === undefined ? '--' : `Rs ${Math.round(value).toLocaleString('en-PK')}`;

const shortDate = (iso: string | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '--';

/* ------------------------------------------------------------ categories -- */

@Component({
  selector: 'app-admin-categories-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResourcePageComponent],
  template: `
    <app-resource-page
      eyebrow="Catalogue"
      title="Categories"
      description="The sections of the menu, in the order they appear on the site."
      singular="category"
      createLabel="Add category"
      searchPlaceholder="Search categories"
      emptyIcon="layers"
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
export class AdminCategoriesPage {
  private readonly admin = inject(AdminService);
  private readonly seo = inject(SeoService);
  private readonly reload = signal(0);

  protected readonly rows = toSignal(
    toObservable(this.reload).pipe(switchMap(() => this.admin.categories())),
    { initialValue: [] as MenuCategory[] },
  );
  protected readonly loading = computed(() => this.rows().length === 0 && this.reload() === 0);

  protected readonly columns: ResourceColumn<MenuCategory>[] = [
    { header: 'Category', kind: 'image', value: (r) => r.image, sub: (r) => r.name },
    { header: 'Slug', kind: 'muted', value: (r) => r.slug, hideBelow: 'md' },
    { header: 'Urdu', value: (r) => r.nameUrdu ?? '--', hideBelow: 'lg' },
    { header: 'Order', kind: 'muted', value: (r) => r.sortOrder },
    {
      header: 'Featured',
      kind: 'toggle',
      value: () => '',
      checked: (r) => r.isFeatured,
      onToggle: (r, v) => this.patch(r.id, { isFeatured: v }),
    },
    {
      header: 'Active',
      kind: 'toggle',
      value: () => '',
      checked: (r) => r.isActive,
      onToggle: (r, v) => this.patch(r.id, { isActive: v }),
    },
  ];

  protected readonly fields: ResourceField[] = [
    { key: 'name', label: 'Name', required: true },
    { key: 'slug', label: 'Slug', required: true, hint: 'Used in the URL, e.g. chapli-kabab' },
    { key: 'nameUrdu', label: 'Urdu name' },
    { key: 'icon', label: 'Icon', hint: 'flame, kabab, pot, rice, bowl, bread, cup...' },
    { key: 'image', label: 'Image path', span: 2, hint: 'assets/images/food/...' },
    { key: 'description', label: 'Description', type: 'textarea', span: 2 },
    { key: 'sortOrder', label: 'Sort order', type: 'number' },
    { key: 'isFeatured', label: 'Show on the home page', type: 'checkbox' },
  ];

  protected readonly blank = {
    name: '',
    slug: '',
    nameUrdu: '',
    icon: 'utensils',
    image: 'assets/images/food/karahi-closeup',
    description: '',
    sortOrder: 99,
    isFeatured: false,
    isActive: true,
  };

  protected readonly searchable = (r: MenuCategory) => `${r.name} ${r.slug} ${r.description}`;
  protected readonly create = (value: Record<string, unknown>) =>
    this.admin.createCategory({ ...this.blank, ...value, createdAt: new Date().toISOString() } as never);
  protected readonly update = (id: ID, value: Record<string, unknown>) =>
    this.admin.updateCategory(id, value as never);
  protected readonly remove = (id: ID) => this.admin.deleteCategory(id);
  protected readonly refresh = () => this.reload.update((n) => n + 1);

  constructor() {
    this.seo.apply({ title: 'Categories | Salateen Admin', description: '', path: 'admin/categories', noIndex: true });
  }

  private patch(id: ID, value: Partial<MenuCategory>): void {
    this.admin.updateCategory(id, value).subscribe(() => this.refresh());
  }
}

/* ------------------------------------------------------------ menu items -- */

@Component({
  selector: 'app-admin-menu-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResourcePageComponent],
  template: `
    <app-resource-page
      eyebrow="Catalogue"
      title="Menu items"
      description="Every dish, its price and whether the kitchen can send it today."
      singular="dish"
      createLabel="Add dish"
      searchPlaceholder="Search dishes"
      emptyIcon="utensils"
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
export class AdminMenuPage {
  private readonly admin = inject(AdminService);
  private readonly seo = inject(SeoService);
  private readonly reload = signal(0);

  private readonly data = toSignal(
    toObservable(this.reload).pipe(switchMap(() => this.admin.menuItems())),
    { initialValue: [] as MenuItem[] },
  );
  private readonly categories = toSignal(this.admin.categories(), {
    initialValue: [] as MenuCategory[],
  });

  protected readonly rows = this.data;
  protected readonly loading = computed(() => this.rows().length === 0 && this.reload() === 0);

  protected readonly columns: ResourceColumn<MenuItem>[] = [
    { header: 'Dish', kind: 'image', value: (r) => r.image, sub: (r) => r.name },
    { header: 'Category', kind: 'muted', value: (r) => this.categoryName(r.categoryId), hideBelow: 'md' },
    { header: 'From', kind: 'money', value: (r) => money(r.basePrice) },
    { header: 'Sizes', kind: 'muted', value: (r) => r.variants.length, hideBelow: 'lg' },
    { header: 'Ordered', kind: 'muted', value: (r) => r.orderCount.toLocaleString('en-PK'), hideBelow: 'lg' },
    { header: 'Rating', value: (r) => r.rating.toFixed(1), sub: (r) => `${r.ratingCount} reviews`, hideBelow: 'md' },
    {
      header: 'Available',
      kind: 'toggle',
      value: () => '',
      checked: (r) => r.isAvailable,
      onToggle: (r, v) => this.patch(r.id, { isAvailable: v }),
    },
    {
      header: 'Featured',
      kind: 'toggle',
      value: () => '',
      checked: (r) => r.isFeatured,
      onToggle: (r, v) => this.patch(r.id, { isFeatured: v }),
      hideBelow: 'md',
    },
  ];

  protected readonly fields: ResourceField[] = [
    { key: 'name', label: 'Name', required: true },
    { key: 'slug', label: 'Slug', required: true },
    { key: 'nameUrdu', label: 'Urdu name' },
    { key: 'basePrice', label: 'Base price (Rs)', type: 'number', required: true },
    { key: 'shortDescription', label: 'Short description', type: 'textarea', span: 2 },
    { key: 'description', label: 'Full description', type: 'textarea', span: 2 },
    { key: 'image', label: 'Image path', span: 2 },
    { key: 'prepTimeMinutes', label: 'Prep minutes', type: 'number' },
    { key: 'spiceLevel', label: 'Spice level', type: 'number', hint: '0 mild to 3 fiery' },
    { key: 'isAvailable', label: 'Available today', type: 'checkbox' },
    { key: 'isChefRecommended', label: "Chef's recommendation", type: 'checkbox' },
  ];

  protected readonly blank = {
    name: '',
    slug: '',
    nameUrdu: '',
    basePrice: 0,
    shortDescription: '',
    description: '',
    image: 'assets/images/food/karahi-closeup',
    prepTimeMinutes: 25,
    spiceLevel: 1,
    isAvailable: true,
    isChefRecommended: false,
  };

  protected readonly searchable = (r: MenuItem) => `${r.name} ${r.slug} ${r.shortDescription}`;
  protected readonly create = (value: Record<string, unknown>) =>
    this.admin.createMenuItem({
      ...this.blank,
      categoryId: this.categories()[0]?.id ?? '1',
      gallery: [],
      variants: [
        { id: 'v1', label: 'Standard', price: Number(value['basePrice'] ?? 0), serves: 1, isDefault: true },
      ],
      addons: [],
      tags: ['halal'],
      ingredients: [],
      allergens: [],
      rating: 0,
      ratingCount: 0,
      orderCount: 0,
      isFeatured: false,
      isPopular: false,
      isNew: true,
      sortOrder: 99,
      createdAt: new Date().toISOString(),
      ...value,
    } as never);
  protected readonly update = (id: ID, value: Record<string, unknown>) =>
    this.admin.updateMenuItem(id, value as never);
  protected readonly remove = (id: ID) => this.admin.deleteMenuItem(id);
  protected readonly refresh = () => this.reload.update((n) => n + 1);

  constructor() {
    this.seo.apply({ title: 'Menu Items | Salateen Admin', description: '', path: 'admin/menu', noIndex: true });
  }

  private categoryName(id: ID): string {
    return this.categories().find((c) => c.id === id)?.name ?? '--';
  }

  private patch(id: ID, value: Partial<MenuItem>): void {
    this.admin.updateMenuItem(id, value).subscribe(() => this.refresh());
  }
}

/* ---------------------------------------------------------------- offers -- */

@Component({
  selector: 'app-admin-offers-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResourcePageComponent],
  template: `
    <app-resource-page
      eyebrow="Catalogue"
      title="Offers"
      description="Promotions shown on the home page and the offers page."
      singular="offer"
      createLabel="Add offer"
      searchPlaceholder="Search offers"
      emptyIcon="tag"
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
export class AdminOffersPage {
  private readonly admin = inject(AdminService);
  private readonly seo = inject(SeoService);
  private readonly reload = signal(0);

  protected readonly rows = toSignal(
    toObservable(this.reload).pipe(switchMap(() => this.admin.offers())),
    { initialValue: [] as Offer[] },
  );
  protected readonly loading = computed(() => this.rows().length === 0 && this.reload() === 0);

  protected readonly columns: ResourceColumn<Offer>[] = [
    { header: 'Offer', kind: 'image', value: (r) => r.image, sub: (r) => r.title },
    { header: 'Badge', kind: 'muted', value: (r) => r.badge, hideBelow: 'md' },
    { header: 'Price', kind: 'money', value: (r) => (r.offerPrice ? money(r.offerPrice) : r.discountPercent ? `${r.discountPercent}%` : '--') },
    { header: 'Code', kind: 'muted', value: (r) => r.couponCode ?? '--', hideBelow: 'lg' },
    { header: 'Ends', kind: 'date', value: (r) => shortDate(r.endsAt), hideBelow: 'md' },
    {
      header: 'Status',
      kind: 'status',
      value: (r) => (this.isLive(r) ? 'Running' : 'Ended'),
      tone: (r) => (this.isLive(r) ? 'emerald' : 'ink'),
    },
    {
      header: 'Featured',
      kind: 'toggle',
      value: () => '',
      checked: (r) => r.isFeatured,
      onToggle: (r, v) => this.patch(r.id, { isFeatured: v }),
      hideBelow: 'md',
    },
  ];

  protected readonly fields: ResourceField[] = [
    { key: 'title', label: 'Title', required: true },
    { key: 'slug', label: 'Slug', required: true },
    { key: 'subtitle', label: 'Subtitle', span: 2 },
    { key: 'description', label: 'Description', type: 'textarea', span: 2 },
    { key: 'badge', label: 'Badge', hint: 'Fridays only, Always on...' },
    { key: 'couponCode', label: 'Coupon code' },
    { key: 'originalPrice', label: 'Original price (Rs)', type: 'number' },
    { key: 'offerPrice', label: 'Offer price (Rs)', type: 'number' },
    { key: 'discountPercent', label: 'Discount %', type: 'number' },
    { key: 'image', label: 'Image path', span: 2 },
    { key: 'endsAt', label: 'Ends on', type: 'date' },
    { key: 'isFeatured', label: 'Feature on the home page', type: 'checkbox' },
  ];

  protected readonly blank = {
    title: '',
    slug: '',
    subtitle: '',
    description: '',
    badge: 'Limited time',
    couponCode: '',
    image: 'assets/images/food/grand-platter',
    terms: [],
    isActive: true,
    isFeatured: false,
  };

  protected readonly searchable = (r: Offer) => `${r.title} ${r.slug} ${r.badge} ${r.couponCode ?? ''}`;
  protected readonly create = (value: Record<string, unknown>) =>
    this.admin.createOffer({
      ...this.blank,
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 30 * 864e5).toISOString(),
      createdAt: new Date().toISOString(),
      ...value,
    } as never);
  protected readonly update = (id: ID, value: Record<string, unknown>) =>
    this.admin.updateOffer(id, value as never);
  protected readonly remove = (id: ID) => this.admin.deleteOffer(id);
  protected readonly refresh = () => this.reload.update((n) => n + 1);

  constructor() {
    this.seo.apply({ title: 'Offers | Salateen Admin', description: '', path: 'admin/offers', noIndex: true });
  }

  private isLive(offer: Offer): boolean {
    return offer.isActive && new Date(offer.endsAt).getTime() > Date.now();
  }

  private patch(id: ID, value: Partial<Offer>): void {
    this.admin.updateOffer(id, value).subscribe(() => this.refresh());
  }
}

/* --------------------------------------------------------------- coupons -- */

@Component({
  selector: 'app-admin-coupons-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResourcePageComponent],
  template: `
    <app-resource-page
      eyebrow="Catalogue"
      title="Coupons"
      description="Discount codes customers enter at checkout."
      singular="coupon"
      createLabel="Add coupon"
      searchPlaceholder="Search by code or title"
      emptyIcon="ticket"
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
export class AdminCouponsPage {
  private readonly admin = inject(AdminService);
  private readonly seo = inject(SeoService);
  private readonly reload = signal(0);

  protected readonly rows = toSignal(
    toObservable(this.reload).pipe(switchMap(() => this.admin.coupons())),
    { initialValue: [] as Coupon[] },
  );
  protected readonly loading = computed(() => this.rows().length === 0 && this.reload() === 0);

  protected readonly columns: ResourceColumn<Coupon>[] = [
    { header: 'Code', kind: 'strong', value: (r) => r.code, sub: (r) => r.title },
    { header: 'Type', kind: 'muted', value: (r) => this.typeLabel(r), hideBelow: 'md' },
    { header: 'Min order', kind: 'money', value: (r) => money(r.minimumOrder) },
    { header: 'Used', value: (r) => `${r.usedCount}${r.usageLimit ? ' / ' + r.usageLimit : ''}`, hideBelow: 'md' },
    { header: 'Expires', kind: 'date', value: (r) => shortDate(r.expiresAt), hideBelow: 'lg' },
    {
      header: 'Status',
      kind: 'status',
      value: (r) => (this.isLive(r) ? 'Active' : 'Expired'),
      tone: (r) => (this.isLive(r) ? 'emerald' : 'red'),
    },
  ];

  protected readonly fields: ResourceField[] = [
    { key: 'code', label: 'Code', required: true, hint: 'Uppercase, no spaces' },
    { key: 'title', label: 'Title', required: true },
    { key: 'description', label: 'Description', type: 'textarea', span: 2 },
    {
      key: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { value: 'percentage', label: 'Percentage off' },
        { value: 'fixed', label: 'Fixed amount off' },
        { value: 'free-delivery', label: 'Free delivery' },
      ],
    },
    { key: 'value', label: 'Value', type: 'number', hint: 'Percent, or rupees for fixed' },
    { key: 'minimumOrder', label: 'Minimum order (Rs)', type: 'number' },
    { key: 'maxDiscount', label: 'Maximum discount (Rs)', type: 'number' },
    { key: 'usageLimit', label: 'Total uses', type: 'number', hint: '0 for unlimited' },
    { key: 'perCustomerLimit', label: 'Uses per customer', type: 'number' },
    { key: 'expiresAt', label: 'Expires on', type: 'date' },
    { key: 'isActive', label: 'Active', type: 'checkbox' },
  ];

  protected readonly blank = {
    code: '',
    title: '',
    description: '',
    type: 'percentage',
    value: 10,
    minimumOrder: 1000,
    maxDiscount: 500,
    usageLimit: 100,
    perCustomerLimit: 1,
    usedCount: 0,
    isActive: true,
  };

  protected readonly searchable = (r: Coupon) => `${r.code} ${r.title} ${r.description}`;
  protected readonly create = (value: Record<string, unknown>) =>
    this.admin.createCoupon({
      ...this.blank,
      startsAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 90 * 864e5).toISOString(),
      createdAt: new Date().toISOString(),
      ...value,
      code: String(value['code'] ?? '').toUpperCase(),
    } as never);
  protected readonly update = (id: ID, value: Record<string, unknown>) =>
    this.admin.updateCoupon(id, {
      ...value,
      ...(value['code'] ? { code: String(value['code']).toUpperCase() } : {}),
    } as never);
  protected readonly remove = (id: ID) => this.admin.deleteCoupon(id);
  protected readonly refresh = () => this.reload.update((n) => n + 1);

  constructor() {
    this.seo.apply({ title: 'Coupons | Salateen Admin', description: '', path: 'admin/coupons', noIndex: true });
  }

  private typeLabel(coupon: Coupon): string {
    return {
      percentage: `${coupon.value}% off`,
      fixed: `Rs ${coupon.value} off`,
      'free-delivery': 'Free delivery',
    }[coupon.type];
  }

  private isLive(coupon: Coupon): boolean {
    return coupon.isActive && new Date(coupon.expiresAt).getTime() > Date.now();
  }
}
