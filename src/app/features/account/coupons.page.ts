import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Coupon } from '../../core/models/order.model';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { CurrencyPkrPipe } from '../../shared/pipes/currency-pkr.pipe';
import { NiceDatePipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { BadgeComponent } from '../../shared/components/ui/display.components';
import { EmptyStateComponent } from '../../shared/components/ui/feedback.components';

@Component({
  selector: 'app-account-coupons-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IconComponent,
    BadgeComponent,
    EmptyStateComponent,
    CurrencyPkrPipe,
    NiceDatePipe,
  ],
  template: `
    <h2 class="font-display text-2xl">Coupons</h2>
    <p class="mt-1.5 text-sm text-ink-600">
      Codes you can use at checkout. Tap a code to copy it.
    </p>

    @if (active().length) {
      <ul class="mt-7 grid gap-4 sm:grid-cols-2">
        @for (coupon of active(); track coupon.id) {
          <li>
            <article class="panel relative flex h-full flex-col overflow-hidden">
              <!-- Perforated edge, purely decorative -->
              <span
                class="absolute top-1/2 -left-2.5 h-5 w-5 -translate-y-1/2 rounded-full bg-paper"
                aria-hidden="true"
              ></span>
              <span
                class="absolute top-1/2 -right-2.5 h-5 w-5 -translate-y-1/2 rounded-full bg-paper"
                aria-hidden="true"
              ></span>

              <div class="flex items-start justify-between gap-3 p-5">
                <div class="min-w-0">
                  <p class="font-display text-xl">{{ coupon.title }}</p>
                  <p class="mt-1 text-sm text-ink-600">{{ coupon.description }}</p>
                </div>
                <app-badge tone="clay">{{ valueLabel(coupon) }}</app-badge>
              </div>

              <div class="mt-auto border-t border-dashed border-ink-300 p-5">
                <button
                  type="button"
                  class="flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-clay-600/45 bg-clay-50 px-4 py-3 transition-colors hover:bg-clay-100"
                  [attr.aria-label]="'Copy coupon code ' + coupon.code"
                  (click)="copy(coupon.code)"
                >
                  <span class="font-mono text-lg font-bold tracking-wider text-clay-700">{{
                    coupon.code
                  }}</span>
                  <span class="flex items-center gap-1.5 text-caption font-semibold text-clay-600">
                    <app-icon name="copy" [size]="13" />
                    Copy
                  </span>
                </button>

                <dl class="mt-4 space-y-1.5 text-caption text-ink-500">
                  <div class="flex justify-between gap-3">
                    <dt>Minimum order</dt>
                    <dd class="text-ink-700">{{ coupon.minimumOrder | pkr }}</dd>
                  </div>
                  @if (coupon.maxDiscount) {
                    <div class="flex justify-between gap-3">
                      <dt>Maximum discount</dt>
                      <dd class="text-ink-700">{{ coupon.maxDiscount | pkr }}</dd>
                    </div>
                  }
                  <div class="flex justify-between gap-3">
                    <dt>Expires</dt>
                    <dd class="text-ink-700">{{ coupon.expiresAt | niceDate }}</dd>
                  </div>
                </dl>
              </div>
            </article>
          </li>
        }
      </ul>
    } @else {
      <app-empty-state
        class="mt-7"
        icon="ticket"
        title="No coupons available"
        message="Offers come and go. Check the offers page for what is running."
      />
    }

    @if (expired().length) {
      <section class="mt-10">
        <h3 class="font-display text-lg text-ink-500">Expired</h3>
        <ul class="mt-4 flex flex-wrap gap-2">
          @for (coupon of expired(); track coupon.id) {
            <li
              class="chip border-ink-300 text-ink-400 line-through"
              [attr.title]="coupon.title"
            >
              {{ coupon.code }}
            </li>
          }
        </ul>
      </section>
    }

    <div class="panel mt-8 flex flex-wrap items-center justify-between gap-4 p-6">
      <div>
        <p class="font-display text-xl">Looking for more?</p>
        <p class="mt-1 text-sm text-ink-600">
          Family Friday, BBQ Night and free delivery above Rs 2,500 all run every week.
        </p>
      </div>
      <a routerLink="/offers" class="btn btn-primary btn-md">
        See all offers
        <app-icon name="arrow-right" [size]="15" />
      </a>
    </div>
  `,
})
export class AccountCouponsPage {
  private readonly content = inject(ContentService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  private readonly coupons = toSignal(this.content.coupons(), { initialValue: [] as Coupon[] });

  protected readonly active = computed(() =>
    this.coupons().filter((c) => c.isActive && new Date(c.expiresAt).getTime() > Date.now()),
  );

  protected readonly expired = computed(() =>
    this.coupons().filter((c) => !c.isActive || new Date(c.expiresAt).getTime() <= Date.now()),
  );

  constructor() {
    this.seo.apply({
      title: 'My Coupons | Salateen Restaurant Swabi',
      description: 'Coupon codes available on your Salateen Restaurant account.',
      path: 'account/coupons',
      noIndex: true,
    });
  }

  protected valueLabel(coupon: Coupon): string {
    if (coupon.type === 'percentage') return `${coupon.value}% off`;
    if (coupon.type === 'fixed') return `Rs ${coupon.value} off`;
    return 'Free delivery';
  }

  protected copy(code: string): void {
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
