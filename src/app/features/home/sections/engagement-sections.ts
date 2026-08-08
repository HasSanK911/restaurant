import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { BRAND, DAY_NAMES, TABLE_ZONES } from '../../../core/constants/app.constants';
import { Offer } from '../../../core/models/content.model';
import { RestaurantProfile } from '../../../core/models/restaurant.model';
import { RestaurantService } from '../../../core/services/restaurant.service';
import { CurrencyPkrPipe } from '../../../shared/pipes/currency-pkr.pipe';
import { Clock12Pipe } from '../../../shared/pipes/format.pipes';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { ParallaxDirective } from '../../../shared/directives/parallax.directive';
import {
  BadgeComponent,
  SectionHeaderComponent,
} from '../../../shared/components/ui/display.components';
import { IconComponent } from '../../../shared/components/ui/icon.component';
import { ImageComponent } from '../../../shared/components/ui/image.component';

/** Current offers rail. */
@Component({
  selector: 'app-offers-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ImageComponent,
    IconComponent,
    BadgeComponent,
    SectionHeaderComponent,
    RevealDirective,
    CurrencyPkrPipe,
  ],
  host: { class: 'block' },
  template: `
    @if (offers().length) {
      <section class="section">
        <div class="container-lux">
          <div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <app-section-header
              appReveal
              align="left"
              eyebrow="Running now"
              title="Offers worth"
              accent=" planning around"
            />
            <a appReveal routerLink="/offers" class="btn btn-secondary btn-md shrink-0">
              All offers
              <app-icon name="arrow-right" [size]="15" />
            </a>
          </div>

          <ul class="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            @for (offer of offers(); track offer.id; let i = $index) {
              <li appReveal [appRevealDelay]="i * 90">
                <a
                  [routerLink]="['/offers', offer.slug]"
                  class="card-lux group flex h-full flex-col overflow-hidden hover:-translate-y-1.5 hover:border-clay-500/35"
                >
                  <span class="relative block aspect-[16/10] overflow-hidden">
                    <app-image
                      [src]="offer.image"
                      [alt]="offer.title"
                      sizes="(max-width: 768px) 92vw, 24rem"
                      class="h-full w-full transition-transform duration-[900ms] group-hover:scale-110"
                    />
                    <span
                      class="absolute inset-0 bg-gradient-to-t from-scrim/35 to-transparent"
                    ></span>
                    <span class="absolute top-3 left-3">
                      <app-badge tone="clay">{{ offer.badge }}</app-badge>
                    </span>
                  </span>
                  <span class="flex flex-1 flex-col p-5">
                    <span class="font-display text-xl text-ink-900 transition-colors group-hover:text-clay-700">{{
                      offer.title
                    }}</span>
                    <span class="mt-1.5 line-clamp-2 text-sm text-ink-600">{{ offer.subtitle }}</span>
                    <span class="mt-auto flex items-end justify-between gap-3 pt-5">
                      @if (offer.offerPrice) {
                        <span class="flex items-baseline gap-2">
                          <span class="font-display text-2xl text-clay-700">{{
                            offer.offerPrice | pkr
                          }}</span>
                          @if (offer.originalPrice) {
                            <span class="text-sm text-ink-500 line-through">{{
                              offer.originalPrice | pkr
                            }}</span>
                          }
                        </span>
                      } @else if (offer.discountPercent) {
                        <span class="font-display text-2xl text-clay-700"
                          >{{ offer.discountPercent }}% off</span
                        >
                      } @else {
                        <span class="text-sm font-semibold text-clay-700">See details</span>
                      }
                      @if (offer.couponCode) {
                        <span
                          class="rounded-lg border border-dashed border-clay-500/40 px-2.5 py-1 font-mono text-caption font-bold tracking-wider text-clay-700"
                          >{{ offer.couponCode }}</span
                        >
                      }
                    </span>
                  </span>
                </a>
              </li>
            }
          </ul>
        </div>
      </section>
    }
  `,
})
export class OffersSection {
  readonly offers = input.required<Offer[]>();
}

