import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MenuCategory, MenuItem } from '../../../core/models/menu.model';
import { Chef } from '../../../core/models/content.model';
import { CurrencyPkrPipe } from '../../../shared/pipes/currency-pkr.pipe';
import { MenuItemCardComponent } from '../../../shared/components/menu-item-card.component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { ParallaxDirective } from '../../../shared/directives/parallax.directive';
import {
  SectionHeaderComponent,
  BadgeComponent,
  RatingComponent,
} from '../../../shared/components/ui/display.components';
import { IconComponent } from '../../../shared/components/ui/icon.component';
import { ImageComponent } from '../../../shared/components/ui/image.component';
import { SkeletonCardComponent } from '../../../shared/components/ui/feedback.components';

/** Today's specials: a horizontal scroll-snap rail of chef-recommended dishes. */
@Component({
  selector: 'app-specials-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MenuItemCardComponent,
    SectionHeaderComponent,
    SkeletonCardComponent,
    RevealDirective,
    IconComponent,
  ],
  host: { class: 'block' },
  template: `
    <section id="todays-specials" class="section relative overflow-hidden">
      <div
        class="pointer-events-none absolute top-1/3 -left-40 h-96 w-96 rounded-full bg-clay-600/6 blur-[140px]"
        aria-hidden="true"
      ></div>

      <div class="container-lux relative">
        <div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <app-section-header
            appReveal
            align="left"
            eyebrow="Today at the pass"
            title="What the kitchen is"
            accent=" proud of"
            description="Cooked to order over charcoal and in copper. These are the dishes our chefs send out first."
          />
          <a appReveal routerLink="/menu" class="btn btn-secondary btn-md shrink-0">
            Full menu
            <app-icon name="arrow-right" [size]="15" />
          </a>
        </div>

        <div class="mt-12">
          @if (items().length) {
            <ul
              class="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-4"
            >
              @for (item of items(); track item.id; let i = $index) {
                <li
                  appReveal
                  [appRevealDelay]="i * 80"
                  class="w-[82vw] shrink-0 snap-start sm:w-[20rem] md:w-auto"
                >
                  <app-menu-item-card [item]="item" />
                </li>
              }
            </ul>
          } @else {
            <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              @for (n of [1, 2, 3, 4]; track n) {
                <app-skeleton-card />
              }
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class SpecialsSection {
  readonly items = input.required<MenuItem[]>();
}

/** Category grid. Each tile links into the filtered menu. */
@Component({
  selector: 'app-categories-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ImageComponent, IconComponent, SectionHeaderComponent, RevealDirective],
  host: { class: 'block' },
  template: `
    <section class="section border-y border-ink-200/60 bg-ink-50/30">
      <div class="container-lux">
        <app-section-header
          appReveal
          eyebrow="Browse by section"
          title="Everything comes"
          accent=" from one kitchen"
          description="Twelve sections, one pass. Ordered the way the menu card is printed."
        />

        <ul class="mt-14 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          @for (category of categories(); track category.id; let i = $index) {
            <li appReveal [appRevealDelay]="i * 55">
              <a
                [routerLink]="['/menu/c', category.slug]"
                class="group relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-xl border border-ink-200 p-4 transition-all duration-500 hover:-translate-y-1.5 hover:border-clay-500/40"
              >
                <app-image
                  [src]="category.image"
                  [alt]="category.name"
                  sizes="(max-width: 768px) 45vw, 16rem"
                  class="absolute inset-0 h-full w-full transition-transform duration-[900ms] group-hover:scale-110"
                />
                <div
                  class="absolute inset-0 bg-gradient-to-t from-scrim/90 via-scrim/30 to-transparent transition-opacity duration-500 group-hover:from-scrim group-hover:via-scrim/45"
                ></div>
                <div class="on-photo relative">
                  <span
                    class="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-clay-600 shadow-soft"
                  >
                    <app-icon [name]="$any(category.icon)" [size]="15" />
                  </span>
                  <p class="font-display text-body-lg leading-tight text-ink-900">
                    {{ category.name }}
                  </p>
                  @if (category.nameUrdu) {
                    <p class="mt-0.5 text-label text-clay-200/85" dir="rtl" lang="ur">
                      {{ category.nameUrdu }}
                    </p>
                  }
                </div>
              </a>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
})
export class CategoriesSection {
  readonly categories = input.required<MenuCategory[]>();
}

