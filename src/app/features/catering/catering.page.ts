import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { BRAND } from '../../core/constants/app.constants';
import { CateringPackage } from '../../core/models/content.model';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { CurrencyPkrPipe } from '../../shared/pipes/currency-pkr.pipe';
import { PageHeroComponent } from '../../shared/components/ui/page-hero.component';
import { IconComponent, IconName } from '../../shared/components/ui/icon.component';
import { ImageComponent } from '../../shared/components/ui/image.component';
import { BadgeComponent, SectionHeaderComponent } from '../../shared/components/ui/display.components';
import { SkeletonCardComponent } from '../../shared/components/ui/feedback.components';
import { RevealDirective } from '../../shared/directives/reveal.directive';

@Component({
  selector: 'app-catering-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageHeroComponent,
    ImageComponent,
    IconComponent,
    BadgeComponent,
    SectionHeaderComponent,
    SkeletonCardComponent,
    RevealDirective,
    CurrencyPkrPipe,
  ],
  template: `
    <app-page-hero
      eyebrow="Catering"
      title="Deghs delivered hot,"
      accent=" anywhere in Swabi district"
      description="Between eight and fifteen functions a month, from a hundred guests upwards. Kabuli Pulao, mutton karahi, chapli kabab and a live tandoor."
      image="assets/images/food/pulao-tray"
      imageAlt="A full tray of Kabuli Pulao prepared for a function"
      [crumbs]="[{ label: 'Catering' }]"
      size="md"
    />

    <!-- Guest calculator -->
    <section class="pt-12">
      <div class="container-lux">
        <div class="panel p-7">
          <div class="grid gap-6 lg:grid-cols-12 lg:items-center">
            <div class="lg:col-span-5">
              <p class="eyebrow mb-2">Quick estimate</p>
              <h2 class="font-display text-2xl">How many guests?</h2>
              <p class="mt-2 text-sm text-ink-600">
                Move the slider for an indicative per-head cost. Final quotes come from a phone call.
              </p>
            </div>
            <div class="lg:col-span-4">
              <label class="sr-only" for="guest-count">Number of guests</label>
              <input
                id="guest-count"
                type="range"
                class="w-full accent-[var(--color-clay-600)]"
                min="20"
                max="600"
                step="10"
                [value]="guests()"
                (input)="setGuests($any($event.target).value)"
              />
              <div class="mt-2 flex justify-between text-caption text-ink-500">
                <span>20</span>
                <span class="font-display text-2xl text-clay-700">{{ guests() }} guests</span>
                <span>600</span>
              </div>
            </div>
            <div class="lg:col-span-3">
              <div class="rounded-xl border border-clay-600/25 bg-clay-50 p-4 text-center">
                <p class="text-caption text-ink-500">Indicative total</p>
                <p class="mt-1 font-display text-3xl text-clay-800">{{ estimate() | pkr }}</p>
                <p class="mt-1 text-caption text-ink-500">{{ recommendedName() }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Packages -->
    <section class="section pt-14">
      <div class="container-lux">
        <app-section-header
          appReveal
          eyebrow="Packages"
          title="Five ways to"
          accent=" feed a function"
          description="Every package is a starting point. Swap dishes freely; the kitchen is used to it."
        />

        @if (!packages().length) {
          <div class="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            @for (n of [1, 2, 3]; track n) {
              <app-skeleton-card />
            }
          </div>
        } @else {
          <ul class="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            @for (pkg of packages(); track pkg.id; let i = $index) {
              <li appReveal [appRevealDelay]="i * 80">
                <article
                  class="card-lux relative flex h-full flex-col overflow-hidden"
                  [class]="pkg.isPopular ? 'border-clay-600/45 shadow-clay' : ''"
                >
                  @if (pkg.isPopular) {
                    <span class="absolute top-4 right-4 z-10">
                      <app-badge tone="clay">Most chosen</app-badge>
                    </span>
                  }
                  <div class="aspect-[16/10] overflow-hidden">
                    <app-image
                      [src]="pkg.image"
                      [alt]="pkg.name + ' catering package'"
                      sizes="(max-width: 768px) 92vw, 24rem"
                      class="h-full w-full"
                    />
                  </div>
                  <div class="flex flex-1 flex-col p-6">
                    <p class="eyebrow">{{ pkg.tagline }}</p>
                    <h3 class="mt-2 font-display text-2xl">{{ pkg.name }}</h3>
                    <p class="mt-2.5 text-sm leading-relaxed text-ink-600">{{ pkg.description }}</p>

                    <p class="mt-5 flex items-baseline gap-2">
                      <span class="font-display text-3xl text-clay-700">{{ pkg.pricePerHead | pkr }}</span>
                      <span class="text-sm text-ink-500">per head</span>
                    </p>
                    <p class="mt-1 text-caption text-ink-500">
                      Minimum {{ pkg.minGuests }} guests
                    </p>

                    <div class="mt-5 border-t border-ink-200 pt-5">
                      <p class="text-micro tracking-[0.16em] text-ink-500 uppercase">On the menu</p>
                      <ul class="mt-2.5 flex flex-wrap gap-1.5">
                        @for (course of pkg.courses; track course) {
                          <li class="chip border-ink-300 text-ink-600">{{ course }}</li>
                        }
                      </ul>
                    </div>

                    <div class="mt-5">
                      <p class="text-micro tracking-[0.16em] text-ink-500 uppercase">Included</p>
                      <ul class="mt-2.5 space-y-2">
                        @for (item of pkg.includes; track item) {
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

                    <a
                      [href]="'tel:' + brand.phone"
                      class="btn mt-auto w-full"
                      [class]="pkg.isPopular ? 'btn-primary btn-md' : 'btn-secondary btn-md'"
                    >
                      <app-icon name="phone" [size]="15" />
                      Get a quote
                    </a>
                  </div>
                </article>
              </li>
            }
          </ul>
        }
      </div>
    </section>

    <!-- How it works -->
    <section class="section border-y border-ink-200 bg-ink-50">
      <div class="container-lux">
        <app-section-header
          appReveal
          eyebrow="The process"
          title="Three decisions"
          accent=" that matter most"
          description="Get these right seven days out and the rest is our problem."
        />
        <ol class="mt-14 grid gap-6 md:grid-cols-3">
          @for (step of process; track step.title; let i = $index) {
            <li appReveal [appRevealDelay]="i * 90">
              <div class="card-lux h-full p-7">
                <span
                  class="flex h-11 w-11 items-center justify-center rounded-full bg-clay-600 font-display text-lg text-white"
                  >{{ i + 1 }}</span
                >
                <h3 class="mt-5 font-display text-xl">{{ step.title }}</h3>
                <p class="mt-2.5 text-sm leading-relaxed text-ink-600">{{ step.body }}</p>
              </div>
            </li>
          }
        </ol>
      </div>
    </section>

    <!-- What we need -->
    <section class="section">
      <div class="container-lux grid gap-10 lg:grid-cols-12">
        <div class="lg:col-span-6">
          <h2 class="text-3xl leading-tight">What we need from you</h2>
          <ul class="mt-7 space-y-4">
            @for (need of needs; track need.title; let i = $index) {
              <li appReveal [appRevealDelay]="i * 60" class="flex gap-4">
                <span
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-clay-600/20 bg-clay-50 text-clay-700"
                >
                  <app-icon [name]="need.icon" [size]="18" />
                </span>
                <span>
                  <span class="block font-semibold text-ink-900">{{ need.title }}</span>
                  <span class="mt-1 block text-sm leading-relaxed text-ink-600">{{ need.body }}</span>
                </span>
              </li>
            }
          </ul>
        </div>

        <div class="lg:col-span-6">
          <div class="panel p-7">
            <h2 class="font-display text-2xl">Ask for a quote</h2>
            <p class="mt-2 text-sm leading-relaxed text-ink-600">
              A phone call is genuinely faster than a form for this. Ask for the manager and have
              your guest count, date and venue to hand.
            </p>
            <div class="mt-6 space-y-2.5">
              <a [href]="'tel:' + brand.phone" class="btn btn-primary btn-lg w-full">
                <app-icon name="phone" [size]="16" />
                {{ brand.phoneDisplay }}
              </a>
              <a
                [href]="whatsappUrl"
                target="_blank"
                rel="noopener"
                class="btn btn-secondary btn-md w-full"
              >
                <app-icon name="whatsapp" [size]="15" />
                Message on WhatsApp
              </a>
              <a routerLink="/contact" class="btn btn-ghost btn-md w-full border border-ink-300">
                Send a written enquiry
              </a>
            </div>

            <div class="mt-7 border-t border-ink-200 pt-6">
              <p class="text-micro tracking-[0.16em] text-ink-500 uppercase">Terms</p>
              <ul class="mt-3 space-y-2 text-sm text-ink-600">
                <li>Book at least seven days ahead</li>
                <li>Fifty percent advance, balance on the day, cash</li>
                <li>Serving staff included above 200 guests</li>
                <li>Delivery anywhere in Swabi district</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class CateringPage {
  private readonly content = inject(ContentService);
  private readonly seo = inject(SeoService);

  protected readonly brand = BRAND;
  protected readonly guests = signal(140);

  protected readonly whatsappUrl = `https://wa.me/${BRAND.whatsapp.replace('+', '')}?text=${encodeURIComponent(
    'Assalam o Alaikum, I would like a catering quote from Salateen Restaurant.',
  )}`;

  protected readonly packages = toSignal(this.content.cateringPackages(), {
    initialValue: [] as CateringPackage[],
  });

  /** Cheapest package whose minimum the party size clears. */
  protected readonly recommended = computed(() => {
    const eligible = this.packages()
      .filter((p) => this.guests() >= p.minGuests)
      .sort((a, b) => b.minGuests - a.minGuests);
    return eligible[0] ?? this.packages()[0] ?? null;
  });

  protected readonly estimate = computed(() => {
    const pkg = this.recommended();
    return pkg ? pkg.pricePerHead * this.guests() : 0;
  });

  /**
   * Packages arrive asynchronously and are empty during prerender, so this
   * never dereferences a null package.
   */
  protected readonly recommendedName = computed(() => {
    const pkg = this.recommended();
    return pkg ? `${pkg.name} package` : 'Choose a package below';
  });

  protected readonly process = [
    {
      title: 'Confirm the count',
      body: 'Everything scales off the guest count and everything has a lead time. Seven days out, nothing is difficult. The day before, some of it is impossible.',
    },
    {
      title: 'Fix the serving time',
      body: 'Pulao holds for about ninety minutes in a covered degh. BBQ holds for twenty. We build the schedule backwards from the time you give us.',
    },
    {
      title: 'Decide who serves',
      body: 'Above 200 guests we send our own team and chafing dishes. Below that, most families use their own. Either works, decide early.',
    },
  ];

  protected readonly needs: { icon: IconName; title: string; body: string }[] = [
    {
      icon: 'users',
      title: 'A confirmed guest count',
      body: 'Seven days out. We would rather cook for ten more than leave anyone short.',
    },
    {
      icon: 'map',
      title: 'The venue address',
      body: 'With a phone number for someone who will actually be there on the day.',
    },
    {
      icon: 'clock',
      title: 'The serving time',
      body: 'Accurate to the half hour. This matters more than anything else on the order.',
    },
    {
      icon: 'wallet',
      title: 'Fifty percent in advance',
      body: 'Cash, at the restaurant. The balance is settled on the day.',
    },
  ];

  constructor() {
    this.seo.apply({
      title: 'Catering & Walima Packages | Salateen Restaurant Swabi',
      description:
        'Catering from Salateen Restaurant Swabi for walimas, mehndis, aqiqas and corporate lunches. Deghs of Kabuli Pulao, mutton karahi, chapli kabab and a live tandoor, delivered hot anywhere in Swabi district.',
      path: 'catering',
      image: 'assets/images/food/pulao-tray.webp',
      keywords: [
        'catering Swabi',
        'walima catering',
        'mehndi catering Swabi',
        'degh order Swabi',
        'Kabuli Pulao catering',
      ],
    });
    this.seo.breadcrumbSchema([{ label: 'Catering', path: 'catering' }]);
  }

  protected setGuests(value: string): void {
    this.guests.set(Number(value));
  }
}
