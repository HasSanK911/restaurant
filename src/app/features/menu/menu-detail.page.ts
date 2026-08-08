import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DIETARY_TAG_META, SPICE_LEVELS } from '../../core/constants/app.constants';
import { MenuAddon, MenuItem, MenuVariant } from '../../core/models/menu.model';
import { Review } from '../../core/models/content.model';
import { CartService } from '../../core/services/cart.service';
import { ContentService } from '../../core/services/content.service';
import { MenuService } from '../../core/services/menu.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { CurrencyPkrPipe } from '../../shared/pipes/currency-pkr.pipe';
import { NiceDatePipe } from '../../shared/pipes/format.pipes';
import { MenuItemCardComponent } from '../../shared/components/menu-item-card.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { ImageComponent } from '../../shared/components/ui/image.component';
import {
  BadgeComponent,
  BreadcrumbsComponent,
  RatingComponent,
  SectionHeaderComponent,
  SpiceMeterComponent,
} from '../../shared/components/ui/display.components';
import { QuantityComponent } from '../../shared/components/ui/form.components';
import { EmptyStateComponent } from '../../shared/components/ui/feedback.components';
import { TabsComponent } from '../../shared/components/ui/navigation.components';

/**
 * Dish detail and the main add-to-cart surface.
 *
 * Variant, add-ons, quantity and the kitchen note are all local signals; only
 * `add()` touches the cart, so the customer can change their mind freely
 * without the basket flickering.
 */