/** Popular dishes, ranked, in a numbered editorial list beside a hero photo. */
@Component({
  selector: 'app-popular-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ImageComponent,
    IconComponent,
    RatingComponent,
    SectionHeaderComponent,
    RevealDirective,
    ParallaxDirective,
    CurrencyPkrPipe,
  ],
  host: { class: 'block' },
  template: `
    <section class="section">
      <div class="container-lux grid gap-14 lg:grid-cols-12 lg:items-center">
        <!-- Feature photo -->
        <div appReveal class="relative lg:col-span-5">
          <div class="relative aspect-[4/5] overflow-hidden rounded-2xl border border-clay-500/12">
            @if (leader(); as top) {
              <app-image
                [src]="top.image"
                [alt]="top.name"
                sizes="(max-width: 1024px) 92vw, 34rem"
                class="h-full w-full"
                [appParallax]="0.06"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-scrim via-transparent to-transparent"></div>
              <div class="on-photo absolute inset-x-6 bottom-6">
                <p class="eyebrow mb-2">Most ordered</p>
                <p class="font-display text-3xl text-ink-900">{{ top.name }}</p>
                <p class="mt-1.5 text-sm text-ink-600">
                  {{ top.orderCount.toLocaleString('en-PK') }} plates served
                </p>
              </div>
            }
          </div>
          <!-- Floating stat -->
          <div
            class="glass-strong absolute -top-5 -right-5 hidden rounded-2xl px-5 py-4 shadow-lux sm:block"
          >
            <p class="text-micro font-semibold tracking-[0.2em] text-ink-500 uppercase">
              Kitchen average
            </p>
            <p class="mt-1 font-display text-2xl text-clay-700">32 min</p>
          </div>
        </div>

        <!-- Ranked list -->
        <div class="lg:col-span-7">
          <app-section-header
            appReveal
            align="left"
            eyebrow="Ordered most often"
            title="The ten dishes Swabi"
            accent=" keeps coming back for"
            description="Ranked by plates served across the last twelve months."
          />

          <ol class="mt-10 divide-y divide-ink-200/70">
            @for (item of ranked(); track item.id; let i = $index) {
              <li appReveal [appRevealDelay]="i * 45">
                <a
                  [routerLink]="['/menu', item.slug]"
                  class="group flex items-center gap-4 py-4 transition-colors"
                >
                  <span
                    class="w-7 shrink-0 font-display text-2xl leading-none text-ink-500 transition-colors group-hover:text-clay-600"
                    >{{ i + 1 < 10 ? '0' : '' }}{{ i + 1 }}</span
                  >
                  <span
                    class="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-ink-200"
                  >
                    <app-image [src]="item.image" [alt]="item.name" sizes="56px" class="h-full w-full" />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span
                      class="block truncate font-display text-lg text-ink-900 transition-colors group-hover:text-clay-700"
                      >{{ item.name }}</span
                    >
                    <span class="mt-0.5 flex items-center gap-3">
                      <app-rating [value]="item.rating" [size]="12" />
                      <span class="truncate text-xs text-ink-500">{{ item.shortDescription }}</span>
                    </span>
                  </span>
                  <span class="shrink-0 text-right">
                    <span class="block font-display text-xl text-clay-700">{{
                      item.basePrice | pkr
                    }}</span>
                  </span>
                  <app-icon
                    name="arrow-right"
                    [size]="16"
                    class="shrink-0 -translate-x-2 text-clay-600 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                  />
                </a>
              </li>
            }
          </ol>
        </div>
      </div>
    </section>
  `,
})
export class PopularSection {
  readonly items = input.required<MenuItem[]>();
  protected readonly ranked = computed(() => this.items().slice(0, 10));
  protected readonly leader = computed(() => this.items()[0]);
}

/** The BBQ story: full-bleed dark band with the charcoal photography. */
@Component({
  selector: 'app-bbq-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ImageComponent,
    IconComponent,
    BadgeComponent,
    RevealDirective,
    ParallaxDirective,
    CurrencyPkrPipe,
  ],
  host: { class: 'block' },
  template: `
    <section class="grain-overlay relative isolate overflow-hidden py-28 md:py-36">
      <app-image
        src="assets/images/bbq/seekh-on-coals"
        alt="Beef seekh kabab turning over charcoal at Salateen Restaurant"
        sizes="100vw"
        class="absolute inset-0 h-full w-full"
        [appParallax]="0.1"
      />
      <div class="absolute inset-0 bg-paper/86" aria-hidden="true"></div>
      <div
        class="absolute inset-0 bg-gradient-to-r from-paper via-paper/70 to-transparent"
        aria-hidden="true"
      ></div>

      <div class="container-lux relative grid gap-12 lg:grid-cols-12 lg:items-center">
        <div appReveal class="lg:col-span-6">
          <app-badge tone="turmeric" icon="flame">Lit daily at 4pm</app-badge>
          <h2 class="mt-5 text-4xl leading-[1.05] text-ink-900 sm:text-5xl">
            Hardwood coals.
            <span class="text-gradient-clay italic">Never gas.</span>
          </h2>
          <p class="mt-6 max-w-lg text-base leading-relaxed text-ink-700">
            Gas is cheaper, cleaner and easier. We still light hardwood every afternoon at four,
            because radiant heat sets a crust in seconds and leaves the inside alone. Our grill
            master waits for the coals to turn grey before a single skewer touches the bar.
          </p>

          <ul class="mt-8 space-y-3.5">
            @for (point of points; track point) {
              <li class="flex items-start gap-3 text-sm text-ink-700">
                <app-icon name="check" [size]="16" class="mt-0.5 shrink-0 text-clay-600" [strokeWidth]="2.4" />
                {{ point }}
              </li>
            }
          </ul>

          <div class="mt-9 flex flex-wrap gap-3">
            <a routerLink="/menu/c/bbq" class="btn btn-primary btn-lg">
              See the BBQ menu
              <app-icon name="arrow-right" [size]="16" />
            </a>
            <a routerLink="/blog/the-charcoal-question" class="btn btn-secondary btn-lg">
              Read why
            </a>
          </div>
        </div>

        <!-- BBQ picks -->
        <div class="lg:col-span-6">
          <ul class="grid gap-4 sm:grid-cols-2">
            @for (item of items(); track item.id; let i = $index) {
              <li appReveal [appRevealDelay]="i * 90">
                <a
                  [routerLink]="['/menu', item.slug]"
                  class="glass group flex items-center gap-4 rounded-xl p-3.5 transition-all duration-500 hover:-translate-y-1 hover:border-clay-500/40"
                >
                  <span class="h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                    <app-image
                      [src]="item.image"
                      [alt]="item.name"
                      sizes="64px"
                      class="h-full w-full transition-transform duration-700 group-hover:scale-110"
                    />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate font-display text-lg text-ink-900">{{ item.name }}</span>
                    <span class="mt-0.5 block text-xs text-ink-500">{{ item.prepTimeMinutes }} min over coals</span>
                  </span>
                  <span class="shrink-0 font-display text-lg text-clay-700">{{
                    item.basePrice | pkr
                  }}</span>
                </a>
              </li>
            }
          </ul>
        </div>
      </div>
    </section>
  `,
})
export class BbqSection {
  readonly items = input.required<MenuItem[]>();
  protected readonly points = [
    'Marinated a minimum of twelve hours, never on the day',
    'Skewers turned by hand, never on a rotisserie',
    'One grill master on the pits from four until close',
    'Every order fired when you order it, nothing held under a lamp',
  ];
}

