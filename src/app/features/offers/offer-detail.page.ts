import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap } from 'rxjs';
import { Offer } from '../../core/models/content.model';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { CurrencyPkrPipe } from '../../shared/pipes/currency-pkr.pipe';
import { NiceDatePipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { ImageComponent } from '../../shared/components/ui/image.component';
import { BadgeComponent, BreadcrumbsComponent } from '../../shared/components/ui/display.components';
import { EmptyStateComponent, SkeletonComponent } from '../../shared/components/ui/feedback.components';

@Component({
  selector: 'app-offer-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ImageComponent,
    IconComponent,
    BadgeComponent,
    BreadcrumbsComponent,
    EmptyStateComponent,
    SkeletonComponent,
    CurrencyPkrPipe,
    NiceDatePipe,
  ],
  template: `
    @if (offer(); as o) {
      <article>
        <!-- Hero -->
        <header class="grain-overlay relative isolate min-h-[52vh] overflow-hidden pt-[calc(var(--header-h)+3rem)]">
          <app-image
            [src]="o.image"
            [alt]="o.title"
            [priority]="true"
            sizes="100vw"
            class="absolute inset-0 h-full w-full"
          />
          <div class="absolute inset-0 bg-gradient-to-b from-scrim/78 via-scrim/72 to-scrim"></div>
          <div class="on-photo container-lux relative flex h-full flex-col justify-end pb-14">
            <app-breadcrumbs
              [crumbs]="[{ label: 'Offers', path: '/offers' }, { label: o.title }]"
              class="mb-5"
            />
            <app-badge tone="clay">{{ o.badge }}</app-badge>
            <h1 class="mt-4 max-w-3xl text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
              {{ o.title }}
            </h1>
            <p class="mt-4 max-w-2xl text-lg text-white/80">{{ o.subtitle }}</p>
          </div>
        </header>

        <section class="section pt-14">
          <div class="container-lux grid gap-10 lg:grid-cols-12">
            <div class="lg:col-span-7">
              <p class="text-lg leading-relaxed text-ink-700">{{ o.description }}</p>

              <h2 class="mt-10 font-display text-2xl">The small print</h2>
              <ul class="mt-4 space-y-3">
                @for (term of o.terms; track term) {
                  <li class="flex items-start gap-3 text-sm leading-relaxed text-ink-600">
                    <app-icon
                      name="check"
                      [size]="15"
                      class="mt-0.5 shrink-0 text-clay-600"
                      [strokeWidth]="2.4"
                    />
                    {{ term }}
                  </li>
                }
              </ul>

              <div class="mt-10 rounded-2xl border border-clay-600/25 bg-clay-50 p-6">
                <p class="flex items-center gap-2 text-sm font-semibold text-clay-800">
                  <app-icon name="wallet" [size]="16" />
                  Cash only, as always
                </p>
                <p class="mt-2 text-sm leading-relaxed text-ink-600">
                  This offer applies to cash on delivery and cash at the counter. There is no online
                  payment step and we never ask for card details.
                </p>
              </div>
            </div>

            <!-- Claim panel -->
            <aside class="lg:col-span-5">
              <div class="panel sticky top-[calc(var(--header-h)+1.5rem)] p-6">
                @if (o.offerPrice) {
                  <p class="text-micro tracking-[0.18em] text-ink-500 uppercase">Offer price</p>
                  <p class="mt-1.5 flex items-baseline gap-3">
                    <span class="font-display text-4xl text-clay-700">{{ o.offerPrice | pkr }}</span>
                    @if (o.originalPrice) {
                      <span class="text-lg text-ink-500 line-through">{{ o.originalPrice | pkr }}</span>
                    }
                  </p>
                  @if (savings(); as saved) {
                    <p class="mt-1.5 text-sm font-semibold text-emerald-700">
                      You save {{ saved | pkr }}
                    </p>
                  }
                } @else if (o.discountPercent) {
                  <p class="text-micro tracking-[0.18em] text-ink-500 uppercase">Discount</p>
                  <p class="mt-1.5 font-display text-4xl text-clay-700">{{ o.discountPercent }}% off</p>
                }

                @if (o.couponCode) {
                  <div class="mt-6">
                    <p class="field-label">Use this code at checkout</p>
                    <button
                      type="button"
                      class="flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-clay-600/50 bg-clay-50 px-4 py-3.5 transition-colors hover:bg-clay-100"
                      [attr.aria-label]="'Copy coupon code ' + o.couponCode"
                      (click)="copyCode(o.couponCode!)"
                    >
                      <span class="font-mono text-lg font-bold tracking-wider text-clay-700">{{
                        o.couponCode
                      }}</span>
                      <span class="flex items-center gap-1.5 text-caption font-semibold text-clay-600">
                        <app-icon name="copy" [size]="14" />
                        Copy
                      </span>
                    </button>
                  </div>
                }

                <dl class="mt-6 space-y-2.5 border-t border-ink-200 pt-5 text-sm">
                  <div class="flex justify-between gap-3">
                    <dt class="text-ink-500">Runs until</dt>
                    <dd class="font-semibold text-ink-900">{{ o.endsAt | niceDate }}</dd>
                  </div>
                  <div class="flex justify-between gap-3">
                    <dt class="text-ink-500">Status</dt>
                    <dd>
                      <app-badge [tone]="expired() ? 'red' : 'emerald'" [dot]="true">{{
                        expired() ? 'Ended' : 'Running now'
                      }}</app-badge>
                    </dd>
                  </div>
                </dl>

                <div class="mt-6 space-y-2.5">
                  <a routerLink="/menu" class="btn btn-primary btn-md w-full">
                    Start an order
                    <app-icon name="arrow-right" [size]="15" />
                  </a>
                  <a routerLink="/reservation" class="btn btn-secondary btn-md w-full"
                    >Book a table instead</a
                  >
                </div>
              </div>
            </aside>
          </div>

          <!-- More offers -->
          @if (others().length) {
            <div class="container-lux mt-20 border-t border-ink-200 pt-14">
              <h2 class="font-display text-2xl">Other offers</h2>
              <ul class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                @for (other of others(); track other.id) {
                  <li>
                    <a
                      [routerLink]="['/offers', other.slug]"
                      class="card-lux group flex h-full flex-col overflow-hidden hover:-translate-y-1.5"
                    >
                      <span class="block aspect-[16/10] overflow-hidden">
                        <app-image
                          [src]="other.image"
                          [alt]="other.title"
                          sizes="24rem"
                          class="h-full w-full transition-transform duration-700 group-hover:scale-110"
                        />
                      </span>
                      <span class="flex flex-1 flex-col p-5">
                        <span class="font-display text-lg">{{ other.title }}</span>
                        <span class="mt-1.5 line-clamp-2 text-sm text-ink-600">{{
                          other.subtitle
                        }}</span>
                      </span>
                    </a>
                  </li>
                }
              </ul>
            </div>
          }
        </section>
      </article>
    } @else if (resolved()) {
      <div class="container-lux pt-[calc(var(--header-h)+6rem)] pb-24">
        <app-empty-state
          icon="tag"
          title="That offer has ended"
          message="It may have expired or been replaced. Have a look at what is running now."
          actionLabel="See current offers"
          (action)="goToOffers()"
        />
      </div>
    } @else {
      <div class="container-lux space-y-5 pt-[calc(var(--header-h)+4rem)] pb-24">
        <app-skeleton height="20rem" rounded="rounded-2xl" />
        <app-skeleton height="2.5rem" width="55%" />
        <app-skeleton height="1rem" />
        <app-skeleton height="1rem" width="70%" />
      </div>
    }
  `,
})
export class OfferDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly content = inject(ContentService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  private readonly resolvedOffer = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) => {
        const slug = params.get('slug');
        if (!slug) return of<Offer | null>(null);
        return this.content.offerBySlug(slug).pipe(
          map((row) => row ?? null),
          catchError(() => of<Offer | null>(null)),
        );
      }),
    ),
  );

  protected readonly offer = computed(() => this.resolvedOffer() ?? null);
  protected readonly resolved = computed(() => this.resolvedOffer() !== undefined);

  protected readonly savings = computed(() => {
    const o = this.offer();
    if (!o?.offerPrice || !o.originalPrice) return null;
    return o.originalPrice - o.offerPrice;
  });

  protected readonly expired = computed(() => {
    const o = this.offer();
    return o ? new Date(o.endsAt).getTime() < Date.now() : false;
  });

  protected readonly others = computed(() => {
    const current = this.offer();
    return this.content
      .offers()
      .filter((o) => o.id !== current?.id)
      .slice(0, 3);
  });

  constructor() {
    effect(() => {
      const o = this.offer();
      if (!o) {
        // Resolved but missing: tell the SSR server to answer a real 404
        // rather than a soft one on a URL that will never have content.
        if (this.resolved()) {
          this.seo.apply({
            title: 'Not Found | Salateen Restaurant Swabi',
            description: 'That page could not be found.',
            path: 'offers',
            noIndex: true,
            statusCode: 404,
          });
        }
        return;
      }
      this.seo.apply({
        title: `${o.title} | Salateen Restaurant Swabi`,
        description: `${o.subtitle}. ${o.description.slice(0, 140)}`,
        path: `offers/${o.slug}`,
        image: `${o.image}.webp`,
        keywords: [o.title, 'Salateen offer', 'Swabi restaurant deal'],
      });
      this.seo.breadcrumbSchema([
        { label: 'Offers', path: 'offers' },
        { label: o.title, path: `offers/${o.slug}` },
      ]);
    });
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

  protected goToOffers(): void {
    void this.router.navigate(['/offers']);
  }
}
