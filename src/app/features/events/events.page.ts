import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { BRAND } from '../../core/constants/app.constants';
import { EventListing } from '../../core/models/content.model';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { CurrencyPkrPipe } from '../../shared/pipes/currency-pkr.pipe';
import { NiceDatePipe } from '../../shared/pipes/format.pipes';
import { PageHeroComponent } from '../../shared/components/ui/page-hero.component';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { ImageComponent } from '../../shared/components/ui/image.component';
import { BadgeComponent } from '../../shared/components/ui/display.components';
import { EmptyStateComponent, SkeletonCardComponent } from '../../shared/components/ui/feedback.components';
import { RevealDirective } from '../../shared/directives/reveal.directive';

@Component({
  selector: 'app-events-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageHeroComponent,
    ImageComponent,
    IconComponent,
    BadgeComponent,
    EmptyStateComponent,
    SkeletonCardComponent,
    RevealDirective,
    CurrencyPkrPipe,
    NiceDatePipe,
  ],
  template: `
    <app-page-hero
      eyebrow="Events"
      title="Nights worth"
      accent=" turning up for"
      description="Charcoal nights, the Eid buffet, winter fish season and a twelve-seat chef's table at the pass."
      image="assets/images/exterior/night-terrace"
      imageAlt="Marquee seating on a winter night at Salateen Restaurant"
      [crumbs]="[{ label: 'Events' }]"
      size="md"
    />

    <section class="section pt-14">
      <div class="container-lux">
        @if (!events().length) {
          <div class="grid gap-6 md:grid-cols-2">
            @for (n of [1, 2, 3, 4]; track n) {
              <app-skeleton-card />
            }
          </div>
        } @else {
          <!-- Upcoming -->
          @if (upcoming().length) {
            <h2 class="font-display text-2xl">Coming up</h2>
            <div class="rule-clay mt-3 w-20"></div>

            <ul class="mt-10 grid gap-6 lg:grid-cols-2">
              @for (event of upcoming(); track event.id; let i = $index) {
                <li appReveal [appRevealDelay]="i * 80">
                  <article class="card-lux group flex h-full flex-col overflow-hidden hover:-translate-y-1.5">
                    <div class="relative aspect-[16/9] overflow-hidden">
                      <app-image
                        [src]="event.image"
                        [alt]="event.title"
                        sizes="(max-width: 1024px) 92vw, 34rem"
                        class="h-full w-full transition-transform duration-[900ms] group-hover:scale-105"
                      />
                      <div class="absolute inset-0 bg-gradient-to-t from-scrim/85 to-transparent"></div>
                      <div class="on-photo absolute inset-x-5 bottom-4 flex items-end justify-between gap-3">
                        <div>
                          <p class="eyebrow">{{ event.venue }}</p>
                          <p class="mt-1 font-display text-2xl text-white">{{ event.title }}</p>
                        </div>
                        <span
                          class="glass-dark shrink-0 rounded-xl px-3 py-2 text-center text-white"
                        >
                          <span class="block font-display text-xl leading-none">{{
                            dayOf(event.startsAt)
                          }}</span>
                          <span class="mt-0.5 block text-micro uppercase">{{
                            monthOf(event.startsAt)
                          }}</span>
                        </span>
                      </div>
                    </div>

                    <div class="flex flex-1 flex-col p-6">
                      <p class="text-sm leading-relaxed text-ink-600">{{ event.description }}</p>

                      <ul class="mt-5 flex flex-wrap gap-2">
                        @for (highlight of event.highlights; track highlight) {
                          <li class="chip border-ink-300 text-ink-600">{{ highlight }}</li>
                        }
                      </ul>

                      <dl class="mt-6 grid grid-cols-3 gap-4 border-t border-ink-200 pt-5">
                        <div>
                          <dt class="text-caption text-ink-500">When</dt>
                          <dd class="mt-1 text-sm font-semibold text-ink-900">
                            {{ event.startsAt | niceDate }}
                          </dd>
                        </div>
                        <div>
                          <dt class="text-caption text-ink-500">Capacity</dt>
                          <dd class="mt-1 text-sm font-semibold text-ink-900">
                            {{ event.capacity }} guests
                          </dd>
                        </div>
                        <div>
                          <dt class="text-caption text-ink-500">Per head</dt>
                          <dd class="mt-1 text-sm font-semibold text-clay-700">
                            {{ event.pricePerHead ? (event.pricePerHead | pkr) : 'A la carte' }}
                          </dd>
                        </div>
                      </dl>

                      <div class="mt-6 flex flex-wrap gap-3">
                        <a
                          routerLink="/reservation"
                          [queryParams]="{ occasion: 'other' }"
                          class="btn btn-primary btn-md"
                        >
                          Reserve a place
                          <app-icon name="arrow-right" [size]="15" />
                        </a>
                        <a [href]="'tel:' + brand.phone" class="btn btn-secondary btn-md">
                          <app-icon name="phone" [size]="14" />
                          Ask about it
                        </a>
                      </div>
                    </div>
                  </article>
                </li>
              }
            </ul>
          }

          <!-- Past -->
          @if (past().length) {
            <section class="mt-20 border-t border-ink-200 pt-14">
              <h2 class="font-display text-2xl">Recently held</h2>
              <div class="rule-clay mt-3 w-20"></div>
              <ul class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                @for (event of past(); track event.id) {
                  <li>
                    <article class="card-lux flex h-full gap-4 p-4 opacity-80">
                      <span class="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-ink-200">
                        <app-image [src]="event.image" [alt]="event.title" sizes="80px" class="h-full w-full" />
                      </span>
                      <span class="min-w-0">
                        <app-badge tone="ink">Finished</app-badge>
                        <span class="mt-2 block font-display text-lg">{{ event.title }}</span>
                        <span class="mt-0.5 block text-caption text-ink-500">{{
                          event.startsAt | niceDate
                        }}</span>
                      </span>
                    </article>
                  </li>
                }
              </ul>
            </section>
          }

          @if (!events().length) {
            <app-empty-state
              icon="calendar"
              title="Nothing scheduled right now"
              message="Follow us or call the restaurant to hear about the next one."
            />
          }
        }

        <!-- Private hire -->
        <section class="mt-20">
          <div class="card-lux grid overflow-hidden lg:grid-cols-2">
            <div class="relative min-h-56">
              <app-image
                src="assets/images/interior/banquet-hall"
                alt="The banquet layout at Salateen Restaurant, set for forty"
                sizes="(max-width: 1024px) 100vw, 42rem"
                class="absolute inset-0 h-full w-full"
              />
            </div>
            <div class="p-8 lg:p-12">
              <p class="eyebrow mb-3">Private hire</p>
              <h2 class="text-3xl leading-tight">Take the whole family hall</h2>
              <p class="mt-4 leading-relaxed text-ink-600">
                Forty guests behind full-height partitions, with a dedicated attendant, your own
                service order and the lighting set how you want it. Common for walimas, mehndis,
                aqiqas and graduation parties.
              </p>
              <ul class="mt-6 space-y-2.5">
                @for (point of privateHire; track point) {
                  <li class="flex items-start gap-2.5 text-sm text-ink-600">
                    <app-icon name="check" [size]="14" class="mt-0.5 shrink-0 text-clay-600" [strokeWidth]="2.4" />
                    {{ point }}
                  </li>
                }
              </ul>
              <div class="mt-8 flex flex-wrap gap-3">
                <a [href]="'tel:' + brand.phone" class="btn btn-primary btn-md">
                  <app-icon name="phone" [size]="15" />
                  {{ brand.phoneDisplay }}
                </a>
                <a routerLink="/catering" class="btn btn-secondary btn-md">Catering packages</a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  `,
})
export class EventsPage {
  private readonly content = inject(ContentService);
  private readonly seo = inject(SeoService);