/** Reservation call to action, backed by the family-hall photograph. */
@Component({
  selector: 'app-reservation-cta-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ImageComponent, IconComponent, RevealDirective, ParallaxDirective],
  host: { class: 'block' },
  template: `
    <section class="grain-overlay relative isolate overflow-hidden py-28 md:py-36">
      <app-image
        src="assets/images/interior/family-hall-lit"
        alt="The family hall at Salateen Restaurant Swabi, lit for the evening"
        sizes="100vw"
        class="absolute inset-0 h-full w-full"
        [appParallax]="0.09"
      />
      <div class="absolute inset-0 bg-paper/88" aria-hidden="true"></div>

      <div class="container-lux relative text-center">
        <p appReveal class="eyebrow mb-5">Reservations</p>
        <h2 appReveal class="mx-auto max-w-3xl text-4xl leading-[1.05] text-ink-900 sm:text-5xl lg:text-6xl">
          Pick your room,
          <span class="text-gradient-clay italic">we will hold the table</span>
        </h2>
        <p appReveal class="mx-auto mt-6 max-w-xl leading-relaxed text-ink-700">
          Booking is free and takes a minute. Tell us the occasion and we will set the room for it.
        </p>

        <ul appReveal class="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          @for (zone of zones; track zone.value; let i = $index) {
            <li appReveal [appRevealDelay]="i * 80">
              <a
                [routerLink]="['/reservation']"
                [queryParams]="{ zone: zone.value }"
                class="glass group relative block h-full overflow-hidden rounded-xl p-5 text-left transition-all duration-500 hover:-translate-y-1.5 hover:border-clay-500/40"
                [class.pointer-events-none]="zone.comingSoon"
              >
                <span class="flex items-start justify-between gap-2">
                  <span class="font-display text-lg text-ink-900">{{ zone.label }}</span>
                  @if (zone.comingSoon) {
                    <span class="chip border-ink-300 bg-ink-100 text-ink-500">Soon</span>
                  }
                </span>
                <span class="mt-2 block text-xs leading-relaxed text-ink-500">{{
                  zone.description
                }}</span>
                @if (!zone.comingSoon) {
                  <span
                    class="mt-4 flex items-center gap-1.5 text-micro font-bold tracking-[0.14em] text-clay-700 uppercase"
                  >
                    Reserve
                    <app-icon
                      name="arrow-right"
                      [size]="12"
                      class="transition-transform group-hover:translate-x-1"
                    />
                  </span>
                }
              </a>
            </li>
          }
        </ul>

        <div appReveal class="mt-12 flex flex-wrap justify-center gap-3">
          <a routerLink="/reservation" class="btn btn-primary btn-lg">
            Book a Table
            <app-icon name="arrow-right" [size]="17" />
          </a>
          <a [href]="'tel:' + brand.phone" class="btn btn-secondary btn-lg">
            <app-icon name="phone" [size]="16" />
            {{ brand.phoneDisplay }}
          </a>
        </div>
      </div>
    </section>
  `,
})
export class ReservationCtaSection {
  protected readonly zones = TABLE_ZONES;
  protected readonly brand = BRAND;
}

/**
 * Menu-download band.
 *
 * Links to the photograph of the restaurant's real printed menu card, which is
 * the honest artefact to offer until a designed PDF exists.
 */