/** Chef recommendation panel with a portrait, a quote and their signature dishes. */
@Component({
  selector: 'app-chef-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ImageComponent,
    IconComponent,
    SectionHeaderComponent,
    RevealDirective,
    CurrencyPkrPipe,
  ],
  host: { class: 'block' },
  template: `
    @if (chef(); as person) {
      <section class="section">
        <div class="container-lux">
          <app-section-header
            appReveal
            eyebrow="From the pass"
            title="The chef"
            accent=" recommends"
          />

          <div class="mt-14 grid gap-10 lg:grid-cols-12 lg:items-center">
            <!-- Portrait + quote -->
            <div appReveal class="lg:col-span-5">
              <div class="relative">
                <div class="aspect-[4/5] overflow-hidden rounded-2xl border border-clay-500/12">
                  <app-image
                    [src]="person.photo"
                    [alt]="person.name + ', ' + person.title + ' at Salateen Restaurant'"
                    sizes="(max-width: 1024px) 92vw, 30rem"
                    class="h-full w-full"
                  />
                </div>
                <div
                  class="glass-strong absolute -right-4 -bottom-6 max-w-[17rem] rounded-2xl p-5 shadow-lux sm:-right-8"
                >
                  <app-icon name="quote" [size]="20" class="mb-2.5 text-clay-600" />
                  <p class="font-display text-lg leading-snug text-ink-900 italic">
                    {{ person.quote }}
                  </p>
                  <p class="mt-3 text-micro font-semibold tracking-wide text-clay-600 uppercase">
                    {{ person.name }} &middot; {{ person.title }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Bio + dishes -->
            <div appReveal [appRevealDelay]="120" class="lg:col-span-7">
              <h3 class="font-display text-3xl text-ink-900">
                {{ person.name }}
                <span class="ml-2 text-base font-normal text-clay-600"
                  >{{ person.yearsExperience }} years</span
                >
              </h3>
              <p class="mt-4 leading-relaxed text-ink-600">{{ person.bio }}</p>

              <div class="mt-6 flex flex-wrap gap-2">
                @for (speciality of person.specialities; track speciality) {
                  <span class="chip border-clay-500/30 bg-clay-500/8 text-clay-700">{{
                    speciality
                  }}</span>
                }
              </div>

              @if (dishes().length) {
                <ul class="mt-9 grid gap-3 sm:grid-cols-3">
                  @for (item of dishes(); track item.id) {
                    <li>
                      <a
                        [routerLink]="['/menu', item.slug]"
                        class="card-lux group block overflow-hidden hover:-translate-y-1 hover:border-clay-500/35"
                      >
                        <span class="block aspect-[4/3] overflow-hidden">
                          <app-image
                            [src]="item.image"
                            [alt]="item.name"
                            sizes="16rem"
                            class="h-full w-full transition-transform duration-700 group-hover:scale-110"
                          />
                        </span>
                        <span class="block p-3.5">
                          <span class="block truncate text-sm font-semibold text-ink-900">{{
                            item.name
                          }}</span>
                          <span class="mt-1 block font-display text-lg text-clay-700">{{
                            item.basePrice | pkr
                          }}</span>
                        </span>
                      </a>
                    </li>
                  }
                </ul>
              }
            </div>
          </div>
        </div>
      </section>
    }
  `,
})
export class ChefSection {
  readonly chef = input.required<Chef | undefined>();
  readonly dishes = input.required<MenuItem[]>();
}
