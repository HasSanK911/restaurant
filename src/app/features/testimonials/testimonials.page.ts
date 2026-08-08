import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Review } from '../../core/models/content.model';
import { ContentService } from '../../core/services/content.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { SeoService } from '../../core/services/seo.service';
import { NiceDatePipe } from '../../shared/pipes/format.pipes';
import { PageHeroComponent } from '../../shared/components/ui/page-hero.component';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { RatingComponent, SectionHeaderComponent } from '../../shared/components/ui/display.components';
import { EmptyStateComponent, SkeletonComponent } from '../../shared/components/ui/feedback.components';
import { RevealDirective } from '../../shared/directives/reveal.directive';

@Component({
  selector: 'app-testimonials-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageHeroComponent,
    IconComponent,
    RatingComponent,
    SectionHeaderComponent,
    EmptyStateComponent,
    SkeletonComponent,
    RevealDirective,
    NiceDatePipe,
  ],
  template: `
    <app-page-hero
      eyebrow="Testimonials"
      title="What people say"
      accent=" after they leave"
      description="Unedited, and grouped by the kind of visit. The good and the fair criticism both."
      image="assets/images/ambience/family-dining"
      imageAlt="A family at the table at Salateen Restaurant"
      [crumbs]="[{ label: 'Testimonials' }]"
      size="sm"
    />

    <!-- Score summary -->
    <section class="pt-12">
      <div class="container-lux">
        <div class="panel grid gap-8 p-8 lg:grid-cols-12 lg:items-center">
          <div class="text-center lg:col-span-3">
            <p class="font-display text-6xl leading-none text-clay-700">{{ rating().toFixed(1) }}</p>
            <app-rating [value]="rating()" [size]="17" class="mt-3 justify-center" />
            <p class="mt-2 text-sm text-ink-500">
              {{ ratingCount().toLocaleString('en-PK') }} guest ratings
            </p>
          </div>

          <div class="lg:col-span-5">
            <dl class="space-y-2">
              @for (row of distribution(); track row.stars) {
                <div class="flex items-center gap-3">
                  <dt class="w-12 shrink-0 text-caption text-ink-500">{{ row.stars }} star</dt>
                  <dd class="flex-1">
                    <div class="h-2 overflow-hidden rounded-full bg-ink-200">
                      <div
                        class="h-full rounded-full bg-gradient-to-r from-clay-400 to-clay-600 transition-[width] duration-700"
                        [style.width.%]="row.percent"
                      ></div>
                    </div>
                  </dd>
                  <dd class="w-10 shrink-0 text-right text-caption text-ink-500">{{ row.percent }}%</dd>
                </div>
              }
            </dl>
          </div>

          <div class="lg:col-span-4">
            <ul class="grid grid-cols-2 gap-4">
              @for (metric of metrics; track metric.label) {
                <li class="rounded-xl border border-ink-200 p-4 text-center">
                  <p class="font-display text-2xl text-clay-700">{{ metric.value }}</p>
                  <p class="mt-1 text-caption text-ink-500">{{ metric.label }}</p>
                </li>
              }
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Featured testimonials -->
    <section class="section pt-14">
      <div class="container-lux">
        <div class="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          @for (filter of filters; track filter.value) {
            <button
              type="button"
              class="chip shrink-0 transition-all"
              [class]="
                stars() === filter.value
                  ? 'border-clay-600/60 bg-clay-50 text-clay-700'
                  : 'border-ink-300 text-ink-500 hover:border-clay-500/40 hover:text-clay-700'
              "
              [attr.aria-pressed]="stars() === filter.value"
              (click)="stars.set(filter.value)"
            >
              {{ filter.label }}
            </button>
          }
        </div>

        @if (!testimonials().length) {
          <div class="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            @for (n of [1, 2, 3, 4, 5, 6]; track n) {
              <app-skeleton height="17rem" rounded="rounded-2xl" />
            }
          </div>
        } @else if (!visible().length) {
          <app-empty-state
            class="mt-10"
            icon="quote"
            title="Nothing at that rating"
            message="Try another filter."
            actionLabel="Show everything"
            (action)="stars.set(null)"
          />
        } @else {
          <ul class="mt-10 columns-1 gap-6 md:columns-2 lg:columns-3 [&>li]:mb-6">
            @for (item of visible(); track item.id; let i = $index) {
              <li appReveal [appRevealDelay]="(i % 6) * 60" class="break-inside-avoid">
                <figure class="card-lux flex h-full flex-col p-7">
                  <app-icon name="quote" [size]="22" class="text-clay-500/70" />
                  <app-rating [value]="item.rating" [size]="14" class="mt-4" />
                  <figcaption class="mt-4 font-display text-xl leading-snug">
                    {{ item.title }}
                  </figcaption>
                  <blockquote class="mt-3 flex-1 text-sm leading-relaxed text-ink-600">
                    {{ item.quote }}
                  </blockquote>
                  <div class="mt-6 flex items-center gap-3 border-t border-ink-200 pt-5">
                    <span
                      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-clay-600/25 bg-clay-50 text-caption font-bold text-clay-700"
                      >{{ initials(item.name) }}</span
                    >
                    <span class="min-w-0">
                      <span class="block truncate text-sm font-semibold text-ink-900">{{
                        item.name
                      }}</span>
                      <span class="block truncate text-caption text-ink-500"
                        >{{ item.location }} &middot; {{ item.visitContext }}</span
                      >
                    </span>
                  </div>
                </figure>
              </li>
            }
          </ul>
        }
      </div>
    </section>

    <!-- Dish reviews -->
    @if (dishReviews().length) {
      <section class="section border-t border-ink-200 bg-ink-50">
        <div class="container-lux">
          <app-section-header
            appReveal
            eyebrow="Recent"
            title="Reviews left on"
            accent=" individual dishes"
          />
          <ul class="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            @for (review of dishReviews(); track review.id; let i = $index) {
              <li appReveal [appRevealDelay]="(i % 6) * 55">
                <article class="card-lux h-full p-6">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p class="text-sm font-semibold text-ink-900">{{ review.customerName }}</p>
                      <p class="mt-0.5 text-caption text-ink-500">{{ review.createdAt | niceDate }}</p>
                    </div>
                    <app-rating [value]="review.rating" [size]="13" />
                  </div>
                  <p class="mt-4 font-display text-lg">{{ review.title }}</p>
                  <p class="mt-2 text-sm leading-relaxed text-ink-600">{{ review.body }}</p>
                  @if (review.reply) {
                    <div class="mt-4 rounded-lg border-l-2 border-clay-500/60 bg-ink-50 p-3.5">
                      <p class="text-micro font-bold text-clay-700 uppercase">Salateen replied</p>
                      <p class="mt-1.5 text-xs leading-relaxed text-ink-600">{{ review.reply }}</p>
                    </div>
                  }
                </article>
              </li>
            }
          </ul>
        </div>
      </section>
    }

    <!-- CTA -->
    <section class="section">
      <div class="container-lux max-w-2xl text-center">
        <h2 class="font-display text-3xl">Been in recently?</h2>
        <p class="mt-3 leading-relaxed text-ink-600">
          Tell us how it went. Honest criticism reaches the kitchen faster than praise does, and we
          would rather hear it from you than read it later.
        </p>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <a routerLink="/contact" class="btn btn-primary btn-lg">Leave feedback</a>
          <a routerLink="/reservation" class="btn btn-secondary btn-lg">Book another table</a>
        </div>
      </div>
    </section>
  `,
})
export class TestimonialsPage {
  private readonly content = inject(ContentService);
  private readonly restaurant = inject(RestaurantService);
  private readonly seo = inject(SeoService);