@Component({
  selector: 'app-menu-download-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ImageComponent, IconComponent, RevealDirective],
  host: { class: 'block' },
  template: `
    <section class="section">
      <div class="container-lux">
        <div
          appReveal
          class="card-lux grid gap-10 overflow-hidden p-8 md:p-12 lg:grid-cols-12 lg:items-center"
        >
          <div class="lg:col-span-7">
            <p class="eyebrow mb-4">The printed card</p>
            <h2 class="text-3xl leading-[1.1] text-ink-900 sm:text-4xl">
              Prices here come
              <span class="text-gradient-clay italic">straight off our menu card</span>
            </h2>
            <p class="mt-5 max-w-lg leading-relaxed text-ink-600">
              Every karahi, handi and kabab price on this site was transcribed from the card that
              sits on our tables. No online surcharge, no service charge, no delivery mark-up on the
              food itself.
            </p>
            <div class="mt-8 flex flex-wrap gap-3">
              <a
                href="assets/images/brand/menu-card.webp"
                target="_blank"
                rel="noopener"
                class="btn btn-primary btn-md"
              >
                <app-icon name="download" [size]="16" />
                View the menu card
              </a>
              <a routerLink="/menu" class="btn btn-secondary btn-md">Browse online</a>
            </div>
          </div>

          <div class="lg:col-span-5">
            <div
              class="mx-auto max-w-xs -rotate-2 overflow-hidden rounded-xl border border-clay-500/20 shadow-lux transition-transform duration-700 hover:rotate-0"
            >
              <app-image
                src="assets/images/brand/menu-card"
                alt="The printed menu card at Salateen Restaurant, showing karahi and handi prices"
                sizes="20rem"
                objectFit="object-contain"
                class="aspect-[3/4] w-full bg-white"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class MenuDownloadSection {}

/** Location, hours and the map. Closes the page. */
@Component({
  selector: 'app-location-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, SectionHeaderComponent, RevealDirective, Clock12Pipe],
  host: { class: 'block' },
  template: `
    <section class="section border-t border-ink-200/60 bg-ink-50/30">
      <div class="container-lux">
        <app-section-header
          appReveal
          eyebrow="Find us"
          title="Jhangira Road,"
          accent=" Mal Lar, Swabi"
          description="Free parking for around thirty cars, plus street parking on the road itself."
        />

        <div class="mt-14 grid gap-6 lg:grid-cols-12">
          <!-- Map -->
          <div appReveal class="lg:col-span-7">
            <div
              class="relative aspect-[16/11] overflow-hidden rounded-2xl border border-ink-200 bg-ink-50"
            >
              @if (mapUrl(); as url) {
                <iframe
                  [src]="url"
                  class="h-full w-full grayscale-[35%] invert-[92%] hue-rotate-180 contrast-[85%]"
                  style="border:0"
                  loading="lazy"
                  referrerpolicy="no-referrer-when-downgrade"
                  title="Map showing Salateen Restaurant on Jhangira Road, Swabi"
                ></iframe>
              }
              <a
                [href]="directionsUrl"
                target="_blank"
                rel="noopener"
                class="glass-strong absolute right-4 bottom-4 flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold tracking-wide text-clay-700 uppercase shadow-lux transition-colors hover:text-clay-700"
              >
                <app-icon name="navigation" [size]="14" />
                Get directions
              </a>
            </div>
          </div>

          <!-- Details -->
          <div appReveal [appRevealDelay]="120" class="space-y-4 lg:col-span-5">
            <div class="card-lux p-6">
              <p class="eyebrow mb-4">Visit</p>
              <address class="space-y-3.5 text-sm not-italic">
                <span class="flex items-start gap-3 text-ink-700">
                  <app-icon name="map" [size]="17" class="mt-0.5 shrink-0 text-clay-600" />
                  <span>{{ brand.street }}<br />{{ brand.city }}, {{ brand.region }}<br />{{ brand.country }}</span>
                </span>
                <a
                  [href]="'tel:' + brand.phone"
                  class="flex items-center gap-3 text-ink-700 transition-colors hover:text-clay-700"
                >
                  <app-icon name="phone" [size]="17" class="shrink-0 text-clay-600" />
                  {{ brand.phoneDisplay }}
                </a>
                <a
                  [href]="'mailto:' + brand.email"
                  class="flex items-center gap-3 text-ink-700 transition-colors hover:text-clay-700"
                >
                  <app-icon name="mail" [size]="17" class="shrink-0 text-clay-600" />
                  {{ brand.email }}
                </a>
              </address>
            </div>

            <div class="card-lux p-6">
              <div class="flex items-center justify-between">
                <p class="eyebrow">Opening hours</p>
                <span
                  class="flex items-center gap-1.5 text-micro font-bold tracking-wide uppercase"
                  [class]="status().isOpen ? 'text-emerald-700' : 'text-amber-700'"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
                  {{ status().isOpen ? 'Open now' : 'Closed' }}
                </span>
              </div>
              <dl class="mt-4 space-y-2 text-sm">
                @for (hour of hours(); track hour.day) {
                  <div
                    class="flex items-center justify-between gap-4"
                    [class]="hour.day === today ? 'font-semibold text-clay-700' : 'text-ink-500'"
                  >
                    <dt>{{ dayNames[hour.day] }}</dt>
                    <dd class="tabular-nums">
                      @if (hour.isClosed) {
                        Closed
                      } @else {
                        {{ hour.opensAt | clock12 }} &ndash; {{ hour.closesAt | clock12 }}
                      }
                    </dd>
                  </div>
                }
              </dl>
            </div>

            <div class="grid grid-cols-2 gap-4">
              @for (amenity of quickAmenities; track amenity.label) {
                <div class="card-lux flex items-center gap-3 p-4">
                  <app-icon [name]="$any(amenity.icon)" [size]="18" class="shrink-0 text-clay-600" />
                  <span class="text-xs font-semibold text-ink-700">{{ amenity.label }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class LocationSection {
  readonly profile = input.required<RestaurantProfile | null>();

  private readonly sanitizer = inject(DomSanitizer);
  private readonly restaurant = inject(RestaurantService);

  protected readonly brand = BRAND;
  protected readonly dayNames = DAY_NAMES;
  protected readonly today = new Date().getDay();
  protected readonly status = this.restaurant.status;
  protected readonly hours = this.restaurant.hours;

  protected readonly directionsUrl = `https://maps.google.com/?q=${encodeURIComponent(
    `${BRAND.fullName}, ${BRAND.street}, ${BRAND.city}`,
  )}`;

  protected readonly quickAmenities = [
    { icon: 'parking', label: 'Free parking' },
    { icon: 'wheelchair', label: 'Step-free access' },
    { icon: 'users', label: 'Family halls' },
    { icon: 'bike', label: 'Home delivery' },
  ];

  /**
   * The embed URL is a fixed OpenStreetMap link built in the seed data, not
   * user input, so bypassing the sanitiser here is safe and necessary for an
   * iframe src.
   */
  protected readonly mapUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.profile()?.mapEmbedUrl;
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });
}
