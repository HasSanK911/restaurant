import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { ORDER_STATUS_META, RESERVATION_STATUS_META } from '../../core/constants/app.constants';
import { Order } from '../../core/models/order.model';
import { Reservation } from '../../core/models/reservation.model';
import { AuthService } from '../../core/services/auth.service';
import { MenuService } from '../../core/services/menu.service';
import { OrderService } from '../../core/services/order.service';
import { ReservationService } from '../../core/services/reservation.service';
import { SeoService } from '../../core/services/seo.service';
import { CurrencyPkrPipe } from '../../shared/pipes/currency-pkr.pipe';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { ImageComponent } from '../../shared/components/ui/image.component';
import { BadgeComponent } from '../../shared/components/ui/display.components';
import { EmptyStateComponent } from '../../shared/components/ui/feedback.components';

@Component({
  selector: 'app-account-overview-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ImageComponent,
    IconComponent,
    BadgeComponent,
    EmptyStateComponent,
    CurrencyPkrPipe,
    TimeAgoPipe,
  ],
  template: `
    <!-- KPIs -->
    <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      @for (stat of stats(); track stat.label) {
        <li class="card-lux p-5">
          <span
            class="flex h-10 w-10 items-center justify-center rounded-xl border border-clay-600/20 bg-clay-50 text-clay-700"
          >
            <app-icon [name]="$any(stat.icon)" [size]="18" />
          </span>
          <p class="mt-4 font-display text-3xl">{{ stat.value }}</p>
          <p class="mt-1 text-caption text-ink-500">{{ stat.label }}</p>
        </li>
      }
    </ul>

    <!-- Live order -->
    @if (liveOrder(); as order) {
      <section class="panel mt-6 overflow-hidden">
        <div class="flex flex-wrap items-center justify-between gap-3 bg-clay-50 px-6 py-4">
          <div>
            <p class="text-caption text-clay-700">On its way now</p>
            <p class="mt-0.5 font-display text-xl">{{ order.reference }}</p>
          </div>
          <app-badge [tone]="$any(statusTone(order))" [dot]="true">{{ statusLabel(order) }}</app-badge>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <p class="text-sm text-ink-600">{{ statusDescription(order) }}</p>
          <a [routerLink]="['/order/track', order.reference]" class="btn btn-primary btn-sm">
            Track it
            <app-icon name="arrow-right" [size]="14" />
          </a>
        </div>
      </section>
    }

    <div class="mt-6 grid gap-6 lg:grid-cols-2">
      <!-- Recent orders -->
      <section class="panel overflow-hidden">
        <div class="flex items-center justify-between border-b border-ink-200 px-6 py-4">
          <h2 class="font-display text-xl">Recent orders</h2>
          <a routerLink="/account/orders" class="text-caption font-semibold text-clay-700 hover:underline"
            >See all</a
          >
        </div>
        @if (recentOrders().length) {
          <ul class="divide-y divide-ink-200">
            @for (order of recentOrders(); track order.id) {
              <li>
                <a
                  [routerLink]="['/account/orders', order.id]"
                  class="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-ink-50"
                >
                  <span class="min-w-0 flex-1">
                    <span class="flex items-center gap-2.5">
                      <span class="font-semibold text-ink-900">{{ order.reference }}</span>
                      <app-badge [tone]="$any(statusTone(order))">{{ statusLabel(order) }}</app-badge>
                    </span>
                    <span class="mt-1 block truncate text-caption text-ink-500">
                      {{ order.items.length }} item{{ order.items.length === 1 ? '' : 's' }} &middot;
                      {{ order.createdAt | timeAgo }}
                    </span>
                  </span>
                  <span class="shrink-0 font-display text-lg text-clay-700">{{
                    order.grandTotal | pkr
                  }}</span>
                </a>
              </li>
            }
          </ul>
        } @else {
          <app-empty-state
            icon="bag"
            title="No orders yet"
            message="Your order history will appear here."
            actionLabel="Browse the menu"
            (action)="goToMenu()"
          />
        }
      </section>

      <!-- Upcoming reservations -->
      <section class="panel overflow-hidden">
        <div class="flex items-center justify-between border-b border-ink-200 px-6 py-4">
          <h2 class="font-display text-xl">Upcoming reservations</h2>
          <a
            routerLink="/account/reservations"
            class="text-caption font-semibold text-clay-700 hover:underline"
            >See all</a
          >
        </div>
        @if (upcomingReservations().length) {
          <ul class="divide-y divide-ink-200">
            @for (reservation of upcomingReservations(); track reservation.id) {
              <li class="flex items-center gap-4 px-6 py-4">
                <span
                  class="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-ink-200 bg-ink-50"
                >
                  <span class="font-display text-lg leading-none text-ink-900">{{
                    dayOf(reservation.date)
                  }}</span>
                  <span class="text-micro uppercase">{{ monthOf(reservation.date) }}</span>
                </span>
                <span class="min-w-0 flex-1">
                  <span class="flex items-center gap-2.5">
                    <span class="font-semibold text-ink-900">{{ reservation.reference }}</span>
                    <app-badge [tone]="$any(reservationTone(reservation))">{{
                      reservationLabel(reservation)
                    }}</app-badge>
                  </span>
                  <span class="mt-1 block text-caption text-ink-500">
                    {{ reservation.guests }} guests &middot; {{ reservation.time }} &middot;
                    {{ zoneLabel(reservation.zone) }}
                  </span>
                </span>
              </li>
            }
          </ul>
        } @else {
          <app-empty-state
            icon="calendar"
            title="No bookings coming up"
            message="Reserve a table and it will show here."
            actionLabel="Book a table"
            (action)="goToReservation()"
          />
        }
      </section>
    </div>

    <!-- Order it again -->
    @if (reorderItems().length) {
      <section class="mt-6">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-xl">Order it again</h2>
          <a routerLink="/menu" class="text-caption font-semibold text-clay-700 hover:underline"
            >Full menu</a
          >
        </div>
        <ul class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          @for (item of reorderItems(); track item.slug) {
            <li>
              <a
                [routerLink]="['/menu', item.slug]"
                class="card-lux group flex h-full items-center gap-3 p-3 transition-all hover:-translate-y-1"
              >
                <span class="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-ink-200">
                  <app-image [src]="item.image" [alt]="item.name" sizes="56px" class="h-full w-full" />
                </span>
                <span class="min-w-0">
                  <span
                    class="block truncate text-sm font-semibold transition-colors group-hover:text-clay-700"
                    >{{ item.name }}</span
                  >
                  <span class="block text-caption text-ink-500"
                    >Ordered {{ item.count }}&times;</span
                  >
                </span>
              </a>
            </li>
          }
        </ul>
      </section>
    }

    <!-- Loyalty -->
    <section class="panel mt-6 grid gap-6 p-6 sm:grid-cols-2 sm:items-center">
      <div>
        <p class="eyebrow mb-2">Loyalty</p>
        <p class="font-display text-3xl text-clay-700">{{ loyaltyPoints() }} points</p>
        <p class="mt-2 text-sm leading-relaxed text-ink-600">
          One point per hundred rupees spent. Points are redeemed at the counter, in cash value,
          against any bill.
        </p>
      </div>
      <div>
        <div class="h-2 overflow-hidden rounded-full bg-ink-200">
          <div
            class="h-full rounded-full bg-gradient-to-r from-clay-400 to-clay-600 transition-[width] duration-700"
            [style.width.%]="loyaltyProgress()"
          ></div>
        </div>
        <p class="mt-2 text-caption text-ink-500">
          {{ pointsToNextReward() }} points to your next Rs 500 reward
        </p>
      </div>
    </section>
  `,
})
export class AccountOverviewPage {
  private readonly auth = inject(AuthService);
  private readonly orderService = inject(OrderService);
  private readonly reservationService = inject(ReservationService);
  private readonly menu = inject(MenuService);
  private readonly seo = inject(SeoService);
  private readonly router = inject(Router);

