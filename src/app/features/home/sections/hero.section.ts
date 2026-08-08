import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  PLATFORM_ID,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Banner } from '../../../core/models/content.model';
import { BRAND } from '../../../core/constants/app.constants';
import { RestaurantService } from '../../../core/services/restaurant.service';
import { IconComponent } from '../../../shared/components/ui/icon.component';
import { ImageComponent } from '../../../shared/components/ui/image.component';

/**
 * Full-bleed hero carousel.
 *
 * The first slide's image is marked `priority` and preloaded from index.html,
 * because it is the LCP element on the most-visited page. Auto-advance pauses
 * on hover, on focus, and whenever the tab is hidden.
 */
@Component({
  selector: 'app-hero-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ImageComponent, IconComponent],
  host: { class: 'block' },
  template: `
    <section
      class="grain-overlay relative isolate flex min-h-[92svh] items-center overflow-hidden"
      aria-roledescription="carousel"
      aria-label="Featured at Salateen Restaurant"
      (mouseenter)="paused.set(true)"
      (mouseleave)="paused.set(false)"
      (focusin)="paused.set(true)"
      (focusout)="paused.set(false)"
    >
      <!-- Slides -->
      @for (banner of slides(); track banner.id; let i = $index) {
        <div
          class="absolute inset-0 transition-opacity duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          [class]="i === index() ? 'opacity-100' : 'opacity-0'"
          [attr.aria-hidden]="i !== index()"
        >
          <app-image
            [src]="banner.image"
            [alt]="banner.title"
            [priority]="i === 0"
            sizes="100vw"
            class="h-full w-full"
            [class.animate-[ken-burns_18s_cubic-bezier(0.22,1,0.36,1)_infinite_alternate]]="i === index()"
          />
        </div>
      }

      <!-- Scrims -->
      <div
        class="absolute inset-0 bg-gradient-to-r from-scrim via-scrim/82 to-scrim/35"
        aria-hidden="true"
      ></div>
      <div
        class="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-scrim to-transparent"
        aria-hidden="true"
      ></div>

      <!-- Content -->
      <div class="on-photo container-lux relative grid w-full gap-10 py-28 lg:grid-cols-12 lg:items-end">
        <div class="lg:col-span-7">
          @if (current(); as banner) {
            <div [attr.key]="banner.id" style="animation: fade-up 0.9s cubic-bezier(0.22,1,0.36,1) both">
              <p class="eyebrow mb-5 flex items-center gap-3">
                <span class="h-px w-10 bg-clay-300/70" aria-hidden="true"></span>
                {{ banner.eyebrow }}
              </p>
              <h1
                class="max-w-3xl text-display-lg text-white"
              >
                {{ banner.title }}
              </h1>
              <p class="mt-6 max-w-xl text-base leading-relaxed text-white/80 md:text-lg">
                {{ banner.subtitle }}
              </p>
              <div class="mt-9 flex flex-wrap gap-3">
                <a [routerLink]="banner.ctaLink" class="btn btn-primary btn-lg">
                  {{ banner.ctaLabel }}
                  <app-icon name="arrow-right" [size]="17" />
                </a>
                @if (banner.secondaryCtaLabel) {
                  <a [routerLink]="banner.secondaryCtaLink" class="btn btn-secondary btn-lg">
                    {{ banner.secondaryCtaLabel }}
                  </a>
                }
              </div>
            </div>
          }

          <!-- Trust strip -->
          <dl class="mt-14 flex flex-wrap items-center gap-x-10 gap-y-6">
            <div>
              <dt class="text-micro font-semibold tracking-[0.22em] text-white/60 uppercase">
                Guest rating
              </dt>
              <dd class="mt-1.5 flex items-baseline gap-1.5">
                <span class="font-display text-3xl text-clay-200">{{ rating() }}</span>
                <span class="text-xs text-white/60">/ 5</span>
              </dd>
            </div>
            <div class="h-10 w-px bg-white/25" aria-hidden="true"></div>
            <div>
              <dt class="text-micro font-semibold tracking-[0.22em] text-white/60 uppercase">
                Serving Swabi since
              </dt>
              <dd class="mt-1.5 font-display text-3xl text-white">{{ brand.foundedYear }}</dd>
            </div>
            <div class="h-10 w-px bg-white/25" aria-hidden="true"></div>
            <div>
              <dt class="text-micro font-semibold tracking-[0.22em] text-white/60 uppercase">
                Open every day
              </dt>
              <dd
                class="mt-1.5 flex items-center gap-2 text-sm font-semibold"
                [class]="status().isOpen ? 'text-emerald-300' : 'text-amber-300'"
              >
                <span class="relative flex h-2 w-2">
                  @if (status().isOpen) {
                    <span
                      class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"
                    ></span>
                  }
                  <span class="relative inline-flex h-2 w-2 rounded-full bg-current"></span>
                </span>
                {{ status().label }}
              </dd>
            </div>
          </dl>
        </div>

        <!-- Slide controls -->
        <div class="lg:col-span-5 lg:flex lg:justify-end">
          <div class="flex items-center gap-4">
            <button
              type="button"
              class="glass-dark flex h-11 w-11 items-center justify-center rounded-full text-white/85 transition-colors hover:text-white"
              aria-label="Previous slide"
              (click)="go(index() - 1)"
            >
              <app-icon name="chevron-left" [size]="18" />
            </button>
            <div class="flex gap-2" role="tablist" aria-label="Choose slide">
              @for (banner of slides(); track banner.id; let i = $index) {
                <button
                  type="button"
                  role="tab"
                  [attr.aria-selected]="i === index()"
                  [attr.aria-label]="'Slide ' + (i + 1) + ': ' + banner.title"
                  class="h-1 rounded-full transition-all duration-500"
                  [class]="i === index() ? 'w-10 bg-clay-400' : 'w-4 bg-white/35 hover:bg-white/60'"
                  (click)="go(i)"
                ></button>
              }
            </div>
            <button
              type="button"
              class="glass-dark flex h-11 w-11 items-center justify-center rounded-full text-white/85 transition-colors hover:text-white"
              aria-label="Next slide"
              (click)="go(index() + 1)"
            >
              <app-icon name="chevron-right" [size]="18" />
            </button>
          </div>
        </div>
      </div>

      <!-- Scroll cue -->
      <a
        href="#todays-specials"
        class="absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-white/60 transition-colors hover:text-white md:flex"
        aria-label="Scroll to today's specials"
      >
        <span class="text-micro font-semibold tracking-[0.28em] uppercase">Scroll</span>
        <span class="h-10 w-px bg-gradient-to-b from-clay-300/80 to-transparent"></span>
      </a>
    </section>
  `,
})
export class HeroSection implements OnDestroy {
  readonly banners = input.required<Banner[]>();

