import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { ORDER_STATUS_META } from '../../core/constants/app.constants';
import { Order, OrderStatus } from '../../core/models/order.model';
import { AuthService } from '../../core/services/auth.service';
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
import { EmptyStateComponent } from '../../shared/components/ui/feedback.components';
import { TabsComponent } from '../../shared/components/ui/navigation.components';

@Component({
  selector: 'app-account-orders-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ImageComponent,
    IconComponent,
    BadgeComponent,
    EmptyStateComponent,
    TabsComponent,
    CurrencyPkrPipe,
    NiceDatePipe,
  ],
  template: `
    <h2 class="font-display text-2xl">My orders</h2>
    <p class="mt-1.5 text-sm text-ink-600">
      Everything you have ordered, with a one-tap reorder on each.
    </p>

    <app-tabs class="mt-6" [tabs]="tabs()" [(active)]="filter" ariaLabel="Filter orders" />

    @if (visible().length) {
      <ul class="mt-6 space-y-4">
        @for (order of visible(); track order.id) {
          <li>
            <article class="panel overflow-hidden">
              <div
                class="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 bg-ink-50 px-5 py-3.5"
              >
                <div class="flex flex-wrap items-center gap-3">
                  <a
                    [routerLink]="['/account/orders', order.id]"
                    class="font-display text-lg transition-colors hover:text-clay-700"
                    >{{ order.reference }}</a
                  >
                  <app-badge [tone]="$any(meta(order.status).tone)" [dot]="true">{{
                    meta(order.status).label
                  }}</app-badge>
                </div>
                <p class="text-caption text-ink-500">{{ order.createdAt | niceDate: true }}</p>
              </div>

              <div class="flex flex-wrap items-center gap-4 px-5 py-4">
                <!-- Item thumbnails -->
                <div class="flex -space-x-3">
                  @for (line of order.items.slice(0, 4); track line.slug + line.variantLabel) {
                    <span
                      class="h-11 w-11 overflow-hidden rounded-lg border-2 border-white shadow-soft"
                      [attr.title]="line.name"
                    >
                      <app-image [src]="line.image" [alt]="line.name" sizes="44px" class="h-full w-full" />
                    </span>
                  }
                  @if (order.items.length > 4) {
                    <span
                      class="flex h-11 w-11 items-center justify-center rounded-lg border-2 border-white bg-ink-100 text-caption font-bold text-ink-600 shadow-soft"
                      >+{{ order.items.length - 4 }}</span
                    >
                  }
                </div>

                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm text-ink-700">{{ summary(order) }}</p>
                  <p class="mt-0.5 text-caption text-ink-500">
                    {{ order.fulfilment === 'delivery' ? 'Home delivery' : 'Dine in / collection' }}
                    &middot; {{ order.paymentMethod === 'cash-on-delivery' ? 'Cash on delivery' : 'Cash at counter' }}
                  </p>
                </div>

                <p class="font-display text-2xl text-clay-700">{{ order.grandTotal | pkr }}</p>
              </div>

              <div class="flex flex-wrap gap-2.5 border-t border-ink-200 px-5 py-3.5">
                <a [routerLink]="['/account/orders', order.id]" class="btn btn-secondary btn-sm">
                  View details
                </a>
                @if (isLive(order.status)) {
                  <a [routerLink]="['/order/track', order.reference]" class="btn btn-primary btn-sm">
                    <app-icon name="navigation" [size]="13" />
                    Track
                  </a>
                }
                <button type="button" class="btn btn-ghost btn-sm border border-ink-300" (click)="reorder(order)">
                  <app-icon name="refresh" [size]="13" />
                  Order again
                </button>
              </div>
            </article>
          </li>
        }
      </ul>
    } @else {
      <app-empty-state
        class="mt-6"
        icon="bag"
        [title]="filter() === 'all' ? 'No orders yet' : 'Nothing in this list'"
        message="When you order, it appears here with a one-tap reorder."
        actionLabel="Browse the menu"
        (action)="goToMenu()"
      />
    }
  `,
})
export class AccountOrdersPage {
  private readonly auth = inject(AuthService);
  private readonly orderService = inject(OrderService);
  private readonly menu = inject(MenuService);
  private readonly cart = inject(CartService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  protected readonly filter = signal('all');

  private readonly userId = computed(() => this.auth.user()?.id ?? null);

  protected readonly orders = toSignal(
    toObservable(this.userId).pipe(
      switchMap((id) => (id ? this.orderService.forCustomer(id) : of<Order[]>([]))),
    ),
    { initialValue: [] as Order[] },
  );

  protected readonly tabs = computed(() => {
    const all = this.orders();
    return [
      { id: 'all', label: 'All', count: all.length },
      { id: 'live', label: 'In progress', count: all.filter((o) => this.isLive(o.status)).length },
      {
        id: 'delivered',
        label: 'Completed',
        count: all.filter((o) => o.status === 'delivered').length,
      },
      {
        id: 'cancelled',
        label: 'Cancelled',
        count: all.filter((o) => o.status === 'cancelled').length,
      },
    ];
  });

  protected readonly visible = computed(() => {
    const all = this.orders();
    switch (this.filter()) {
      case 'live':
        return all.filter((o) => this.isLive(o.status));
      case 'delivered':
        return all.filter((o) => o.status === 'delivered');
      case 'cancelled':
        return all.filter((o) => o.status === 'cancelled');
      default:
        return all;
    }
  });

  constructor() {
    this.seo.apply({
      title: 'My Orders | Salateen Restaurant Swabi',
      description: 'Your Salateen Restaurant order history.',
      path: 'account/orders',
      noIndex: true,
    });
  }

  protected meta(status: OrderStatus) {
    return ORDER_STATUS_META[status];
  }

  protected isLive(status: OrderStatus): boolean {
    return !['delivered', 'cancelled'].includes(status);
  }

  protected summary(order: Order): string {
    return order.items.map((l) => `${l.quantity}x ${l.name}`).join(', ');
  }

  /**
   * Rebuilds the basket from a past order.
   *
   * Anything since removed from the menu, or currently unavailable, is skipped
   * and reported rather than silently dropped.
   */
  protected reorder(order: Order): void {
    let added = 0;
    const skipped: string[] = [];

    for (const line of order.items) {
      const item = this.menu.itemBySlug(line.slug);
      if (!item || !item.isAvailable) {
        skipped.push(line.name);
        continue;
      }
      const variant =
        item.variants.find((v) => v.label === line.variantLabel) ??
        item.variants.find((v) => v.isDefault) ??
        item.variants[0];
      if (!variant) {
        skipped.push(line.name);
        continue;
      }
      this.cart.add({ item, variant, quantity: line.quantity, note: line.note });
      added++;
    }

    if (added === 0) {
      this.toast.error('Nothing could be added', 'Those dishes are unavailable right now.');
      return;
    }
    if (skipped.length) {
      this.toast.warning(
        `${added} item(s) added`,
        `Not available today: ${skipped.join(', ')}.`,
      );
    } else {
      this.toast.success('Added to your basket', `${added} item(s) from ${order.reference}.`);
    }
    this.cart.open();
  }

  protected goToMenu(): void {
    void this.router.navigate(['/menu']);
  }
}
