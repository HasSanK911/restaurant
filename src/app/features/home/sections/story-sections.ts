import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GalleryImage, Testimonial } from '../../../core/models/content.model';
import { RestaurantProfile } from '../../../core/models/restaurant.model';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { ParallaxDirective } from '../../../shared/directives/parallax.directive';
import {
  RatingComponent,
  SectionHeaderComponent,
} from '../../../shared/components/ui/display.components';
import { IconComponent, IconName } from '../../../shared/components/ui/icon.component';
import { ImageComponent } from '../../../shared/components/ui/image.component';

/** The restaurant story: overlapping photographs beside the narrative. */
@Component({
  selector: 'app-story-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ImageComponent, IconComponent, RevealDirective, ParallaxDirective],
  host: { class: 'block' },
  template: `
    <section class="section relative overflow-hidden border-y border-ink-200/60 bg-ink-50/30">
      <div class="container-lux grid gap-14 lg:grid-cols-12 lg:items-center">
        <!-- Image cluster -->
        <div appReveal class="relative lg:col-span-6">
          <div class="grid grid-cols-5 grid-rows-6 gap-4" style="min-height: 30rem">
            <div class="col-span-3 row-span-4 overflow-hidden rounded-2xl border border-ink-200">
              <app-image
                src="assets/images/interior/main-dining-hall"
                alt="The blue-tiled main dining hall at Salateen Restaurant Swabi"
                sizes="(max-width: 1024px) 55vw, 22rem"
                class="h-full w-full"
              />
            </div>
            <div
              class="col-span-2 col-start-4 row-span-3 row-start-2 overflow-hidden rounded-2xl border border-clay-500/15"
              [appParallax]="0.05"
            >
              <app-image
                src="assets/images/bbq/chef-grilling"
                alt="A chef turning skewers over charcoal"
                sizes="(max-width: 1024px) 40vw, 16rem"
                class="h-full w-full"
              />
            </div>
            <div
              class="col-span-3 col-start-2 row-span-2 row-start-5 overflow-hidden rounded-2xl border border-ink-200"
            >
              <app-image
                src="assets/images/exterior/storefront-day"
                alt="The Salateen Restaurant shopfront on Jhangira Road"
                sizes="(max-width: 1024px) 55vw, 22rem"
                class="h-full w-full"
              />
            </div>
          </div>

          <!-- Established badge -->
          <div
            class="glass-strong absolute -bottom-4 left-0 flex items-center gap-4 rounded-2xl px-5 py-4 shadow-lux"
          >
            <span
              class="flex h-11 w-11 items-center justify-center rounded-full border border-clay-500/30 bg-clay-500/8 text-clay-600"
            >
              <app-icon name="sparkle" [size]="19" />
            </span>
            <span>
              <span class="block font-display text-2xl leading-none text-ink-900">{{ years() }}</span>
              <span class="mt-0.5 block text-micro font-semibold tracking-[0.2em] text-ink-500 uppercase"
                >Years on this road</span
              >
            </span>
          </div>
        </div>

        <!-- Narrative -->
        <div appReveal [appRevealDelay]="120" class="lg:col-span-6">
          <p class="eyebrow mb-4">Our story</p>
          <h2 class="text-4xl leading-[1.05] text-ink-900 sm:text-5xl">
            A degh large enough
            <span class="text-gradient-clay italic">for a wedding</span>
          </h2>
          <div class="mt-6 space-y-4 leading-relaxed text-ink-600">
            <p>
              Salateen opened on Jhangira Road in {{ founded() }}, in a stretch of Mal Lar where the
              Grand Trunk traffic slows and the smell of charcoal reaches the road before the
              signboard does.
            </p>
            <p>
              The kitchen has never pretended to be anything other than Pakhtun. Mutton karahi
              finished in copper. Seekh kabab turned by hand over open coals. Kabuli Pulao steamed
              in a degh large enough to feed a wedding, which is precisely what it often does.
            </p>
            <p>
              Portions are famously generous. The full platter comfortably seats ten around a single
              tray, which is why families drive in from Mardan and Nowshera for graduations, walimas
              and plain Friday lunches.
            </p>
          </div>

          <dl class="mt-10 grid grid-cols-3 gap-6">
            @for (stat of stats(); track stat.label) {
              <div>
                <dt class="text-micro font-semibold tracking-[0.2em] text-ink-500 uppercase">
                  {{ stat.label }}
                </dt>
                <dd class="mt-1.5 font-display text-3xl text-clay-700">{{ stat.value }}</dd>
              </div>
            }
          </dl>

          <div class="mt-9 flex flex-wrap gap-3">
            <a routerLink="/our-story" class="btn btn-primary btn-md">
              Read our story
              <app-icon name="arrow-right" [size]="15" />
            </a>
            <a routerLink="/gallery" class="btn btn-secondary btn-md">See the restaurant</a>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class StorySection {
  readonly profile = input.required<RestaurantProfile | null>();

  protected readonly founded = computed(() => this.profile()?.foundedYear ?? 2011);
  protected readonly years = computed(() => new Date().getFullYear() - this.founded());
  protected readonly stats = computed(() => [
    { label: 'Seats', value: this.profile()?.seatingCapacity ?? 240 },
    { label: 'Halls', value: 3 },
    { label: 'Open until', value: '12am' },
  ]);
}

interface Reason {
  icon: IconName;
  title: string;
  body: string;
}

/** Why choose us: four pillars drawn from what guests actually write about. */
@Component({
  selector: 'app-why-us-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SectionHeaderComponent, IconComponent, RevealDirective],
  host: { class: 'block' },
  template: `
    <section class="section">
      <div class="container-lux">
        <app-section-header
          appReveal
          eyebrow="Why Salateen"
          title="Four reasons people"
          accent=" drive here"
          description="Taken from what guests consistently write about us, not from a marketing brief."
        />

        <ul class="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          @for (reason of reasons; track reason.title; let i = $index) {
            <li appReveal [appRevealDelay]="i * 90">
              <div
                class="card-lux group h-full p-7 transition-all duration-500 hover:-translate-y-1.5 hover:border-clay-500/35"
              >
                <span
                  class="flex h-12 w-12 items-center justify-center rounded-xl border border-clay-500/25 bg-clay-500/8 text-clay-600 transition-all duration-500 group-hover:scale-110 group-hover:border-clay-500/50"
                >
                  <app-icon [name]="reason.icon" [size]="22" />
                </span>
                <h3 class="mt-5 font-display text-xl text-ink-900">{{ reason.title }}</h3>
                <p class="mt-2.5 text-sm leading-relaxed text-ink-600">{{ reason.body }}</p>
              </div>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
})
export class WhyUsSection {
  protected readonly reasons: Reason[] = [
    {
      icon: 'users',
      title: 'Portions built for a table',
      body: 'The full platter feeds ten from one tray. Guests routinely report a bill of around six thousand rupees for a party that size.',
    },
    {
      icon: 'flame',
      title: 'Charcoal, never gas',
      body: 'The pits are lit at four every afternoon and worked by hand until close. Nothing is held under a lamp.',
    },
    {
      icon: 'shield',
      title: 'Family halls with full purdah',
      body: 'Eight partitioned tables behind full-height screens, with a dedicated attendant who announces before entering.',
    },
    {
      icon: 'wallet',
      title: 'Honest cash pricing',
      body: 'Prices come straight off our printed menu card. Cash on delivery or cash at the counter. No hidden service charge.',
    },
  ];
}

