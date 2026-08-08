import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { DIETARY_TAG_META, MENU_SORT_OPTIONS, SPICE_LEVELS } from '../../core/constants/app.constants';
import {
  DEFAULT_MENU_FILTERS,
  DietaryTag,
  MenuFilters,
  MenuSort,
  SpiceLevel,
} from '../../core/models/menu.model';
import { AuthService } from '../../core/services/auth.service';
import { MenuService, applyFilters } from '../../core/services/menu.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { CurrencyPkrPipe } from '../../shared/pipes/currency-pkr.pipe';
import { MenuItemCardComponent } from '../../shared/components/menu-item-card.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { PageHeroComponent } from '../../shared/components/ui/page-hero.component';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { ImageComponent } from '../../shared/components/ui/image.component';
import { BadgeComponent } from '../../shared/components/ui/display.components';
import {
  EmptyStateComponent,
  SkeletonCardComponent,
} from '../../shared/components/ui/feedback.components';
import { DrawerComponent } from '../../shared/components/ui/overlay.components';
import { PaginationComponent } from '../../shared/components/ui/navigation.components';

const PER_PAGE = 12;

/**
 * Menu browser.
 *
 * Serves both `/menu` and `/menu/c/:categorySlug` from one component: the
 * category is just another filter. Filter state is mirrored into the query
 * string so a filtered view is shareable and survives a refresh.
 */
