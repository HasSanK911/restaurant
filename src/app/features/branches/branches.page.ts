import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { BRAND } from '../../core/constants/app.constants';
import { Branch } from '../../core/models/content.model';
import { ContentService } from '../../core/services/content.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { SeoService } from '../../core/services/seo.service';
import { PageHeroComponent } from '../../shared/components/ui/page-hero.component';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { ImageComponent } from '../../shared/components/ui/image.component';
import { BadgeComponent } from '../../shared/components/ui/display.components';
import { SkeletonCardComponent } from '../../shared/components/ui/feedback.components';
import { RevealDirective } from '../../shared/directives/reveal.directive';

/**
 * Branch directory.
 *
 * One trading location today and two planned, so the page is honest about
 * that: the flagship is fully detailed and the others are clearly marked
 * coming soon rather than dressed up as open.
 */
@Component({
  selector: 'app-branches-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageHeroComponent,
    ImageComponent,
    IconComponent,
    BadgeComponent,
    SkeletonCardComponent,
    RevealDirective,
  ],
  template: `
    <app-page-hero
      eyebrow="Branches"
      title="One kitchen today,"
      accent=" three planned"
      description="The flagship is on Jhangira Road in Swabi. Mardan and Topi follow when the kitchens are ready, not before."
      image="assets/images/exterior/night-parking"
      imageAlt="The car park at Salateen Restaurant after dark"
      [crumbs]="[{ label: 'Branches' }]"
      size="sm"
    />

    <section class="section pt-14">
      <div class="container-lux">
        @if (!branches().length) {
          <div class="grid gap-6 lg:grid-cols-3">
            @for (n of [1, 2, 3]; track n) {
              <app-skeleton-card />
            }
          </div>
        } @else {
          <!-- Flagship -->
          @if (flagship(); as branch) {
            <article appReveal class="card-lux grid overflow-hidden lg:grid-cols-2">
              <div class="relative min-h-64 lg:min-h-[28rem]">
                <app-image
                  [src]="branch.image"
                  [alt]="branch.name"
                  [priority]="true"
                  sizes="(max-width: 1024px) 100vw, 42rem"
                  class="absolute inset-0 h-full w-full"
                />
                <span class="absolute top-4 left-4">
                  <app-badge tone="emerald" [dot]="true">Open now</app-badge>
                </span>
              </div>

              <div class="p-8 lg:p-12">
                <p class="eyebrow mb-3">Flagship</p>
                <h2 class="text-3xl leading-tight sm:text-4xl">{{ branch.name }}</h2>

                <address class="mt-6 space-y-3.5 text-sm not-italic">
                  <span class="flex items-start gap-3 text-ink-700">
                    <app-icon name="map" [size]="17" class="mt-0.5 shrink-0 text-clay-600" />
                    {{ branch.address }}
                  </span>
                  <a
                    [href]="'tel:' + brand.phone"
                    class="flex items-center gap-3 text-ink-700 transition-colors hover:text-clay-700"
                  >
                    <app-icon name="phone" [size]="17" class="shrink-0 text-clay-600" />
                    {{ branch.phone }}
                  </a>
                  <span class="flex items-center gap-3 text-ink-700">
                    <app-icon name="clock" [size]="17" class="shrink-0 text-clay-600" />
                    Every day, {{ openLabel() }}
                  </span>
                </address>

                <ul class="mt-6 flex flex-wrap gap-2">
                  @for (feature of flagshipFeatures; track feature) {
                    <li class="chip border-ink-300 text-ink-600">{{ feature }}</li>
                  }
                </ul>

                <div class="mt-8 flex flex-wrap gap-3">
                  <a routerLink="/reservation" class="btn btn-primary btn-md">Book a table</a>
                  <a routerLink="/menu" class="btn btn-secondary btn-md">See the menu</a>
                  <a
                    [href]="branch.mapUrl"
                    target="_blank"
                    rel="noopener"
                    class="btn btn-ghost btn-md border border-ink-300"
                  >
                    <app-icon name="navigation" [size]="14" />
                    Directions
                  </a>
                </div>
              </div>
            </article>
          }

          <!-- Coming soon -->
          @if (comingSoon().length) {
            <section class="mt-16">
              <h2 class="font-display text-2xl">On the way</h2>
              <div class="rule-clay mt-3 w-20"></div>
              <p class="mt-4 max-w-2xl text-sm leading-relaxed text-ink-600">
                We open a branch when we have a head chef we trust and a supplier we have worked
                with. Both take longer than a lease does, which is why these dates move.
              </p>

              <ul class="mt-10 grid gap-6 md:grid-cols-2">
                @for (branch of comingSoon(); track branch.id; let i = $index) {
                  <li appReveal [appRevealDelay]="i * 90">
                    <article class="card-lux flex h-full flex-col overflow-hidden">
                      <div class="relative aspect-[16/9] overflow-hidden">
                        <app-image
                          [src]="branch.image"
                          [alt]="branch.name"
                          sizes="(max-width: 768px) 92vw, 30rem"
                          class="h-full w-full opacity-70 grayscale"
                        />
                        <div class="absolute inset-0 bg-scrim/35"></div>
                        <span class="absolute top-4 left-4">
                          <app-badge tone="amber">Coming {{ branch.openingDate }}</app-badge>
                        </span>
                      </div>
                      <div class="flex flex-1 flex-col p-6">
                        <h3 class="font-display text-2xl">{{ branch.name }}</h3>
                        <p class="mt-2 flex items-start gap-2.5 text-sm text-ink-600">
                          <app-icon name="map" [size]="15" class="mt-0.5 shrink-0 text-clay-600" />
                          {{ branch.address }}
                        </p>
                        <p class="mt-4 text-sm leading-relaxed text-ink-500">
                          Not open yet. Orders and bookings for {{ branch.city }} are handled by the
                          Swabi kitchen in the meantime.
                        </p>
                        <a
                          [href]="'tel:' + brand.phone"
                          class="btn btn-secondary btn-md mt-auto pt-0 self-start"
                        >
                          <app-icon name="phone" [size]="14" />
                          Ask about {{ branch.city }}
                        </a>
                      </div>
                    </article>
                  </li>
                }
              </ul>
            </section>
          }
        }

        <!-- Delivery coverage -->
        <section class="mt-20 border-t border-ink-200 pt-14">
          <h2 class="font-display text-2xl">Where we deliver from Swabi</h2>
          <div class="rule-clay mt-3 w-20"></div>
          <p class="mt-4 max-w-2xl text-sm leading-relaxed text-ink-600">
            Until Mardan and Topi open, the Swabi kitchen delivers across the district. Charges and
            timings appear at checkout once you pick your area.
          </p>
          <ul class="mt-8 flex flex-wrap gap-2">
            @for (area of deliveryAreas; track area) {
              <li class="chip border-clay-600/30 bg-clay-50 text-clay-700">{{ area }}</li>
            }
          </ul>
          <a routerLink="/menu" class="btn btn-primary btn-md mt-8">
            Start an order
            <app-icon name="arrow-right" [size]="15" />
          </a>
        </section>
      </div>
    </section>
  `,
})
export class BranchesPage {
  private readonly content = inject(ContentService);
  private readonly restaurant = inject(RestaurantService);
  private readonly seo = inject(SeoService);