  protected readonly stars = signal<number | null>(null);
  protected readonly filters = [
    { value: null, label: 'All reviews' },
    { value: 5, label: '5 stars' },
    { value: 4, label: '4 stars' },
    { value: 3, label: '3 stars and below' },
  ];

  protected readonly metrics = [
    { label: 'Would return', value: '94%' },
    { label: 'Portion size', value: '4.8' },
    { label: 'Value', value: '4.7' },
    { label: 'Family friendly', value: '4.9' },
  ];

  protected readonly testimonials = computed(() => this.content.testimonials());

  protected readonly visible = computed(() => {
    const filter = this.stars();
    const all = this.testimonials();
    if (filter === null) return all;
    if (filter === 3) return all.filter((t) => t.rating <= 3);
    return all.filter((t) => t.rating === filter);
  });

  private readonly reviews = toSignal(this.content.reviews({ isApproved: true }), {
    initialValue: [] as Review[],
  });
  protected readonly dishReviews = computed(() => this.reviews().slice(0, 9));

  protected readonly rating = computed(() => this.restaurant.profile()?.rating ?? 4.4);
  protected readonly ratingCount = computed(() => this.restaurant.profile()?.ratingCount ?? 1287);

  protected readonly distribution = computed(() => {
    const all = this.testimonials();
    if (!all.length) return [5, 4, 3, 2, 1].map((stars) => ({ stars, percent: 0 }));
    return [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      percent: Math.round((all.filter((t) => t.rating === stars).length / all.length) * 100),
    }));
  });

  constructor() {
    this.seo.apply({
      title: 'Guest Reviews & Testimonials | Salateen Restaurant Swabi',
      description:
        'What guests say about Salateen Restaurant Swabi: generous portions, the Kabuli Pulao, the family hall, and honest notes on service at peak times.',
      path: 'testimonials',
      image: 'assets/images/ambience/family-dining.webp',
      keywords: ['Salateen reviews', 'Swabi restaurant reviews', 'best restaurant Swabi'],
    });
    this.seo.breadcrumbSchema([{ label: 'Testimonials', path: 'testimonials' }]);
  }

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }
}