  protected readonly brand = BRAND;
  protected readonly privateHire = [
    'No hire fee, no minimum spend beyond the food',
    'Full purdah screening throughout',
    'Cake stand and candles provided at no charge',
    'Call at least three days ahead for the whole hall',
  ];

  protected readonly events = toSignal(this.content.events(), {
    initialValue: [] as EventListing[],
  });

  protected readonly upcoming = computed(() =>
    this.events()
      .filter((e) => new Date(e.endsAt).getTime() >= Date.now())
      .sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1)),
  );

  protected readonly past = computed(() =>
    this.events()
      .filter((e) => new Date(e.endsAt).getTime() < Date.now())
      .sort((a, b) => (a.startsAt > b.startsAt ? -1 : 1)),
  );

  constructor() {
    this.seo.apply({
      title: 'Events at Salateen Restaurant Swabi | Charcoal Nights & Eid Buffet',
      description:
        'Friday Charcoal Night, the Eid family buffet, winter river fish season and a twelve-seat chef’s table. Events and private hire at Salateen Restaurant, Jhangira Road, Swabi.',
      path: 'events',
      image: 'assets/images/exterior/night-terrace.webp',
      keywords: ['Swabi restaurant events', 'Eid buffet Swabi', 'BBQ night', 'private hire Swabi'],
    });
    this.seo.breadcrumbSchema([{ label: 'Events', path: 'events' }]);
  }

  protected dayOf(iso: string): string {
    return new Date(iso).getDate().toString();
  }

  protected monthOf(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', { month: 'short' });
  }
}