  private readonly userId = computed(() => this.auth.user()?.id ?? null);

  protected readonly orders = toSignal(
    toObservable(this.userId).pipe(
      switchMap((id) => (id ? this.orderService.forCustomer(id) : of<Order[]>([]))),
    ),
    { initialValue: [] as Order[] },
  );

  protected readonly reservations = toSignal(
    toObservable(this.userId).pipe(
      switchMap((id) => (id ? this.reservationService.forCustomer(id) : of<Reservation[]>([]))),
    ),
    { initialValue: [] as Reservation[] },
  );

  protected readonly recentOrders = computed(() => this.orders().slice(0, 5));

  protected readonly liveOrder = computed(() =>
    this.orders().find((o) => !['delivered', 'cancelled'].includes(o.status)),
  );

  protected readonly upcomingReservations = computed(() =>
    this.reservations()
      .filter(
        (r) =>
          new Date(r.date).getTime() >= new Date().setHours(0, 0, 0, 0) &&
          ['pending', 'confirmed', 'seated'].includes(r.status),
      )
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .slice(0, 4),
  );

  protected readonly stats = computed(() => {
    const orders = this.orders();
    const delivered = orders.filter((o) => o.status === 'delivered');
    const spend = delivered.reduce((sum, o) => sum + o.grandTotal, 0);
    return [
      { icon: 'bag', label: 'Orders placed', value: orders.length },
      { icon: 'wallet', label: 'Total spent', value: `Rs ${spend.toLocaleString('en-PK')}` },
      { icon: 'calendar', label: 'Reservations', value: this.reservations().length },
      { icon: 'heart', label: 'Saved dishes', value: this.favouriteCount() },
    ];
  });

