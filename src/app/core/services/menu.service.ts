import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import { API } from '../constants/api.constants';
import { ID } from '../models/common.model';
import { MenuCategory, MenuFilters, MenuItem, MenuSort } from '../models/menu.model';
import { ApiService } from './api.service';

/**
 * Menu catalogue.
 *
 * The whole catalogue is small (45 items) and read constantly, so it is
 * fetched once and filtered client-side. That keeps search and faceting
 * instant and removes a network round trip per keystroke. If the catalogue
 * grows past a few hundred items, move `applyFilters` to the server and
 * page through `api.list` instead. See MIGRATION_GUIDE.md.
 */
@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly api = inject(ApiService);

  private readonly items$ = this.api
    .all<MenuItem>(API.menu, { _sort: 'sortOrder' })
    .pipe(
      catchError(() => of([] as MenuItem[])),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

  private readonly categories$ = this.api
    .all<MenuCategory>(API.categories, { _sort: 'sortOrder' })
    .pipe(
      catchError(() => of([] as MenuCategory[])),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

  readonly items = toSignal(this.items$, { initialValue: [] as MenuItem[] });
  readonly categories = toSignal(this.categories$, { initialValue: [] as MenuCategory[] });

  readonly loaded = computed(() => this.items().length > 0);
  readonly activeCategories = computed(() => this.categories().filter((c) => c.isActive));
  readonly featuredCategories = computed(() => this.activeCategories().filter((c) => c.isFeatured));

  readonly featured = computed(() => this.items().filter((i) => i.isFeatured));
  readonly popular = computed(() =>
    [...this.items()].filter((i) => i.isPopular).sort((a, b) => b.orderCount - a.orderCount),
  );
  readonly chefPicks = computed(() => this.items().filter((i) => i.isChefRecommended));
  readonly newArrivals = computed(() => this.items().filter((i) => i.isNew));

  readonly countByCategory = computed(() => {
    const map = new Map<ID, number>();
    for (const item of this.items()) {
      map.set(item.categoryId, (map.get(item.categoryId) ?? 0) + 1);
    }
    return map;
  });

  readonly priceBounds = computed(() => {
    const prices = this.items().map((i) => i.basePrice);
    return prices.length
      ? { min: Math.min(...prices), max: Math.max(...prices) }
      : { min: 0, max: 10000 };
  });

  categoryBySlug(slug: string): MenuCategory | undefined {
    return this.categories().find((c) => c.slug === slug);
  }

  categoryById(id: ID): MenuCategory | undefined {
    return this.categories().find((c) => c.id === id);
  }

  itemBySlug(slug: string): MenuItem | undefined {
    return this.items().find((i) => i.slug === slug);
  }

  itemsByIds(ids: ID[]): MenuItem[] {
    const set = new Set(ids);
    return this.items().filter((i) => set.has(i.id));
  }

  itemsInCategory(categoryId: ID): MenuItem[] {
    return this.items().filter((i) => i.categoryId === categoryId);
  }

  /**
   * Related items: same category first, then the most-ordered elsewhere, so a
   * niche category never renders a lonely single suggestion.
   */
  related(item: MenuItem, limit = 4): MenuItem[] {
    const sameCategory = this.items().filter(
      (i) => i.categoryId === item.categoryId && i.id !== item.id,
    );
    const fallback = this.items()
      .filter((i) => i.categoryId !== item.categoryId && i.isPopular)
      .sort((a, b) => b.orderCount - a.orderCount);
    return [...sameCategory, ...fallback].slice(0, limit);
  }

  /** Live fetch by slug, for direct navigation before the catalogue resolves. */
  fetchBySlug(slug: string): Observable<MenuItem | undefined> {
    return this.items$.pipe(map((items) => items.find((i) => i.slug === slug)));
  }

  filter(filters: MenuFilters): MenuItem[] {
    return applyFilters(this.items(), filters, this.categories());
  }
}

export function applyFilters(
  items: MenuItem[],
  filters: MenuFilters,
  categories: MenuCategory[],
): MenuItem[] {
  const categoryId = filters.categorySlug
    ? categories.find((c) => c.slug === filters.categorySlug)?.id
    : null;
  const needle = filters.search.trim().toLowerCase();

  const matched = items.filter((item) => {
    if (categoryId && item.categoryId !== categoryId) return false;
    if (filters.availableOnly && !item.isAvailable) return false;
    if (filters.maxSpice !== null && item.spiceLevel > filters.maxSpice) return false;
    if (filters.priceMax !== null && item.basePrice > filters.priceMax) return false;
    if (filters.tags.length && !filters.tags.every((t) => item.tags.includes(t))) return false;
    if (needle) {
      const haystack = [
        item.name,
        item.nameUrdu ?? '',
        item.shortDescription,
        item.description,
        ...item.ingredients,
        ...item.tags,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  return sortItems(matched, filters.sort);
}

export function sortItems(items: MenuItem[], sort: MenuSort): MenuItem[] {
  const copy = [...items];
  switch (sort) {
    case 'rating':
      return copy.sort((a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount);
    case 'price-asc':
      return copy.sort((a, b) => a.basePrice - b.basePrice);
    case 'price-desc':
      return copy.sort((a, b) => b.basePrice - a.basePrice);
    case 'name-asc':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case 'newest':
      return copy.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    case 'popular':
    default:
      return copy.sort((a, b) => b.orderCount - a.orderCount);
  }
}
