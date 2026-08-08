import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Coupon } from '../../core/models/order.model';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { CurrencyPkrPipe } from '../../shared/pipes/currency-pkr.pipe';
import { NiceDatePipe } from '../../shared/pipes/format.pipes';
import { PageHeroComponent } from '../../shared/components/ui/page-hero.component';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { ImageComponent } from '../../shared/components/ui/image.component';
import { BadgeComponent, SectionHeaderComponent } from '../../shared/components/ui/display.components';
import { EmptyStateComponent, SkeletonCardComponent } from '../../shared/components/ui/feedback.components';
import { RevealDirective } from '../../shared/directives/reveal.directive';

@Component({
  selector: 'app-offers-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageHeroComponent,
    ImageComponent,
    IconComponent,
    BadgeComponent,
    SectionHeaderComponent,
    EmptyStateComponent,
    SkeletonCardComponent,
    RevealDirective,
    CurrencyPkrPipe,
    NiceDatePipe,
  ],
  template: `
    <app-page-hero
      eyebrow="Offers"
      title="Deals worth"
      accent=" planning around"
      description="Family Friday, BBQ Night, free delivery above Rs 2,500 and a student lunch that is a genuine meal."
      image="assets/images/food/grand-platter"
      imageAlt="The Grand Platter at Salateen Restaurant"
      [crumbs]="[{ label: 'Offers' }]"
      size="md"
    />

    <section class="section pt-14">
      <div class="container-lux">
        @if (!offers().length) {
          <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            @for (n of [1, 2, 3]; track n) {
              <app-skeleton-card />
            }
          </div>
        } @else {
          <!-- Featured -->
          @if (featured(); as hero) {
            <article
              appReveal
              class="card-lux grid overflow-hidden lg:grid-cols-2"
            >
              <div class="relative min-h-64 lg:min-h-[26rem]">
                <app-image
                  [src]="hero.image"
                  [alt]="hero.title"
                  [priority]="true"
                  sizes="(max-width: 1024px) 100vw, 42rem"
                  class="absolute inset-0 h-full w-full"
                />
                <span class="absolute top-4 left-4">
                  <app-badge tone="clay">{{ hero.badge }}</app-badge>
                </span>
              </div>
              <div class="flex flex-col justify-center p-8 lg:p-12">
                <p class="eyebrow mb-3">Featured offer</p>
                <h2 class="text-3xl leading-tight sm:text-4xl">{{ hero.title }}</h2>
                <p class="mt-3 text-lg text-ink-600">{{ hero.subtitle }}</p>
                <p class="mt-4 leading-relaxed text-ink-600">{{ hero.description }}</p>

                <div class="mt-7 flex flex-wrap items-end gap-5">
                  @if (hero.offerPrice) {
                    <div>
                      <p class="text-micro tracking-[0.18em] text-ink-500 uppercase">Offer price</p>
                      <p class="mt-1 flex items-baseline gap-3">
                        <span class="font-display text-4xl text-clay-700">{{ hero.offerPrice | pkr }}</span>
                        @if (hero.originalPrice) {
                          <span class="text-lg text-ink-500 line-through">{{
                            hero.originalPrice | pkr
                          }}</span>
                        }
                      </p>
                    </div>
                  }
                  @if (hero.couponCode) {
                    <button
                      type="button"
                      class="flex items-center gap-2 rounded-xl border border-dashed border-clay-600/50 bg-clay-50 px-4 py-3 font-mono text-sm font-bold tracking-wider text-clay-700 transition-colors hover:bg-clay-100"
                      (click)="copyCode(hero.couponCode!)"
                    >
                      {{ hero.couponCode }}
                      <app-icon name="copy" [size]="14" />
                    </button>
                  }
                </div>

                <div class="mt-8 flex flex-wrap gap-3">
                  <a [routerLink]="['/offers', hero.slug]" class="btn btn-primary btn-md">
                    Offer details
                    <app-icon name="arrow-right" [size]="15" />
                  </a>
                  <a routerLink="/menu" class="btn btn-secondary btn-md">Start an order</a>
                </div>
              </div>
            </article>
          }

          <!-- Grid -->
          <ul class="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            @for (offer of rest(); track offer.id; let i = $index) {
              <li appReveal [appRevealDelay]="i * 70">
                <article class="card-lux group flex h-full flex-col overflow-hidden hover:-translate-y-1.5">
                  <a
                    [routerLink]="['/offers', offer.slug]"
                    class="relative block aspect-[16/10] overflow-hidden"
                  >
                    <app-image
                      [src]="offer.image"
                      [alt]="offer.title"
                      sizes="(max-width: 768px) 92vw, 24rem"
                      class="h-full w-full transition-transform duration-[900ms] group-hover:scale-110"
                    />
                    <span class="absolute top-3 left-3">
                      <app-badge tone="clay">{{ offer.badge }}</app-badge>
                    </span>
                  </a>
                  <div class="flex flex-1 flex-col p-6">
                    <h3 class="font-display text-xl">
                      <a
                        [routerLink]="['/offers', offer.slug]"
                        class="transition-colors hover:text-clay-700"
                        >{{ offer.title }}</a
                      >
                    </h3>
                    <p class="mt-2 text-sm leading-relaxed text-ink-600">{{ offer.subtitle }}</p>

                    <div class="mt-4 flex flex-wrap items-center gap-3">
                      @if (offer.offerPrice) {
                        <span class="font-display text-2xl text-clay-700">{{
                          offer.offerPrice | pkr
                        }}</span>
                        @if (offer.originalPrice) {
                          <span class="text-sm text-ink-500 line-through">{{
                            offer.originalPrice | pkr
                          }}</span>
                        }
                      } @else if (offer.discountPercent) {
                        <span class="font-display text-2xl text-clay-700"
                          >{{ offer.discountPercent }}% off</span
                        >
                      }
                    </div>

                    <div class="mt-auto flex items-center justify-between gap-3 pt-5">
                      @if (offer.couponCode) {
                        <button
                          type="button"
                          class="flex items-center gap-1.5 rounded-lg border border-dashed border-clay-600/45 px-2.5 py-1.5 font-mono text-caption font-bold tracking-wider text-clay-700 transition-colors hover:bg-clay-50"
                          [attr.aria-label]="'Copy coupon code ' + offer.couponCode"
                          (click)="copyCode(offer.couponCode!)"
                        >
                          {{ offer.couponCode }}
                          <app-icon name="copy" [size]="12" />
                        </button>
                      } @else {
                        <span class="text-caption text-ink-500">No code needed</span>
                      }
                      <span class="text-caption text-ink-500"
                        >Ends {{ offer.endsAt | niceDate }}</span
                      >
                    </div>
                  </div>
                </article>
              </li>
            }
          </ul>
        }

        <!-- Live coupon codes -->
        @if (coupons().length) {
          <section class="mt-20 border-t border-ink-200 pt-16">
            <app-section-header
              appReveal
              align="left"
              eyebrow="Codes"
              title="Working coupon"
              accent=" codes"
              description="Enter any of these at checkout. Terms shown against each one."
            />
            <ul class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              @for (coupon of coupons(); track coupon.id; let i = $index) {
                <li appReveal [appRevealDelay]="i * 60">
                  <div class="card-lux flex h-full flex-col p-5">
                    <div class="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        class="rounded-lg border border-dashed border-clay-600/50 bg-clay-50 px-3 py-1.5 font-mono text-sm font-bold tracking-wider text-clay-700"
                        [attr.aria-label]="'Copy ' + coupon.code"
                        (click)="copyCode(coupon.code)"
                      >
                        {{ coupon.code }}
                      </button>
                      <app-badge tone="ink">{{ discountLabel(coupon) }}</app-badge>
                    </div>
                    <p class="mt-3.5 text-sm font-semibold text-ink-900">{{ coupon.title }}</p>
                    <p class="mt-1.5 text-caption text-ink-500">
                      Minimum order {{ coupon.minimumOrder | pkr }}
                      @if (coupon.maxDiscount) {
                        &middot; up to {{ coupon.maxDiscount | pkr }}
                      }
                    </p>
                    <p class="mt-auto pt-4 text-caption text-ink-500">
                      Expires {{ coupon.expiresAt | niceDate }}
                    </p>
                  </div>
                </li>
              }
            </ul>
          </section>
        }

        @if (offers().length === 0 && loaded()) {
          <app-empty-state
            icon="tag"
            title="No offers running right now"
            message="Check back soon, or follow us for the next one."
          />
        }
      </div>
    </section>
  `,
})
export class OffersPage {
  private readonly content = inject(ContentService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  protected readonly offers = computed(() => this.content.offers());
  protected readonly loaded = computed(() => this.content.offers().length >= 0);

  protected readonly featured = computed(
    () => this.offers().find((o) => o.isFeatured) ?? this.offers()[0],
  );
  protected readonly rest = computed(() => {
    const hero = this.featured();
    return this.offers().filter((o) => o.id !== hero?.id);
  });

  protected readonly coupons = toSignal(this.content.coupons(), { initialValue: [] as Coupon[] });

  constructor() {
    this.seo.apply({
      title: 'Offers & Deals | Salateen Restaurant Swabi',
      description:
        'Current offers at Salateen Restaurant Swabi: Family Friday Platter, BBQ Night with 20% off the coals, free home delivery above Rs 2,500, and a student lunch deal.',
      path: 'offers',
      image: 'assets/images/food/grand-platter.webp',
      keywords: ['Salateen offers', 'restaurant deals Swabi', 'free delivery Swabi', 'BBQ discount'],
    });
    this.seo.breadcrumbSchema([{ label: 'Offers', path: 'offers' }]);
  }

  protected discountLabel(coupon: Coupon): string {
    if (coupon.type === 'percentage') return `${coupon.value}% off`;
    if (coupon.type === 'fixed') return `Rs ${coupon.value} off`;
    return 'Free delivery';
  }

  protected copyCode(code: string): void {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      this.toast.info(`Coupon code: ${code}`);
      return;
    }
    navigator.clipboard.writeText(code).then(
      () => this.toast.success('Code copied', `Paste ${code} at checkout.`),
      () => this.toast.info(`Coupon code: ${code}`),
    );
  }
}
