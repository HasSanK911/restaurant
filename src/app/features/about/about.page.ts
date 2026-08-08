import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BRAND } from '../../core/constants/app.constants';
import { ContentService } from '../../core/services/content.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { SeoService } from '../../core/services/seo.service';
import { PageHeroComponent } from '../../shared/components/ui/page-hero.component';
import { IconComponent, IconName } from '../../shared/components/ui/icon.component';
import { ImageComponent } from '../../shared/components/ui/image.component';
import { SectionHeaderComponent } from '../../shared/components/ui/display.components';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { ParallaxDirective } from '../../shared/directives/parallax.directive';

const AMENITY_ICONS: Record<string, IconName> = {
  'Service options': 'utensils',
  Accessibility: 'wheelchair',
  Offerings: 'leaf',
  'Dining options': 'clock',
  Atmosphere: 'sparkle',
  Crowd: 'users',
  Parking: 'parking',
  Planning: 'calendar',
  Payments: 'wallet',
};

@Component({
  selector: 'app-about-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageHeroComponent,
    ImageComponent,
    IconComponent,
    SectionHeaderComponent,
    RevealDirective,
    ParallaxDirective,
  ],
  template: `
    <app-page-hero
      eyebrow="About us"
      title="A restaurant built"
      accent=" around one tray"
      description="Salateen has stood on Jhangira Road since 2011, feeding families from Swabi, Mardan and Nowshera the way a Pakhtun kitchen should."
      image="assets/images/interior/hall-wide"
      imageAlt="The main hall at Salateen Restaurant Swabi seen from the kitchen pass"
      [crumbs]="[{ label: 'About' }]"
    />

    <!-- Intro -->
    <section class="section">
      <div class="container-lux grid gap-12 lg:grid-cols-12 lg:items-start">
        <div appReveal class="lg:col-span-7">
          <p class="eyebrow mb-4">Who we are</p>
          <h2 class="text-3xl leading-[1.1] sm:text-4xl">
            Generous portions, honest prices,
            <span class="text-gradient-clay italic">and a room that fits the occasion</span>
          </h2>
          <div class="mt-6 space-y-4 leading-relaxed text-ink-600 measure">
            <p>{{ description() }}</p>
            <p>
              Three halls, a partitioned family wing with full purdah, and a lawn beside the grill
              pits mean the room adapts to the occasion rather than the other way round. Everything
              is halal, everything is cooked to order, and the green tea never stops arriving.
            </p>
          </div>

          <dl class="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
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

        <div appReveal [appRevealDelay]="120" class="lg:col-span-5">
          <div class="space-y-4">
            <div class="aspect-[4/3] overflow-hidden rounded-2xl border border-ink-200">
              <app-image
                src="assets/images/exterior/storefront-day"
                alt="The Salateen Restaurant shopfront on Jhangira Road, Swabi"
                sizes="(max-width: 1024px) 92vw, 28rem"
                class="h-full w-full"
              />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="aspect-square overflow-hidden rounded-2xl border border-ink-200">
                <app-image
                  src="assets/images/ambience/family-garden"
                  alt="A family at an outdoor table on the lawn"
                  sizes="14rem"
                  class="h-full w-full"
                />
              </div>
              <div class="aspect-square overflow-hidden rounded-2xl border border-ink-200">
                <app-image
                  src="assets/images/bbq/wood-fire"
                  alt="A wood fire under the open karahi"
                  sizes="14rem"
                  class="h-full w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Values -->
    <section class="section border-y border-ink-200 bg-ink-50">
      <div class="container-lux">
        <app-section-header
          appReveal
          eyebrow="What we hold to"
          title="Four things we will not"
          accent=" compromise on"
        />
        <ul class="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          @for (value of values; track value.title; let i = $index) {
            <li appReveal [appRevealDelay]="i * 90">
              <div class="card-lux h-full p-7">
                <span
                  class="flex h-12 w-12 items-center justify-center rounded-xl border border-clay-600/20 bg-clay-50 text-clay-700"
                >
                  <app-icon [name]="value.icon" [size]="22" />
                </span>
                <h3 class="mt-5 font-display text-xl">{{ value.title }}</h3>
                <p class="mt-2.5 text-sm leading-relaxed text-ink-600">{{ value.body }}</p>
              </div>
            </li>
          }
        </ul>
      </div>
    </section>

    <!-- The rooms -->
    <section class="section">
      <div class="container-lux">
        <app-section-header
          appReveal
          eyebrow="The building"
          title="Three halls, a lawn"
          accent=" and a wall of coals"
        />
        <div class="mt-14 grid gap-6 lg:grid-cols-3">
          @for (room of rooms; track room.title; let i = $index) {
            <article appReveal [appRevealDelay]="i * 100" class="card-lux overflow-hidden">
              <div class="aspect-[4/3] overflow-hidden">
                <app-image
                  [src]="room.image"
                  [alt]="room.title"
                  sizes="(max-width: 1024px) 92vw, 24rem"
                  class="h-full w-full"
                />
              </div>
              <div class="p-6">
                <h3 class="font-display text-xl">{{ room.title }}</h3>
                <p class="mt-2 text-sm leading-relaxed text-ink-600">{{ room.body }}</p>
                <p class="mt-4 flex items-center gap-2 text-xs font-semibold text-clay-700">
                  <app-icon name="users" [size]="14" />
                  {{ room.capacity }}
                </p>
              </div>
            </article>
          }
        </div>
      </div>
    </section>

    <!-- Amenities from the live profile -->
    @if (amenities().length) {
      <section class="section border-t border-ink-200 bg-ink-50">
        <div class="container-lux">
          <app-section-header
            appReveal
            eyebrow="Practical details"
            title="Everything you might"
            accent=" want to check"
            description="Taken from our public listing, so it matches what you will find if you look us up elsewhere."
          />
          <div class="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            @for (group of amenities(); track group.group; let i = $index) {
              <div appReveal [appRevealDelay]="i * 60" class="card-lux p-6">
                <p class="flex items-center gap-2.5 text-sm font-semibold text-ink-900">
                  <app-icon [name]="iconFor(group.group)" [size]="17" class="text-clay-600" />
                  {{ group.group }}
                </p>
                <ul class="mt-4 space-y-2">
                  @for (item of group.items; track item) {
                    <li class="flex items-start gap-2 text-sm text-ink-600">
                      <app-icon
                        name="check"
                        [size]="13"
                        class="mt-1 shrink-0 text-clay-600"
                        [strokeWidth]="2.4"
                      />
                      {{ item }}
                    </li>
                  }
                </ul>
              </div>
            }
          </div>
        </div>
      </section>
    }

    <!-- CTA band -->
    <section class="grain-overlay relative isolate overflow-hidden py-24">
      <app-image
        src="assets/images/food/grand-platter"
        alt="The Grand Platter at Salateen Restaurant"
        sizes="100vw"
        class="absolute inset-0 h-full w-full"
        [appParallax]="0.08"
      />
      <div class="absolute inset-0 bg-scrim/78" aria-hidden="true"></div>
      <div class="on-photo container-lux relative text-center">
        <h2 class="mx-auto max-w-2xl text-3xl sm:text-4xl">Come and see for yourself</h2>
        <p class="mx-auto mt-4 max-w-lg text-white/80">
          {{ brand.street }}, {{ brand.city }}. Open every day, ten in the morning until midnight.
        </p>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <a routerLink="/reservation" class="btn btn-primary btn-lg">Book a table</a>
          <a routerLink="/menu" class="btn btn-secondary btn-lg">See the menu</a>
        </div>
      </div>
    </section>
  `,
})
export class AboutPage {
  private readonly restaurant = inject(RestaurantService);
  private readonly content = inject(ContentService);
  private readonly seo = inject(SeoService);