  protected readonly favouriteCount = computed(() => 0);

  /** Most frequently ordered dishes, for the one-tap reorder rail. */
  protected readonly reorderItems = computed(() => {
    const tally = new Map<string, { slug: string; name: string; image: string; count: number }>();
    for (const order of this.orders()) {
      for (const line of order.items) {
        const existing = tally.get(line.slug);
        if (existing) existing.count += line.quantity;
        else
          tally.set(line.slug, {
            slug: line.slug,
            name: line.name,
            image: line.image,
            count: line.quantity,
          });
      }
    }
    return [...tally.values()].sort((a, b) => b.count - a.count).slice(0, 4);
  });

  protected readonly loyaltyPoints = computed(() => {
    const spend = this.orders()
      .filter((o) => o.status === 'delivered')
      .reduce((sum, o) => sum + o.grandTotal, 0);
    return Math.floor(spend / 100);
  });

  protected readonly loyaltyProgress = computed(() => (this.loyaltyPoints() % 500) / 5);
  protected readonly pointsToNextReward = computed(() => 500 - (this.loyaltyPoints() % 500));

  constructor() {
    this.seo.apply({
      title: 'My Account | Salateen Restaurant Swabi',
      description: 'Your Salateen Restaurant orders, reservations and saved dishes.',
      path: 'account',
      noIndex: true,
    });
  }

  protected statusLabel(order: Order): string {
    return ORDER_STATUS_META[order.status].label;
  }
  protected statusTone(order: Order): string {
    return ORDER_STATUS_META[order.status].tone;
  }
  protected statusDescription(order: Order): string {
    return ORDER_STATUS_META[order.status].description;
  }
  protected reservationLabel(reservation: Reservation): string {
    return RESERVATION_STATUS_META[reservation.status].label;
  }
  protected reservationTone(reservation: Reservation): string {
    return RESERVATION_STATUS_META[reservation.status].tone;
  }
  protected zoneLabel(zone: string): string {
    return zone.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  protected dayOf(date: string): string {
    return new Date(date).getDate().toString();
  }
  protected monthOf(date: string): string {
    return new Date(date).toLocaleDateString('en-GB', { month: 'short' });
  }
  protected goToMenu(): void {
    void this.router.navigate(['/menu']);
  }
  protected goToReservation(): void {
    void this.router.navigate(['/reservation']);
  }
}