  protected readonly brand = BRAND;

  protected readonly flagshipFeatures = [
    'Three halls',
    'Family hall with full purdah',
    'Outdoor lawn',
    'Free parking',
    'Step-free access',
    'Home delivery',
  ];

  protected readonly deliveryAreas = [
    'Swabi City',
    'Mal Lar',
    'Jhangira Road',
    'Yar Hussain',
    'Topi',
    'Kalu Khan',
    'Panjpir',
    'Marghuz',
    'Zaida',
    'Shewa Adda',
  ];

  protected readonly branches = computed(() => this.content.branches());
  protected readonly flagship = computed(() => this.branches().find((b) => b.status === 'open'));
  protected readonly comingSoon = computed(() =>
    this.branches().filter((b) => b.status === 'coming-soon'),
  );

  protected readonly openLabel = computed(() => {
    const today = this.restaurant.hours().find((h) => h.day === new Date().getDay());
    if (!today || today.isClosed) return '10:00 AM to 12:00 AM';
    return `${to12(today.opensAt)} to ${to12(today.closesAt)}`;
  });

  constructor() {
    this.seo.apply({
      title: 'Branches & Locations | Salateen Restaurant',
      description:
        'Salateen Restaurant is on Jhangira Road, Mal Lar, Swabi, with branches planned for Mardan and Topi. Home delivery across Swabi district from the flagship kitchen.',
      path: 'branches',
      image: 'assets/images/exterior/night-parking.webp',
      keywords: ['Salateen branches', 'Salateen Mardan', 'Salateen Topi', 'Swabi restaurant location'],
    });
    this.seo.breadcrumbSchema([{ label: 'Branches', path: 'branches' }]);
  }
}

function to12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}