/** Guest reviews rail with the aggregate score. */
@Component({
  selector: 'app-reviews-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RatingComponent, IconComponent, RevealDirective],
  host: { class: 'block' },
  template: `
    <section class="section border-y border-ink-200/60 bg-ink-50/30">
      <div class="container-lux">
        <div class="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div appReveal class="max-w-xl">
            <p class="eyebrow mb-3">Guest reviews</p>
            <h2 class="text-display text-ink-900">
              What people say
              <span class="text-gradient-clay italic">after they leave</span>
            </h2>
          </div>

          <div appReveal class="flex items-center gap-6">
            <div class="text-center">
              <p class="font-display text-5xl leading-none text-clay-700">{{ rating().toFixed(1) }}</p>
              <app-rating [value]="rating()" [size]="14" class="mt-2 justify-center" />
              <p class="mt-1.5 text-xs text-ink-500">
                {{ ratingCount().toLocaleString('en-PK') }} reviews
              </p>
            </div>
            <a routerLink="/testimonials" class="btn btn-secondary btn-md">
              Read all
              <app-icon name="arrow-right" [size]="15" />
            </a>
          </div>
        </div>

        <ul
          class="no-scrollbar mt-12 -mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0"
        >
          @for (item of testimonials(); track item.id; let i = $index) {
            <li
              appReveal
              [appRevealDelay]="i * 90"
              class="w-[85vw] shrink-0 snap-start sm:w-[24rem] lg:w-auto"
            >
              <figure class="card-lux flex h-full flex-col p-7">
                <app-icon name="quote" [size]="22" class="text-clay-600/60" />
                <app-rating [value]="item.rating" [size]="14" class="mt-4" />
                <figcaption class="mt-4 font-display text-xl leading-snug text-ink-900">
                  {{ item.title }}
                </figcaption>
                <blockquote class="mt-3 flex-1 text-sm leading-relaxed text-ink-600">
                  {{ item.quote }}
                </blockquote>
                <div class="mt-6 flex items-center gap-3 border-t border-ink-200 pt-5">
                  <span
                    class="flex h-10 w-10 items-center justify-center rounded-full border border-clay-500/25 bg-clay-500/8 text-xs font-bold text-clay-700"
                    >{{ initials(item.name) }}</span
                  >
                  <span class="min-w-0">
                    <span class="block truncate text-sm font-semibold text-ink-900">{{ item.name }}</span>
                    <span class="block truncate text-xs text-ink-500"
                      >{{ item.location }} &middot; {{ item.visitContext }}</span
                    >
                  </span>
                </div>
              </figure>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
})
export class ReviewsSection {
  readonly testimonials = input.required<Testimonial[]>();
  readonly rating = input.required<number>();
  readonly ratingCount = input.required<number>();

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }
}

/** Gallery preview: a masonry-ish mosaic linking through to the full gallery. */
@Component({
  selector: 'app-gallery-preview-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ImageComponent, IconComponent, SectionHeaderComponent, RevealDirective],
  host: { class: 'block' },
  template: `
    <section class="section">
      <div class="container-lux">
        <app-section-header
          appReveal
          eyebrow="Inside Salateen"
          title="The room, the fire"
          accent=" and the food"
          description="Every photograph on this site was taken inside the restaurant. Nothing is stock."
        />

        <div appReveal class="mt-14 grid grid-cols-2 gap-3 md:grid-cols-4 md:grid-rows-2">
          @for (image of tiles(); track image.id; let i = $index) {
            <a
              routerLink="/gallery"
              class="group relative overflow-hidden rounded-xl border border-ink-200"
              [class]="i === 0 ? 'col-span-2 row-span-2 aspect-square md:aspect-auto' : 'aspect-square'"
              [attr.aria-label]="'View gallery: ' + image.title"
            >
              <app-image
                [src]="image.image"
                [alt]="image.title"
                [sizes]="i === 0 ? '(max-width: 768px) 92vw, 32rem' : '(max-width: 768px) 45vw, 16rem'"
                class="h-full w-full transition-transform duration-[900ms] group-hover:scale-110"
              />
              <div
                class="absolute inset-0 bg-gradient-to-t from-scrim/90 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-95"
              ></div>
              <p
                class="absolute right-4 bottom-4 left-4 translate-y-2 text-sm font-semibold text-white opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100"
              >
                {{ image.title }}
              </p>
            </a>
          }
        </div>

        <div class="mt-10 flex justify-center">
          <a routerLink="/gallery" class="btn btn-secondary btn-lg">
            View all {{ total() }} photographs
            <app-icon name="arrow-right" [size]="16" />
          </a>
        </div>
      </div>
    </section>
  `,
})
export class GalleryPreviewSection {
  readonly images = input.required<GalleryImage[]>();
  protected readonly tiles = computed(() => this.images().slice(0, 5));
  protected readonly total = computed(() => this.images().length || 49);
}
