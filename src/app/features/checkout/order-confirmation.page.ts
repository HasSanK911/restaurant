import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, of, catchError } from 'rxjs';
import { BRAND, ORDER_STATUS_META } from '../../core/constants/app.constants';
import { Order } from '../../core/models/order.model';
import { OrderService } from '../../core/services/order.service';
import { SeoService } from '../../core/services/seo.service';
import { CurrencyPkrPipe } from '../../shared/pipes/currency-pkr.pipe';
import { NiceDatePipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { ImageComponent } from '../../shared/components/ui/image.component';
import { BadgeComponent } from '../../shared/components/ui/display.components';
import { EmptyStateComponent, SkeletonComponent } from '../../shared/components/ui/feedback.components';

/**
 * Post-order receipt.
 *
 * The reference number is the hero element, because it is what the customer
 * will read out on the phone if they call to check.
 */
@Component({
  selector: 'app-order-confirmation-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IconComponent,
    ImageComponent,
    BadgeComponent,
    EmptyStateComponent,
    SkeletonComponent,
    CurrencyPkrPipe,
    NiceDatePipe,
  ],
  template: `
    <div class="pt-[calc(var(--header-h)+3rem)] pb-24">
      <div class="container-lux max-w-3xl">
        @if (order(); as o) {
          <!-- Success -->
          <div class="text-center">
            <span
              class="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-emerald-600/25 bg-emerald-50 text-emerald-700"
              style="animation: fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both"
            >
              <app-icon name="check" [size]="38" [strokeWidth]="2.2" />
            </span>
            <p class="eyebrow mt-6">Order received</p>
            <h1 class="mt-3 text-4xl leading-tight sm:text-5xl">
              Thank you,
              <span class="text-gradient-clay italic">{{ firstName() }}</span>
            </h1>
            <p class="mx-auto mt-4 max-w-lg leading-relaxed text-ink-600">
              We have your order. Someone from the restaurant will call
              {{ o.customerPhone }} shortly to confirm it, and the kitchen starts as soon as they do.
            </p>
          </div>

          <!-- Reference -->
          <div
            class="mt-9 rounded-2xl border border-clay-600/25 bg-clay-50 p-6 text-center"
          >
            <p class="text-micro font-bold tracking-[0.22em] text-clay-700 uppercase">
              Your reference
            </p>
            <p class="mt-2 font-display text-4xl tracking-wide text-clay-800">{{ o.reference }}</p>
            <p class="mt-2 text-xs text-ink-500">
              Quote this if you call us on {{ brand.phoneDisplay }}
            </p>
            <div class="mt-5 flex flex-wrap justify-center gap-3">
              <a [routerLink]="['/order/track', o.reference]" class="btn btn-primary btn-md">
                <app-icon name="navigation" [size]="15" />
                Track this order
              </a>
              <a [href]="'tel:' + brand.phone" class="btn btn-secondary btn-md">
                <app-icon name="phone" [size]="15" />
                Call the restaurant
              </a>
            </div>
          </div>

          <!-- Summary -->
          <div class="panel mt-6 overflow-hidden">
            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 px-6 py-4">
              <div>
                <p class="text-sm font-semibold text-ink-900">Order summary</p>
                <p class="mt-0.5 text-xs text-ink-500">{{ o.createdAt | niceDate: true }}</p>
              </div>
              <app-badge [tone]="$any(statusTone())" [dot]="true">{{ statusLabel() }}</app-badge>
            </div>

            <ul class="divide-y divide-ink-200">
              @for (line of o.items; track line.slug + line.variantLabel) {
                <li class="flex items-center gap-4 px-6 py-4">
                  <span class="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-ink-200">
                    <app-image [src]="line.image" [alt]="line.name" sizes="56px" class="h-full w-full" />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-semibold text-ink-900">{{ line.name }}</span>
                    <span class="block text-xs text-ink-500"
                      >{{ line.variantLabel }} &middot; {{ line.quantity }}&times;</span
                    >
                    @if (line.note) {
                      <span class="mt-0.5 block text-xs text-clay-600">{{ line.note }}</span>
                    }
                  </span>
                  <span class="shrink-0 font-display text-lg text-clay-700 nums">{{
                    line.lineTotal | pkr
                  }}</span>
                </li>
              }
            </ul>

            <dl class="space-y-2.5 border-t border-ink-200 px-6 py-5 text-sm">
              <div class="flex justify-between">
                <dt class="text-ink-500">Subtotal</dt>
                <dd class="text-ink-900 nums">{{ o.subtotal | pkr }}</dd>
              </div>
              @if (o.discount > 0) {
                <div class="flex justify-between">
                  <dt class="text-emerald-700">Discount {{ o.couponCode ? '(' + o.couponCode + ')' : '' }}</dt>
                  <dd class="text-emerald-700 nums">-{{ o.discount | pkr }}</dd>
                </div>
              }
              @if (o.fulfilment === 'delivery') {
                <div class="flex justify-between">
                  <dt class="text-ink-500">Delivery</dt>
                  <dd class="text-ink-900 nums">{{ o.deliveryFee === 0 ? 'Free' : (o.deliveryFee | pkr) }}</dd>
                </div>
              }
              <div class="flex items-baseline justify-between border-t border-ink-200 pt-3">
                <dt class="font-semibold text-ink-900">Pay in cash</dt>
                <dd class="font-display text-3xl text-clay-700 nums">{{ o.grandTotal | pkr }}</dd>
              </div>
            </dl>
          </div>

          <!-- Delivery / collection -->
          <div class="mt-6 grid gap-4 sm:grid-cols-2">
            <div class="panel p-5">
              <p class="eyebrow mb-3">{{ o.fulfilment === 'delivery' ? 'Delivering to' : 'Collection' }}</p>
              @if (o.fulfilment === 'delivery' && o.deliveryAddress) {
                <address class="text-sm leading-relaxed text-ink-700 not-italic">
                  {{ o.customerName }}<br />
                  {{ o.deliveryAddress.line1 }}<br />
                  @if (o.deliveryAddress.landmark) {
                    {{ o.deliveryAddress.landmark }}<br />
                  }
                  {{ o.deliveryAddress.area }}, {{ o.deliveryAddress.city }}<br />
                  {{ o.customerPhone }}
                </address>
              } @else {
                <address class="text-sm leading-relaxed text-ink-700 not-italic">
                  {{ brand.fullName }}<br />
                  {{ brand.street }}<br />
                  {{ brand.city }}, {{ brand.region }}
                </address>
              }
            </div>
            <div class="panel p-5">
              <p class="eyebrow mb-3">Payment</p>
              <p class="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <app-icon name="wallet" [size]="16" class="text-clay-600" />
                {{ o.paymentMethod === 'cash-on-delivery' ? 'Cash on delivery' : 'Cash at the counter' }}
              </p>
              <p class="mt-2 text-xs leading-relaxed text-ink-500">
                Nothing has been charged. Pay the full amount in cash when you receive your order.
              </p>
              @if (o.estimatedReadyAt) {
                <p class="mt-4 flex items-center gap-2 text-xs text-ink-500">
                  <app-icon name="clock" [size]="14" class="text-clay-600" />
                  Ready around {{ o.estimatedReadyAt | niceDate: true }}
                </p>
              }
            </div>
          </div>

          <div class="mt-8 flex flex-wrap justify-center gap-3">
            <a routerLink="/menu" class="btn btn-secondary btn-md">Order something else</a>
            <a routerLink="/account/orders" class="btn btn-ghost btn-md border border-ink-300"
              >My orders</a
            >
          </div>
        } @else if (loading()) {
          <div class="space-y-4">
            <app-skeleton height="5rem" width="5rem" rounded="rounded-full" />
            <app-skeleton height="3rem" width="60%" />
            <app-skeleton height="10rem" />
            <app-skeleton height="18rem" />
          </div>
        } @else {
          <app-empty-state
            icon="search"
            title="We could not find that order"
            message="The link may be incorrect or the order may have been removed. Try tracking it by reference instead."
          >
            <a routerLink="/order/track" class="btn btn-primary btn-md mt-6">Track an order</a>
          </app-empty-state>
        }
      </div>
    </div>
  `,
})
export class OrderConfirmationPage {
  private readonly route = inject(ActivatedRoute);
  private readonly orders = inject(OrderService);
  private readonly seo = inject(SeoService);

  protected readonly brand = BRAND;
  protected readonly loading = signal(true);

  protected readonly order = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id');
        if (!id) return of(null);
        return this.orders.byId(id).pipe(catchError(() => of(null)));
      }),
    ),
    { initialValue: null as Order | null },
  );

  protected readonly firstName = computed(
    () => this.order()?.customerName.split(/\s+/)[0] ?? 'friend',
  );

  protected readonly statusLabel = computed(() => {
    const status = this.order()?.status;
    return status ? ORDER_STATUS_META[status].label : '';
  });

  protected readonly statusTone = computed(() => {
    const status = this.order()?.status;
    return status ? ORDER_STATUS_META[status].tone : 'ink';
  });

  constructor() {
    this.seo.apply({
      title: 'Order Confirmed | Salateen Restaurant Swabi',
      description: 'Your Salateen Restaurant order has been received.',
      path: 'order/confirmation',
      noIndex: true,
    });
    // Flip loading off once the first emission settles either way.
    queueMicrotask(() => setTimeout(() => this.loading.set(false), 1200));
  }
}
