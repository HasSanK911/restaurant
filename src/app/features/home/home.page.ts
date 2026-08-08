import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ContentService } from '../../core/services/content.service';
import { MenuService } from '../../core/services/menu.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { SeoService } from '../../core/services/seo.service';
import { HeroSection } from './sections/hero.section';
import {
  BbqSection,
  CategoriesSection,
  ChefSection,
  PopularSection,
  SpecialsSection,
} from './sections/menu-sections';
import {
  GalleryPreviewSection,
  ReviewsSection,
  StorySection,
  WhyUsSection,
} from './sections/story-sections';
import {
  LocationSection,
  MenuDownloadSection,
  OffersSection,
  ReservationCtaSection,
} from './sections/engagement-sections';

/**
 * Home.
 *
 * Composition only: every section is its own component and every dataset comes
 * from a cached service signal, so the page renders progressively as each
 * collection lands rather than blocking on the slowest one.
 */
@Component({
  selector: 'app-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HeroSection,
    SpecialsSection,
    CategoriesSection,
    PopularSection,
    BbqSection,
    StorySection,
    WhyUsSection,
    ChefSection,
    ReviewsSection,
    OffersSection,
    GalleryPreviewSection,
    ReservationCtaSection,
    MenuDownloadSection,
    LocationSection,
  ],
  template: `
    <app-hero-section [banners]="content.banners()" />
    <app-specials-section [items]="specials()" />
    <app-categories-section [categories]="categories()" />
    <app-popular-section [items]="popular()" />
    <app-bbq-section [items]="bbqPicks()" />
    <app-story-section [profile]="restaurant.profile()" />
    <app-why-us-section />
    <app-chef-section [chef]="featuredChef()" [dishes]="chefDishes()" />
    <app-reviews-section
      [testimonials]="featuredTestimonials()"
      [rating]="rating()"
      [ratingCount]="ratingCount()"
    />
    <app-offers-section [offers]="featuredOffers()" />
    <app-gallery-preview-section [images]="galleryTiles()" />
    <app-reservation-cta-section />
    <app-menu-download-section />
    <app-location-section [profile]="restaurant.profile()" />
  `,
})
export class HomePage {
  protected readonly content = inject(ContentService);
  protected readonly restaurant = inject(RestaurantService);
  private readonly menu = inject(MenuService);
  private readonly seo = inject(SeoService);

  protected readonly categories = this.menu.activeCategories;

  protected readonly specials = computed(() => {
    const picks = this.menu.chefPicks();
    return (picks.length ? picks : this.menu.featured()).slice(0, 4);
  });

  protected readonly popular = this.menu.popular;

  protected readonly bbqPicks = computed(() => {
    const bbq = this.menu.categories().find((c) => c.slug === 'bbq');
    if (!bbq) return [];
    return this.menu
      .itemsInCategory(bbq.id)
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 4);
  });

  protected readonly featuredChef = computed(
    () => this.content.chefs().find((c) => c.isFeatured) ?? this.content.chefs()[0],
  );

  protected readonly chefDishes = computed(() => {
    const chef = this.featuredChef();
    if (!chef) return [];
    const signature = this.menu.itemsByIds(chef.signatureItemIds);
    return (signature.length ? signature : this.menu.chefPicks()).slice(0, 3);
  });

  protected readonly featuredTestimonials = computed(() =>
    this.content.testimonials().filter((t) => t.isFeatured).slice(0, 3),
  );

  protected readonly featuredOffers = computed(() =>
    this.content.offers().filter((o) => o.isFeatured).slice(0, 3),
  );

  protected readonly galleryTiles = computed(() =>
    this.content.gallery().filter((g) => g.category !== 'brand'),
  );

  protected readonly rating = computed(() => this.restaurant.profile()?.rating ?? 4.4);
  protected readonly ratingCount = computed(() => this.restaurant.profile()?.ratingCount ?? 1287);

  constructor() {
    this.seo.apply({
      title: 'Salateen Restaurant Swabi | Pakistani BBQ & Family Fine Dining',
      description:
        'Charcoal BBQ, Chapli Kabab and Kabuli Pulao on Jhangira Road, Mal Lar, Swabi. Family halls with full purdah, free home delivery above Rs 2,500, and tables you can book online. Open daily 10am to midnight.',
      path: '',
      image: 'assets/brand/og-card.jpg',
      keywords: [
        'Salateen Restaurant Swabi',
        'best restaurant in Swabi',
        'BBQ Swabi',
        'Kabuli Pulao Swabi',
        'Chapli Kabab Swabi',
        'family restaurant Swabi',
        'home delivery Swabi',
        'Pakistani restaurant Khyber Pakhtunkhwa',
      ],
    });
    this.seo.clearJsonLd('breadcrumb', 'article', 'menuitem', 'faq');
  }
}