  private readonly restaurant = inject(RestaurantService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly brand = BRAND;
  protected readonly status = this.restaurant.status;
  protected readonly rating = computed(() => (this.restaurant.profile()?.rating ?? 4.4).toFixed(1));

  protected readonly index = signal(0);
  protected readonly paused = signal(false);

  /** Falls back to a single built-in slide if the API has not answered yet. */
  protected readonly slides = computed(() => (this.banners().length ? this.banners() : [FALLBACK]));
  protected readonly current = computed(() => this.slides()[this.index()] ?? this.slides()[0]);

  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    if (this.isBrowser) {
      this.timer = setInterval(() => {
        if (this.paused() || document.hidden) return;
        this.go(this.index() + 1);
      }, 7000);
    }
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  protected go(next: number): void {
    const total = this.slides().length;
    this.index.set(((next % total) + total) % total);
  }
}

const FALLBACK: Banner = {
  id: 'fallback',
  eyebrow: 'Since 2011 on Jhangira Road',
  title: 'Charcoal, Copper & Kabuli Rice',
  subtitle:
    'Swabi’s table for hand-turned BBQ, Chapli Kabab pressed to order and a platter built to feed ten.',
  image: 'assets/images/bbq/wood-fire',
  ctaLabel: 'Explore the Menu',
  ctaLink: '/menu',
  secondaryCtaLabel: 'Book a Table',
  secondaryCtaLink: '/reservation',
  sortOrder: 1,
  isActive: true,
  createdAt: '',
};