@Component({
  selector: 'app-menu-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    FormsModule,
    NgTemplateOutlet,
    PageHeroComponent,
    MenuItemCardComponent,
    IconComponent,
    ImageComponent,
    BadgeComponent,
    EmptyStateComponent,
    SkeletonCardComponent,
    DrawerComponent,
    PaginationComponent,
    RevealDirective,
    CurrencyPkrPipe,
  ],
  template: `
    <app-page-hero
      [eyebrow]="hero().eyebrow"
      [title]="hero().title"
      [accent]="hero().accent"
      [description]="hero().description"
      [image]="hero().image"
      [imageAlt]="hero().title"
      [crumbs]="crumbs()"
      size="md"
    />

    <!-- Category rail -->
    <nav class="sticky top-[var(--header-h)] z-[var(--z-sticky)] border-y border-ink-200 bg-white/92 backdrop-blur-xl" aria-label="Menu sections">
      <div class="container-lux">
        <div class="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 py-3.5">
          <a
            routerLink="/menu"
            class="chip shrink-0 transition-all"
            [class]="
              !filters().categorySlug
                ? 'border-clay-500/50 bg-clay-500/12 text-clay-700'
                : 'border-ink-200 text-ink-600 hover:border-clay-500/30 hover:text-clay-700'
            "
            >All ({{ menu.items().length }})</a
          >
          @for (category of categories(); track category.id) {
            <a
              [routerLink]="['/menu/c', category.slug]"
              class="chip shrink-0 transition-all"
              [class]="
                filters().categorySlug === category.slug
                  ? 'border-clay-500/50 bg-clay-500/12 text-clay-700'
                  : 'border-ink-200 text-ink-600 hover:border-clay-500/30 hover:text-clay-700'
              "
              >{{ category.name }} ({{ countFor(category.id) }})</a
            >
          }
        </div>
      </div>
    </nav>

    <section class="section pt-12">
      <div class="container-lux grid gap-10 lg:grid-cols-12">
        <!-- Desktop filters -->
        <aside class="hidden lg:col-span-3 lg:block">
          <div class="sticky top-[calc(var(--header-h)+5rem)] space-y-6">
            <ng-container [ngTemplateOutlet]="filterPanel" />
          </div>
        </aside>

        <!-- Results -->
        <div class="lg:col-span-9">
          <!-- Toolbar -->
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="relative flex-1 sm:max-w-sm">
              <app-icon
                name="search"
                [size]="17"
                class="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-500"
              />
              <input
                type="search"
                class="field pl-11"
                placeholder="Search dishes, ingredients..."
                aria-label="Search the menu"
                [ngModel]="filters().search"
                (ngModelChange)="patch({ search: $event })"
              />
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="btn btn-secondary btn-md relative lg:hidden"
                (click)="filtersOpen.set(true)"
              >
                <app-icon name="filter" [size]="15" />
                Filters
                @if (activeFilterCount() > 0) {
                  <span
                    class="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-clay-500 px-1 text-caption font-extrabold text-white"
                    >{{ activeFilterCount() }}</span
                  >
                }
              </button>

              <label class="sr-only" for="sort">Sort dishes</label>
              <select
                id="sort"
                class="field h-11 w-auto py-0 pr-9"
                [ngModel]="filters().sort"
                (ngModelChange)="patch({ sort: $event })"
              >
                @for (option of sortOptions; track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
            </div>
          </div>

          <!-- Active filter pills -->
          @if (activeFilterCount() > 0) {
            <div class="mt-4 flex flex-wrap items-center gap-2">
              <span class="text-xs text-ink-500">Filtering by:</span>
              @for (tag of filters().tags; track tag) {
                <button type="button" class="chip border-clay-500/40 bg-clay-500/10 text-clay-700" (click)="toggleTag(tag)">
                  {{ tagMeta[tag].label }}
                  <app-icon name="close" [size]="11" [strokeWidth]="2.4" />
                </button>
              }
              @if (filters().maxSpice !== null) {
                <button type="button" class="chip border-turmeric-500/40 bg-turmeric-500/10 text-turmeric-600" (click)="patch({ maxSpice: null })">
                  Up to {{ spiceLabel(filters().maxSpice!) }}
                  <app-icon name="close" [size]="11" [strokeWidth]="2.4" />
                </button>
              }
              @if (filters().priceMax !== null) {
                <button type="button" class="chip border-ink-300 text-ink-600" (click)="patch({ priceMax: null })">
                  Under {{ filters().priceMax! | pkr }}
                  <app-icon name="close" [size]="11" [strokeWidth]="2.4" />
                </button>
              }
              @if (filters().availableOnly) {
                <button type="button" class="chip border-emerald-500/40 bg-emerald-500/10 text-emerald-700" (click)="patch({ availableOnly: false })">
                  Available now
                  <app-icon name="close" [size]="11" [strokeWidth]="2.4" />
                </button>
              }
              <button
                type="button"
                class="text-xs font-semibold text-clay-600 underline-offset-4 hover:underline"
                (click)="reset()"
              >
                Clear all
              </button>
            </div>
          }

          <p class="mt-5 text-sm text-ink-500" aria-live="polite">
            Showing <span class="font-semibold text-ink-900">{{ pageItems().length }}</span> of
            <span class="font-semibold text-ink-900">{{ results().length }}</span> dishes
          </p>

          <!-- Grid -->
          @if (!menu.loaded()) {
            <div class="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              @for (n of [1, 2, 3, 4, 5, 6]; track n) {
                <app-skeleton-card />
              }
            </div>
          } @else if (results().length === 0) {
            <app-empty-state
              class="mt-7"
              icon="search"
              title="Nothing matches that"
              message="Try a different search, or clear the filters to see the full menu."
              actionLabel="Clear filters"
              (action)="reset()"
            />
          } @else {
            <ul class="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              @for (item of pageItems(); track item.id; let i = $index) {
                <li appReveal [appRevealDelay]="(i % 6) * 60">
                  <app-menu-item-card
                    [item]="item"
                    [showFavourite]="isSignedIn()"
                    [isFavourite]="false"
                    (favouriteToggled)="toggleFavourite($event.id)"
                  />
                </li>
              }
            </ul>

            <app-pagination
              class="mt-14"
              [page]="page()"
              [totalPages]="totalPages()"
              (pageChange)="goToPage($event)"
            />
          }
        </div>
      </div>
    </section>

    <!-- Mobile filter drawer -->
    <app-drawer [open]="filtersOpen()" (openChange)="filtersOpen.set($event)" title="Filters">
      <div class="flex-1 space-y-6 overflow-y-auto p-5">
        <ng-container [ngTemplateOutlet]="filterPanel" />
      </div>
      <div class="border-t border-ink-200 p-5">
        <button type="button" class="btn btn-primary btn-md w-full" (click)="filtersOpen.set(false)">
          Show {{ results().length }} dishes
        </button>
      </div>
    </app-drawer>

    <!-- Shared filter markup -->
    <ng-template #filterPanel>
      <!-- Dietary -->
      <fieldset class="card-lux p-5">
        <legend class="eyebrow mb-3.5">Dietary & style</legend>
        <div class="flex flex-wrap gap-2">
          @for (tag of tagOptions; track tag.value) {
            <button
              type="button"
              class="chip transition-all"
              [class]="
                filters().tags.includes(tag.value)
                  ? 'border-clay-500/50 bg-clay-500/12 text-clay-700'
                  : 'border-ink-200 text-ink-500 hover:border-clay-500/30 hover:text-clay-700'
              "
              [attr.aria-pressed]="filters().tags.includes(tag.value)"
              (click)="toggleTag(tag.value)"
            >
              {{ tag.label }}
            </button>
          }
        </div>
      </fieldset>

      <!-- Spice -->
      <fieldset class="card-lux p-5">
        <legend class="eyebrow mb-3.5">Maximum spice</legend>
        <div class="flex flex-wrap gap-2">
          @for (level of spiceLevels; track level.value) {
            <button
              type="button"
              class="chip transition-all"
              [class]="
                filters().maxSpice === level.value
                  ? 'border-turmeric-500/50 bg-turmeric-500/12 text-turmeric-600'
                  : 'border-ink-200 text-ink-500 hover:border-turmeric-500/30'
              "
              [attr.aria-pressed]="filters().maxSpice === level.value"
              (click)="patch({ maxSpice: filters().maxSpice === level.value ? null : level.value })"
            >
              {{ level.label }}
            </button>
          }
        </div>
      </fieldset>

      <!-- Price -->
      <fieldset class="card-lux p-5">
        <legend class="eyebrow mb-3.5">Price ceiling</legend>
        <input
          type="range"
          class="w-full accent-[var(--color-clay-500)]"
          [min]="bounds().min"
          [max]="bounds().max"
          step="50"
          [ngModel]="filters().priceMax ?? bounds().max"
          (ngModelChange)="patch({ priceMax: +$event >= bounds().max ? null : +$event })"
          aria-label="Maximum price"
        />
        <div class="mt-2 flex justify-between text-xs text-ink-500">
          <span>{{ bounds().min | pkr }}</span>
          <span class="font-semibold text-clay-700">{{
            (filters().priceMax ?? bounds().max) | pkr
          }}</span>
        </div>
      </fieldset>

      <!-- Availability -->
      <div class="card-lux p-5">
        <label class="flex cursor-pointer items-center justify-between gap-3">
          <span>
            <span class="block text-sm font-semibold text-ink-900">Available now</span>
            <span class="mt-0.5 block text-xs text-ink-500">Hide anything sold out today</span>
          </span>
          <input
            type="checkbox"
            class="h-5 w-5 shrink-0 accent-[var(--color-clay-500)]"
            [ngModel]="filters().availableOnly"
            (ngModelChange)="patch({ availableOnly: $event })"
          />
        </label>
      </div>

      <!-- Category promo -->
      @if (activeCategory(); as category) {
        <div class="card-lux overflow-hidden">
          <div class="aspect-[16/9]">
            <app-image [src]="category.image" [alt]="category.name" sizes="20rem" class="h-full w-full" />
          </div>
          <div class="p-5">
            <app-badge tone="clay">{{ category.name }}</app-badge>
            <p class="mt-3 text-xs leading-relaxed text-ink-600">{{ category.description }}</p>
          </div>
        </div>
      }
    </ng-template>
  `,
})
export class MenuPage {
  protected readonly menu = inject(MenuService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly sortOptions = MENU_SORT_OPTIONS;
  protected readonly spiceLevels = SPICE_LEVELS;
  protected readonly tagMeta = DIETARY_TAG_META;
  protected readonly tagOptions = (Object.keys(DIETARY_TAG_META) as DietaryTag[]).map((value) => ({
    value,
    label: DIETARY_TAG_META[value].label,
  }));

  protected readonly categories = this.menu.activeCategories;
  protected readonly bounds = this.menu.priceBounds;
  protected readonly filtersOpen = signal(false);
  protected readonly page = signal(1);
  protected readonly isSignedIn = this.auth.isAuthenticated;

  private readonly params = toSignal(this.route.paramMap, { initialValue: null });
  private readonly query = toSignal(this.route.queryParamMap, { initialValue: null });

  private readonly localFilters = signal<MenuFilters>({ ...DEFAULT_MENU_FILTERS });

  /** Route + query params are the source of truth; local state layers on top. */
  protected readonly filters = computed<MenuFilters>(() => {
    const categorySlug = this.params()?.get('categorySlug') ?? null;
    return { ...this.localFilters(), categorySlug };
  });

  protected readonly activeCategory = computed(() => {
    const slug = this.filters().categorySlug;
    return slug ? this.menu.categoryBySlug(slug) : undefined;
  });

  protected readonly results = computed(() =>
    applyFilters(this.menu.items(), this.filters(), this.menu.categories()),
  );

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.results().length / PER_PAGE)),
  );

  protected readonly pageItems = computed(() => {
    const start = (this.page() - 1) * PER_PAGE;
    return this.results().slice(start, start + PER_PAGE);
  });

  protected readonly activeFilterCount = computed(() => {
    const f = this.filters();
    return (
      f.tags.length +
      (f.maxSpice !== null ? 1 : 0) +
      (f.priceMax !== null ? 1 : 0) +
      (f.availableOnly ? 1 : 0)
    );
  });

  protected readonly hero = computed(() => {
    const category = this.activeCategory();
    if (category) {
      return {
        eyebrow: 'Menu section',
        title: category.name,
        accent: '',
        description: category.description,
        image: category.image,
      };
    }
    return {
      eyebrow: 'The full card',
      title: 'Everything from',
      accent: ' one kitchen',
      description:
        'Charcoal BBQ, karahi finished in copper, handi sealed in clay and Kabuli Pulao steamed over mutton stock. Prices transcribed from our printed menu card.',
      image: 'assets/images/food/feast-table',
    };
  });

  protected readonly crumbs = computed(() => {
    const category = this.activeCategory();
    return category
      ? [{ label: 'Menu', path: '/menu' }, { label: category.name }]
      : [{ label: 'Menu' }];
  });

  constructor() {
    // Seed search from `?q=` so the header search box can deep link in.
    effect(() => {
      const q = this.query()?.get('q');
      if (q && q !== this.localFilters().search) {
        this.localFilters.update((f) => ({ ...f, search: q }));
      }
    });

    // Any filter change resets pagination, otherwise page 3 of a 1-page result
    // set renders empty.
    effect(() => {
      this.results();
      this.page.set(1);
    });

    effect(() => {
      const category = this.activeCategory();
      const items = this.results();

      if (category) {
        this.seo.apply({
          title: category.seoTitle ?? `${category.name} | Salateen Restaurant Swabi`,
          description: category.seoDescription ?? category.description,
          path: `menu/c/${category.slug}`,
          image: `${category.image}.webp`,
          keywords: [category.name, `${category.name} Swabi`, 'Salateen Restaurant'],
        });
        this.seo.breadcrumbSchema([
          { label: 'Menu', path: 'menu' },
          { label: category.name, path: `menu/c/${category.slug}` },
        ]);
      } else {
        this.seo.apply({
          title: 'Menu | Salateen Restaurant Swabi',
          description:
            'The full Salateen Restaurant menu: charcoal BBQ, Chapli Kabab, mutton and chicken karahi, handi, Kabuli Pulao, salan, breads, desserts and chai. Prices from our printed menu card.',
          path: 'menu',
          image: 'assets/images/food/feast-table.webp',
          keywords: ['Salateen menu', 'restaurant menu Swabi', 'BBQ menu', 'karahi prices Swabi'],
        });
        this.seo.breadcrumbSchema([{ label: 'Menu', path: 'menu' }]);
      }

      // Menu schema helps the dish list surface in rich results.
      if (items.length) {
        const sections = this.menu.activeCategories().map((c) => ({
          name: c.name,
          description: c.description,
          items: this.menu.itemsInCategory(c.id),
        }));
        this.seo.menuSchema(sections.filter((s) => s.items.length));
      }
    });
  }

  protected countFor(categoryId: string): number {
    return this.menu.countByCategory().get(categoryId) ?? 0;
  }

  protected spiceLabel(level: SpiceLevel): string {
    return SPICE_LEVELS.find((s) => s.value === level)?.label ?? '';
  }

  protected patch(partial: Partial<MenuFilters>): void {
    this.localFilters.update((f) => ({ ...f, ...partial }));
  }

  protected toggleTag(tag: DietaryTag): void {
    this.localFilters.update((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));
  }

  protected reset(): void {
    this.localFilters.set({ ...DEFAULT_MENU_FILTERS });
    this.filtersOpen.set(false);
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    if (typeof window !== 'undefined') window.scrollTo({ top: 300, behavior: 'smooth' });
  }

  protected toggleFavourite(id: string): void {
    this.auth.toggleFavourite(id).subscribe(() => this.toast.success('Wishlist updated'));
  }

  /** Used by the sort select; kept for template type inference. */
  protected setSort(sort: MenuSort): void {
    this.patch({ sort });
  }
}