@Component({
  selector: 'app-menu-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    FormsModule,
    ImageComponent,
    IconComponent,
    BadgeComponent,
    RatingComponent,
    SpiceMeterComponent,
    BreadcrumbsComponent,
    SectionHeaderComponent,
    QuantityComponent,
    TabsComponent,
    EmptyStateComponent,
    MenuItemCardComponent,
    RevealDirective,
    CurrencyPkrPipe,
    NiceDatePipe,
  ],
  template: `
    @if (item(); as dish) {
      <article class="pt-[calc(var(--header-h)+2rem)]">
        <div class="container-lux">
          <app-breadcrumbs [crumbs]="crumbs()" class="mb-7" />

          <div class="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <!-- Gallery -->
            <div class="lg:col-span-6">
              <div
                class="relative aspect-[4/3] overflow-hidden rounded-2xl border border-clay-500/12"
              >
                <app-image
                  [src]="activeImage()"
                  [alt]="dish.name + ' at Salateen Restaurant Swabi'"
                  [priority]="true"
                  sizes="(max-width: 1024px) 94vw, 40rem"
                  class="h-full w-full"
                />
                <div class="absolute top-4 left-4 flex flex-wrap gap-2">
                  @if (!dish.isAvailable) {
                    <app-badge tone="red">Sold out today</app-badge>
                  }
                  @if (dish.isChefRecommended) {
                    <app-badge tone="clay" icon="chef">Chef&rsquo;s pick</app-badge>
                  }
                  @if (dish.isNew) {
                    <app-badge tone="basil" icon="sparkle">New</app-badge>
                  }
                </div>
              </div>

              @if (gallery().length > 1) {
                <ul class="mt-3 grid grid-cols-4 gap-3">
                  @for (image of gallery(); track image) {
                    <li>
                      <button
                        type="button"
                        class="block aspect-square w-full overflow-hidden rounded-xl border transition-all"
                        [class]="
                          image === activeImage()
                            ? 'border-clay-500/60 ring-1 ring-clay-500/30'
                            : 'border-ink-200 opacity-65 hover:opacity-100'
                        "
                        [attr.aria-label]="'View image of ' + dish.name"
                        [attr.aria-pressed]="image === activeImage()"
                        (click)="selectedImage.set(image)"
                      >
                        <app-image [src]="image" [alt]="dish.name" sizes="9rem" class="h-full w-full" />
                      </button>
                    </li>
                  }
                </ul>
              }
            </div>

            <!-- Order panel -->
            <div class="lg:col-span-6">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <a
                    [routerLink]="['/menu/c', category()?.slug]"
                    class="eyebrow transition-colors hover:text-clay-700"
                    >{{ category()?.name }}</a
                  >
                  <h1 class="mt-2.5 text-4xl leading-[1.05] text-ink-900 sm:text-5xl">
                    {{ dish.name }}
                  </h1>
                  @if (dish.nameUrdu) {
                    <p class="mt-2 font-display text-2xl text-clay-600/80" dir="rtl" lang="ur">
                      {{ dish.nameUrdu }}
                    </p>
                  }
                </div>
                <button
                  type="button"
                  class="btn btn-ghost btn-icon shrink-0 border border-ink-200"
                  [attr.aria-label]="'Save ' + dish.name + ' to your wishlist'"
                  (click)="toggleFavourite(dish)"
                >
                  <app-icon name="heart" [size]="18" />
                </button>
              </div>

              <div class="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                <app-rating [value]="dish.rating" [count]="dish.ratingCount" [showValue]="true" />
                <app-spice-meter [level]="dish.spiceLevel" />
                <span class="flex items-center gap-1.5 text-sm text-ink-500">
                  <app-icon name="clock" [size]="14" />
                  {{ dish.prepTimeMinutes }} min
                </span>
                <span class="flex items-center gap-1.5 text-sm text-ink-500">
                  <app-icon name="flame" [size]="14" />
                  {{ dish.orderCount.toLocaleString('en-PK') }} served
                </span>
              </div>

              <p class="mt-6 text-lg leading-relaxed text-ink-700">{{ dish.shortDescription }}</p>

              <div class="mt-5 flex flex-wrap gap-2">
                @for (tag of dish.tags; track tag) {
                  <app-badge [tone]="$any(tagMeta[tag].tone)">{{ tagMeta[tag].label }}</app-badge>
                }
              </div>

              <!-- Variants -->
              <fieldset class="mt-8">
                <legend class="field-label">Choose a size</legend>
                <div class="grid gap-2.5 sm:grid-cols-2">
                  @for (variant of dish.variants; track variant.id) {
                    <button
                      type="button"
                      class="flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition-all duration-300"
                      [class]="
                        variant.id === selectedVariant()?.id
                          ? 'border-clay-500/60 bg-clay-500/8'
                          : 'border-ink-200 hover:border-clay-500/35'
                      "
                      [attr.aria-pressed]="variant.id === selectedVariant()?.id"
                      (click)="selectedVariant.set(variant)"
                    >
                      <span>
                        <span class="block text-sm font-semibold text-ink-900">{{ variant.label }}</span>
                        <span class="mt-0.5 block text-xs text-ink-500"
                          >Serves {{ variant.serves }}</span
                        >
                      </span>
                      <span class="font-display text-xl text-clay-700 nums">{{ variant.price | pkr }}</span>
                    </button>
                  }
                </div>
              </fieldset>

              <!-- Add-ons -->
              @if (dish.addons.length) {
                <fieldset class="mt-7">
                  <legend class="field-label">Add to it</legend>
                  <ul class="divide-y divide-ink-200 rounded-xl border border-ink-200">
                    @for (addon of dish.addons; track addon.id) {
                      <li class="flex items-center justify-between gap-4 p-3.5">
                        <span class="min-w-0">
                          <span class="block truncate text-sm font-medium text-ink-900">{{
                            addon.name
                          }}</span>
                          <span class="mt-0.5 block text-xs text-ink-500">
                            {{ addon.price === 0 ? 'Free' : (addon.price | pkr) }}
                          </span>
                        </span>
                        <span class="shrink-0">
                          @if (addonQty(addon.id) === 0) {
                            <button
                              type="button"
                              class="btn btn-secondary btn-sm"
                              [attr.aria-label]="'Add ' + addon.name"
                              (click)="setAddon(addon, 1)"
                            >
                              <app-icon name="plus" [size]="13" [strokeWidth]="2.4" />
                              Add
                            </button>
                          } @else {
                            <span class="inline-flex items-center rounded-full border border-ink-200">
                              <button
                                type="button"
                                class="px-2.5 py-1.5 text-ink-600 hover:text-clay-700"
                                [attr.aria-label]="'Fewer ' + addon.name"
                                (click)="setAddon(addon, addonQty(addon.id) - 1)"
                              >
                                <app-icon name="minus" [size]="13" [strokeWidth]="2.4" />
                              </button>
                              <span class="min-w-6 text-center text-xs font-bold text-ink-900">{{
                                addonQty(addon.id)
                              }}</span>
                              <button
                                type="button"
                                class="px-2.5 py-1.5 text-ink-600 hover:text-clay-700 disabled:opacity-35"
                                [disabled]="addonQty(addon.id) >= addon.maxQuantity"
                                [attr.aria-label]="'More ' + addon.name"
                                (click)="setAddon(addon, addonQty(addon.id) + 1)"
                              >
                                <app-icon name="plus" [size]="13" [strokeWidth]="2.4" />
                              </button>
                            </span>
                          }
                        </span>
                      </li>
                    }
                  </ul>
                </fieldset>
              }

              <!-- Note -->
              <div class="mt-7">
                <label class="field-label" for="kitchen-note">Note for the kitchen</label>
                <textarea
                  id="kitchen-note"
                  rows="2"
                  class="field resize-none"
                  placeholder="Extra spicy, no green chilli, less oil..."
                  maxlength="180"
                  [(ngModel)]="note"
                ></textarea>
              </div>

              <!-- Add to cart -->
              <div class="mt-8 flex flex-wrap items-center gap-4">
                <app-quantity [(value)]="quantity" [max]="30" [itemLabel]="dish.name" />
                <button
                  type="button"
                  class="btn btn-primary btn-lg flex-1"
                  [disabled]="!dish.isAvailable"
                  (click)="add(dish)"
                >
                  <app-icon name="bag" [size]="17" />
                  Add to order
                  <span class="ml-1 opacity-80">&middot; {{ lineTotal() | pkr }}</span>
                </button>
              </div>

              @if (!dish.isAvailable) {
                <p class="mt-3 flex items-center gap-2 text-sm text-amber-700">
                  <app-icon name="alert" [size]="15" />
                  This one is finished for today. Call {{ '0312-0991116' }} to check tomorrow.
                </p>
              }

              <div class="mt-6 grid gap-3 sm:grid-cols-3">
                @for (promise of promises; track promise.label) {
                  <div class="flex items-center gap-2.5 rounded-xl border border-ink-200 p-3">
                    <app-icon [name]="$any(promise.icon)" [size]="16" class="shrink-0 text-clay-600" />
                    <span class="text-caption leading-tight font-semibold text-ink-600">{{
                      promise.label
                    }}</span>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Detail tabs -->
          <div class="mt-20">
            <app-tabs [tabs]="tabs()" [(active)]="activeTab" ariaLabel="Dish details" />

            <div class="py-9">
              @switch (activeTab()) {
                @case ('description') {
                  <div class="grid gap-10 lg:grid-cols-12">
                    <div class="lg:col-span-7">
                      <p class="text-body-lg leading-relaxed whitespace-pre-line text-ink-700">
                        {{ dish.description }}
                      </p>
                    </div>
                    <div class="lg:col-span-5">
                      <div class="card-lux p-6">
                        <p class="eyebrow mb-4">In the pan</p>
                        <ul class="flex flex-wrap gap-2">
                          @for (ingredient of dish.ingredients; track ingredient) {
                            <li class="chip border-ink-200 text-ink-600">{{ ingredient }}</li>
                          }
                        </ul>
                        @if (dish.allergens.length) {
                          <p class="eyebrow mt-6 mb-3">Allergens</p>
                          <ul class="flex flex-wrap gap-2">
                            @for (allergen of dish.allergens; track allergen) {
                              <li class="chip border-amber-500/35 bg-amber-500/8 text-amber-700">
                                {{ allergen }}
                              </li>
                            }
                          </ul>
                        }
                        <p class="mt-6 text-xs leading-relaxed text-ink-500">
                          Everything is cooked in a shared kitchen. If you need a dish kept strictly
                          separate, tell us when you order and we will do our best.
                        </p>
                      </div>
                    </div>
                  </div>
                }

                @case ('nutrition') {
                  @if (dish.nutrition; as nutrition) {
                    <div class="grid gap-4 sm:grid-cols-4">
                      @for (fact of nutritionFacts(); track fact.label) {
                        <div class="card-lux p-6 text-center">
                          <p class="font-display text-4xl text-clay-700">{{ fact.value }}</p>
                          <p
                            class="mt-2 text-micro font-semibold tracking-[0.18em] text-ink-500 uppercase"
                          >
                            {{ fact.label }}
                          </p>
                        </div>
                      }
                    </div>
                    <p class="mt-6 max-w-2xl text-xs leading-relaxed text-ink-500">
                      Approximate values per standard portion, calculated from recipe quantities.
                      Actual values vary with cut, trim and how heavy the hand on the ghee was that
                      day.
                    </p>
                  } @else {
                    <app-empty-state
                      icon="info"
                      title="Nutrition not published"
                      message="We have not measured this one yet. Ask a member of staff and we will tell you what goes in it."
                    />
                  }
                }

                @case ('reviews') {
                  @if (reviews().length) {
                    <ul class="grid gap-4 md:grid-cols-2">
                      @for (review of reviews(); track review.id) {
                        <li class="card-lux p-6">
                          <div class="flex items-start justify-between gap-3">
                            <div>
                              <p class="text-sm font-semibold text-ink-900">{{ review.customerName }}</p>
                              <p class="mt-0.5 text-xs text-ink-500">
                                {{ review.createdAt | niceDate }}
                              </p>
                            </div>
                            <app-rating [value]="review.rating" [size]="13" />
                          </div>
                          <p class="mt-4 font-display text-lg text-ink-900">{{ review.title }}</p>
                          <p class="mt-2 text-sm leading-relaxed text-ink-600">{{ review.body }}</p>
                          @if (review.reply) {
                            <div class="mt-4 rounded-lg border-l-2 border-clay-500/50 bg-ink-50 p-3.5">
                              <p class="text-micro font-bold tracking-wide text-clay-600 uppercase">
                                Salateen replied
                              </p>
                              <p class="mt-1.5 text-xs leading-relaxed text-ink-600">
                                {{ review.reply }}
                              </p>
                            </div>
                          }
                        </li>
                      }
                    </ul>
                  } @else {
                    <app-empty-state
                      icon="star"
                      title="No reviews yet"
                      message="Be the first to tell us what you thought after your next visit."
                    />
                  }
                }
              }
            </div>
          </div>

          <!-- Related -->
          @if (related().length) {
            <section class="border-t border-ink-200 py-16">
              <app-section-header
                appReveal
                align="left"
                eyebrow="Goes well with"
                title="You might also"
                accent=" order"
              />
              <ul class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                @for (other of related(); track other.id; let i = $index) {
                  <li appReveal [appRevealDelay]="i * 70">
                    <app-menu-item-card [item]="other" />
                  </li>
                }
              </ul>
            </section>
          }
        </div>
      </article>
    } @else if (menu.loaded()) {
      <div class="container-lux pt-[calc(var(--header-h)+6rem)] pb-24">
        <app-empty-state
          icon="search"
          title="We could not find that dish"
          message="It may have been renamed or taken off the menu. Browse the full card instead."
          actionLabel="Back to the menu"
          (action)="goToMenu()"
        />
      </div>
    } @else {
      <div class="container-lux grid gap-10 pt-[calc(var(--header-h)+4rem)] pb-24 lg:grid-cols-2">
        <div class="skeleton aspect-[4/3] rounded-2xl"></div>
        <div class="space-y-4">
          <div class="skeleton h-4 w-24"></div>
          <div class="skeleton h-12 w-3/4"></div>
          <div class="skeleton h-4 w-full"></div>
          <div class="skeleton h-4 w-2/3"></div>
          <div class="skeleton h-28 w-full"></div>
          <div class="skeleton h-14 w-full rounded-full"></div>
        </div>
      </div>
    }
  `,
})
export class MenuDetailPage {
  protected readonly menu = inject(MenuService);
  private readonly content = inject(ContentService);
  private readonly cart = inject(CartService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly tagMeta = DIETARY_TAG_META;
  protected readonly spiceLevels = SPICE_LEVELS;
  protected readonly promises = [
    { icon: 'flame', label: 'Cooked to order' },
    { icon: 'shield', label: '100% halal' },
    { icon: 'wallet', label: 'Cash on delivery' },
  ];

  private readonly params = toSignal(this.route.paramMap, { initialValue: null });
  protected readonly slug = computed(() => this.params()?.get('slug') ?? '');

  protected readonly item = computed(() => this.menu.itemBySlug(this.slug()));
  protected readonly category = computed(() => {
    const dish = this.item();
    return dish ? this.menu.categoryById(dish.categoryId) : undefined;
  });

  protected readonly gallery = computed(() => {
    const dish = this.item();
    if (!dish) return [];
    return [dish.image, ...dish.gallery].filter((v, i, arr) => arr.indexOf(v) === i);
  });

  protected readonly selectedImage = signal<string | null>(null);
  protected readonly activeImage = computed(() => this.selectedImage() ?? this.gallery()[0] ?? '');

  protected readonly selectedVariant = signal<MenuVariant | null>(null);
  protected readonly quantity = signal(1);
  protected readonly note = signal('');
  protected readonly addons = signal<Record<string, number>>({});
  protected readonly activeTab = signal('description');

  private readonly reviewsResource = signal<Review[]>([]);
  protected readonly reviews = this.reviewsResource.asReadonly();

  protected readonly related = computed(() => {
    const dish = this.item();
    return dish ? this.menu.related(dish, 4) : [];
  });

  protected readonly crumbs = computed(() => {
    const dish = this.item();
    const category = this.category();
    return [
      { label: 'Menu', path: '/menu' },
      ...(category ? [{ label: category.name, path: `/menu/c/${category.slug}` }] : []),
      { label: dish?.name ?? 'Dish' },
    ];
  });

  protected readonly tabs = computed(() => [
    { id: 'description', label: 'Description' },
    { id: 'nutrition', label: 'Nutrition' },
    { id: 'reviews', label: 'Reviews', count: this.reviews().length },
  ]);

  protected readonly nutritionFacts = computed(() => {
    const n = this.item()?.nutrition;
    if (!n) return [];
    return [
      { label: 'Calories', value: n.calories },
      { label: 'Protein (g)', value: n.protein },
      { label: 'Carbs (g)', value: n.carbs },
      { label: 'Fat (g)', value: n.fat },
    ];
  });

  protected readonly lineTotal = computed(() => {
    const variant = this.selectedVariant();
    if (!variant) return 0;
    const addonTotal = Object.entries(this.addons()).reduce((sum, [id, qty]) => {
      const addon = this.item()?.addons.find((a) => a.id === id);
      return sum + (addon ? addon.price * qty : 0);
    }, 0);
    return (variant.price + addonTotal) * this.quantity();
  });

  constructor() {
    // Reset the panel whenever the dish changes (related-item navigation).
    effect(() => {
      const dish = this.item();
      if (!dish) return;
      this.selectedVariant.set(dish.variants.find((v) => v.isDefault) ?? dish.variants[0] ?? null);
      this.selectedImage.set(null);
      this.quantity.set(1);
      this.note.set('');
      this.addons.set({});
      this.activeTab.set('description');
      this.content.reviewsForItem(dish.id).subscribe((rows) => this.reviewsResource.set(rows));
    });

    effect(() => {
      const dish = this.item();
      const category = this.category();
      if (!dish) {
        // Catalogue has loaded and this slug is not in it: answer a real 404
        // rather than a soft one on a URL that will never have content.
        if (this.menu.loaded()) {
          this.seo.apply({
            title: 'Dish Not Found | Salateen Restaurant Swabi',
            description: 'That dish could not be found. Browse the full menu instead.',
            path: 'menu',
            noIndex: true,
            statusCode: 404,
          });
        }
        return;
      }

      this.seo.apply({
        title: dish.seoTitle ?? `${dish.name} | Salateen Restaurant Swabi`,
        description:
          dish.seoDescription ??
          `${dish.shortDescription} Order ${dish.name} from Salateen Restaurant, Jhangira Road, Swabi. From ${dish.basePrice} rupees.`,
        path: `menu/${dish.slug}`,
        image: `${dish.image}.webp`,
        type: 'product',
        keywords: [dish.name, `${dish.name} Swabi`, category?.name ?? '', 'Salateen Restaurant'],
      });
      this.seo.menuItemSchema(dish, category?.name ?? 'Menu');
      this.seo.breadcrumbSchema([
        { label: 'Menu', path: 'menu' },
        ...(category ? [{ label: category.name, path: `menu/c/${category.slug}` }] : []),
        { label: dish.name, path: `menu/${dish.slug}` },
      ]);
    });
  }

  protected addonQty(id: string): number {
    return this.addons()[id] ?? 0;
  }

  protected setAddon(addon: MenuAddon, quantity: number): void {
    const next = Math.max(0, Math.min(addon.maxQuantity, quantity));
    this.addons.update((map) => {
      const copy = { ...map };
      if (next === 0) delete copy[addon.id];
      else copy[addon.id] = next;
      return copy;
    });
  }

  protected add(dish: MenuItem): void {
    const variant = this.selectedVariant();
    if (!variant) return;

    const selectedAddons = Object.entries(this.addons())
      .map(([id, quantity]) => {
        const addon = dish.addons.find((a) => a.id === id);
        return addon ? { addon, quantity } : null;
      })
      .filter((a): a is { addon: MenuAddon; quantity: number } => a !== null);

    this.cart.add({
      item: dish,
      variant,
      quantity: this.quantity(),
      addons: selectedAddons,
      note: this.note(),
    });

    this.toast.push(
      'success',
      `${this.quantity()}x ${dish.name} added`,
      `${variant.label}. Your basket total is now updated.`,
      4000,
      { label: 'View basket', run: () => this.cart.open() },
    );
    this.quantity.set(1);
  }

  protected toggleFavourite(dish: MenuItem): void {
    if (!this.auth.isAuthenticated()) {
      this.toast.info('Sign in to save dishes', 'Your wishlist follows you across devices.');
      void this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: `/menu/${dish.slug}` },
      });
      return;
    }
    this.auth.toggleFavourite(dish.id).subscribe(() => this.toast.success('Wishlist updated'));
  }

  protected goToMenu(): void {
    void this.router.navigate(['/menu']);
  }
}