  protected readonly brand = BRAND;

  protected readonly description = computed(
    () =>
      this.restaurant.profile()?.longDescription ??
      'Salateen Restaurant Swabi stands on Jhangira Road in Mal Lar, where the Grand Trunk traffic slows and the smell of charcoal reaches the road before the signboard does.',
  );

  protected readonly amenities = computed(() => this.restaurant.profile()?.amenities ?? []);

  protected readonly stats = computed(() => {
    const profile = this.restaurant.profile();
    return [
      { label: 'Established', value: profile?.foundedYear ?? 2011 },
      { label: 'Seats', value: profile?.seatingCapacity ?? 240 },
      { label: 'Guest rating', value: (profile?.rating ?? 4.4).toFixed(1) },
      { label: 'Reviews', value: (profile?.ratingCount ?? 1287).toLocaleString('en-PK') },
    ];
  });

  protected readonly values: { icon: IconName; title: string; body: string }[] = [
    {
      icon: 'flame',
      title: 'Cook it when they order it',
      body: 'Nothing is pre-cooked and nothing sits under a lamp. It is why a karahi takes thirty-two minutes here and twenty elsewhere.',
    },
    {
      icon: 'shield',
      title: 'One meat supplier, six years',
      body: 'We buy from the same Swabi butcher every morning. It costs more than shopping around and we are not changing it.',
    },
    {
      icon: 'users',
      title: 'The family hall is not optional',
      body: 'It was the first room we drew in 2011. In Swabi it is the difference between a restaurant a family can use and one they cannot.',
    },
    {
      icon: 'wallet',
      title: 'The printed price is the price',
      body: 'No service charge, no online mark-up, no card fee. Cash on delivery or cash at the counter.',
    },
  ];

  protected readonly rooms = [
    {
      title: 'The Main Hall',
      body: 'Blue tile, blue tables and a hand-painted mural of the mountains running the length of the room. Air-conditioned, and the busiest room on a Friday.',
      capacity: 'Seats around 110',
      image: 'assets/images/interior/main-dining-hall',
    },
    {
      title: 'The Family Hall',
      body: 'Eight tables behind full-height partitions, screened so no table is visible from another or from the corridor. A dedicated attendant announces before entering.',
      capacity: 'Seats up to 40',
      image: 'assets/images/interior/family-hall-lit',
    },
    {
      title: 'The Lawn',
      body: 'Open-air tables beside the charcoal pits, with red marquees that go up when the winter arrives. Ask for it when the weather is good.',
      capacity: 'Seats around 60',
      image: 'assets/images/ambience/family-garden',
    },
  ];

  constructor() {
    this.seo.apply({
      title: 'About Salateen Restaurant Swabi | Pakhtun Kitchen Since 2011',
      description:
        'Salateen Restaurant has stood on Jhangira Road, Mal Lar, Swabi since 2011. Three halls, a family wing with full purdah, a lawn beside the charcoal pits, and portions built for a whole table.',
      path: 'about',
      image: 'assets/images/interior/hall-wide.webp',
      keywords: [
        'about Salateen Restaurant',
        'Swabi restaurant history',
        'family hall Swabi',
        'Pakhtun restaurant',
      ],
    });
    this.seo.breadcrumbSchema([{ label: 'About', path: 'about' }]);
  }

  protected iconFor(group: string): IconName {
    return AMENITY_ICONS[group] ?? 'check-circle';
  }
}
