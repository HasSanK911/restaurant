import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap } from 'rxjs';
import { BRAND, ORDER_STATUS_META } from '../../core/constants/app.constants';
import { Order } from '../../core/models/order.model';
import { CartService } from '../../core/services/cart.service';
import { MenuService } from '../../core/services/menu.service';
import { OrderService } from '../../core/services/order.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { CurrencyPkrPipe } from '../../shared/pipes/currency-pkr.pipe';
import { NiceDatePipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { ImageComponent } from '../../shared/components/ui/image.component';
import { BadgeComponent } from '../../shared/components/ui/display.components';
import { EmptyStateComponent, SkeletonComponent } from '../../shared/components/ui/feedback.components';

@Component({
  selector: 'app-account-order-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ImageComponent,
    IconComponent,
    BadgeComponent,
    EmptyStateComponent,
    SkeletonComponent,
    CurrencyPkrPipe,
    NiceDatePipe,
  ],
  template: `
    @if (order(); as o) {
      <a
        routerLink="/account/orders"
        class="mb-6 inline-flex items-center gap-1.5 text-caption font-semibold text-ink-500 transition-colors hover:text-clay-700"
      >
        <app-icon name="arrow-left" [size]="13" />
        All orders
      </a>

      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 class="font-display text-3xl">{{ o.reference }}</h2>
          <p class="mt-1 text-sm text-ink-500">Placed {{ o.createdAt | niceDate: true }}</p>
        </div>
        <app-badge [tone]="$any(meta(o).tone)" [dot]="true">{{ meta(o).label }}</app-badge>
      </div>

      <div class="mt-8 grid gap-6 lg:grid-cols-3">
        <!-- Items -->
        <div class="lg:col-span-2">
          <div class="panel overflow-hidden">
            <h3 class="border-b border-ink-200 px-5 py-4 font-display text-lg">
              {{ o.items.length }} item{{ o.items.length === 1 ? '' : 's' }}
            </h3>
            <ul class="divide-y divide-ink-200">
              @for (line of o.items; track line.slug + line.variantLabel) {
                <li class="flex gap-4 px-5 py-4">
                  <a
                    [routerLink]="['/menu', line.slug]"
                    class="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-ink-200"
                  >
                    <app-image [src]="line.image" [alt]="line.name" sizes="64px" class="h-full w-full" />
                  </a>
                  <div class="min-w-0 flex-1">
                    <a
                      [routerLink]="['/menu', line.slug]"
                      class="font-semibold text-ink-900 transition-colors hover:text-clay-700"
                      >{{ line.name }}</a
                    >
                    <p class="mt-0.5 text-caption text-ink-500">
                      {{ line.variantLabel }} &middot; {{ line.quantity }} &times;
                      {{ line.unitPrice | pkr }}
                    </p>
                    @if (line.addons.length) {
                      <ul class="mt-1.5 flex flex-wrap gap-1.5">
                        @for (addon of line.addons; track addon.name) {
                          <li class="chip border-ink-300 text-ink-600">
                            {{ addon.quantity }}&times; {{ addon.name }}
                          </li>
                        }
                      </ul>
                    }
                    @if (line.note) {
                      <p class="mt-1.5 flex items-start gap-1.5 text-caption text-clay-700">
                        <app-icon name="pen" [size]="11" class="mt-0.5" />
                        {{ line.note }}
                      </p>
                    }
                  </div>
                  <p class="shrink-0 font-display text-lg text-clay-700">{{ line.lineTotal | pkr }}</p>
                </li>
              }
            </ul>
          </div>

          <!-- Timeline -->
          <div class="panel mt-6 p-6">
            <h3 class="font-display text-lg">Order history</h3>
            <ol class="mt-5 space-y-4">
              @for (entry of timeline(); track entry.at) {
                <li class="flex gap-3.5">
                  <span class="mt-1 flex flex-col items-center">
                    <span class="h-2.5 w-2.5 shrink-0 rounded-full bg-clay-600"></span>
                    @if (!$last) {
                      <span class="mt-1 w-px flex-1 bg-ink-200"></span>
                    }
                  </span>
                  <span class="pb-1">
                    <span class="block text-sm font-semibold text-ink-900">{{
                      statusLabel(entry.status)
                    }}</span>
                    <span class="block text-caption text-ink-500">{{ entry.at | niceDate: true }}</span>
                    @if (entry.note) {
                      <span class="mt-0.5 block text-caption text-ink-600">{{ entry.note }}</span>
                    }
                  </span>
                </li>
              }
            </ol>
          </div>
        </div>

        <!-- Summary -->
        <aside class="space-y-5">
          <div class="panel p-5">
            <h3 class="font-display text-lg">Payment</h3>
            <dl class="mt-4 space-y-2.5 text-sm">
              <div class="flex justify-between">
                <dt class="text-ink-500">Subtotal</dt>
                <dd class="text-ink-900">{{ o.subtotal | pkr }}</dd>
              </div>
              @if (o.discount > 0) {
                <div class="flex justify-between">
                  <dt class="text-emerald-700">
                    Discount{{ o.couponCode ? ' (' + o.couponCode + ')' : '' }}
                  </dt>
                  <dd class="text-emerald-700">-{{ o.discount | pkr }}</dd>
                </div>
              }
              @if (o.fulfilment === 'delivery') {
                <div class="flex justify-between">
                  <dt class="text-ink-500">Delivery</dt>
                  <dd class="text-ink-900">
                    {{ o.deliveryFee === 0 ? 'Free' : (o.deliveryFee | pkr) }}
                  </dd>
                </div>
              }
              <div class="flex items-baseline justify-between border-t border-ink-200 pt-3">
                <dt class="font-semibold text-ink-900">Total</dt>
                <dd class="font-display text-2xl text-clay-700">{{ o.grandTotal | pkr }}</dd>
              </div>
            </dl>
            <p class="mt-3 flex items-center gap-2 text-caption text-ink-500">
              <app-icon name="wallet" [size]="13" class="text-clay-600" />
              {{ o.paymentMethod === 'cash-on-delivery' ? 'Cash on delivery' : 'Cash at the counter' }}
            </p>
          </div>

          <div class="panel p-5">
            <h3 class="font-display text-lg">
              {{ o.fulfilment === 'delivery' ? 'Delivery address' : 'Collection' }}
            </h3>
            @if (o.fulfilment === 'delivery' && o.deliveryAddress) {
              <address class="mt-3 text-sm leading-relaxed text-ink-600 not-italic">
                {{ o.customerName }}<br />
                {{ o.deliveryAddress.line1 }}<br />
                @if (o.deliveryAddress.landmark) {
                  {{ o.deliveryAddress.landmark }}<br />
                }
                {{ o.deliveryAddress.area }}, {{ o.deliveryAddress.city }}<br />
                {{ o.customerPhone }}
              </address>
              @if (o.assignedRiderName) {
                <p class="mt-3 flex items-center gap-2 text-caption text-ink-500">
                  <app-icon name="bike" [size]="13" class="text-clay-600" />
                  Rider: {{ o.assignedRiderName }}
                </p>
              }
            } @else {
              <address class="mt-3 text-sm leading-relaxed text-ink-600 not-italic">
                {{ brand.fullName }}<br />
                {{ brand.street }}<br />
                {{ brand.city }}
              </address>
            }
          </div>

          <div class="space-y-2.5">
            <button type="button" class="btn btn-primary btn-md w-full" (click)="reorder(o)">
              <app-icon name="refresh" [size]="15" />
              Order this again
            </button>
            @if (isLive(o)) {
              <a [routerLink]="['/order/track', o.reference]" class="btn btn-secondary btn-md w-full"
                >Track this order</a
              >
            }
            <a [href]="'tel:' + brand.phone" class="btn btn-ghost btn-md w-full border border-ink-300">
              <app-icon name="phone" [size]="14" />
              Call about it
            </a>
          </div>
        </aside>
      </div>
    } @else if (resolved()) {
      <app-empty-state
        icon="bag"
        title="We could not find that order"
        message="It may belong to a different account."
        actionLabel="Back to my orders"
        (action)="goBack()"
      />
    } @else {
      <div class="space-y-4">
        <app-skeleton height="2.5rem" width="40%" />
        <app-skeleton height="18rem" />
        <app-skeleton height="10rem" />
      </div>
    }
  `,
})
export class AccountOrderDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderService = inject(OrderService);
  private readonly menu = inject(MenuService);
  private readonly cart = inject(CartService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  protected readonly brand = BRAND;

  private readonly resolvedOrder = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id');
        if (!id) return of<Order | null>(null);
        return this.orderService.byId(id).pipe(
          map((order) => order ?? null),
          catchError(() => of<Order | null>(null)),
        );
      }),
    ),
  );

  protected readonly order = computed(() => this.resolvedOrder() ?? null);
  protected readonly resolved = computed(() => this.resolvedOrder() !== undefined);

  protected readonly timeline = computed(() => [...(this.order()?.timeline ?? [])].reverse());

  constructor() {
    this.seo.apply({
      title: 'Order Details | Salateen Restaurant Swabi',
      description: 'Details of your Salateen Restaurant order.',
      path: 'account/orders',
      noIndex: true,
    });
  }

  protected meta(order: Order) {
    return ORDER_STATUS_META[order.status];
  }
  protected statusLabel(status: Order['status']): string {
    return ORDER_STATUS_META[status].label;
  }
  protected isLive(order: Order): boolean {
    return !['delivered', 'cancelled'].includes(order.status);
  }

  protected reorder(order: Order): void {
    let added = 0;
    for (const line of order.items) {
      const item = this.menu.itemBySlug(line.slug);
      if (!item?.isAvailable) continue;
      const variant =
        item.variants.find((v) => v.label === line.variantLabel) ??
        item.variants.find((v) => v.isDefault) ??
        item.variants[0];
      if (!variant) continue;
      this.cart.add({ item, variant, quantity: line.quantity, note: line.note });
      added++;
    }
    if (added) {
      this.toast.success('Added to your basket', `${added} item(s) from ${order.reference}.`);
      this.cart.open();
    } else {
      this.toast.error('Nothing could be added', 'Those dishes are unavailable right now.');
    }
  }

  protected goBack(): void {
    void this.router.navigate(['/account/orders']);
  }
}
