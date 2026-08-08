import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { forkJoin, of, catchError } from 'rxjs';
import { ORDER_STATUS_META, RESERVATION_STATUS_META } from '../../core/constants/app.constants';
import { AnalyticsSnapshot, DashboardStats } from '../../core/models/analytics.model';
import { Order } from '../../core/models/order.model';
import { Reservation } from '../../core/models/reservation.model';
import { StockAlert } from '../../core/models/inventory.model';
import { AdminService } from '../../core/services/admin.service';
import { OrderService } from '../../core/services/order.service';
import { ReservationService } from '../../core/services/reservation.service';
import { SeoService } from '../../core/services/seo.service';
import { CurrencyPkrPipe } from '../../shared/pipes/currency-pkr.pipe';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { Clock12Pipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { ImageComponent } from '../../shared/components/ui/image.component';
import { StatCardComponent } from '../../shared/components/ui/display.components';
import { ChartComponent } from '../../shared/components/ui/chart.component';
import { EmptyStateComponent, SkeletonComponent } from '../../shared/components/ui/feedback.components';
import { AdminHeaderComponent, StatusPillComponent } from './shared/admin-ui.components';

interface DashboardData {
  stats: DashboardStats | null;
  analytics: AnalyticsSnapshot | null;
  orders: Order[];
  reservations: Reservation[];
  alerts: StockAlert[];
}

@Component({
  selector: 'app-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ImageComponent,
    IconComponent,
    StatCardComponent,
    ChartComponent,
    EmptyStateComponent,
    SkeletonComponent,
    AdminHeaderComponent,
    StatusPillComponent,
    CurrencyPkrPipe,
    TimeAgoPipe,
    Clock12Pipe,
  ],
  template: `
    <app-admin-header
      eyebrow="Overview"
      title="Today at Salateen"
      description="Live figures from the kitchen, the floor and the store room."
    >
      <a routerLink="/admin/kitchen-queue" class="btn btn-secondary btn-md">
        <app-icon name="flame" [size]="15" />
        Kitchen queue
      </a>
    </app-admin-header>

    @if (data(); as d) {
      <!-- KPIs -->
      <div class="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <app-stat-card
          label="Today's orders"
          [value]="d.stats?.todayOrders ?? 0"
          icon="bag"
          [delta]="d.stats?.ordersDelta ?? null"
        />
        <app-stat-card
          label="Today's revenue"
          [value]="revenueLabel()"
          icon="wallet"
          [delta]="d.stats?.revenueDelta ?? null"
        />
        <app-stat-card
          label="Reservations"
          [value]="d.stats?.todayReservations ?? 0"
          icon="calendar"
          [delta]="d.stats?.reservationsDelta ?? null"
          [hint]="(d.stats?.todayCovers ?? 0) + ' covers'"
        />
        <app-stat-card
          label="Average order"
          [value]="avgLabel()"
          icon="chart"
          [hint]="'Prep average ' + (d.stats?.averagePrepMinutes ?? 32) + ' min'"
        />
      </div>

      <!-- Secondary strip -->
      <div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        @for (tile of secondary(); track tile.label) {
          <a
            [routerLink]="tile.link"
            class="panel flex items-center gap-4 p-4 transition-colors hover:border-clay-500/35"
          >
            <span
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              [class]="tile.tone"
            >
              <app-icon [name]="$any(tile.icon)" [size]="18" />
            </span>
            <span class="min-w-0">
              <span class="block font-display text-2xl leading-none">{{ tile.value }}</span>
              <span class="mt-1 block truncate text-caption text-ink-500">{{ tile.label }}</span>
            </span>
          </a>
        }
      </div>

      <!-- Charts -->
      <div class="mt-6 grid gap-6 lg:grid-cols-3">
        <section class="panel p-6 lg:col-span-2">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="font-display text-xl">Revenue</h2>
              <p class="mt-0.5 text-caption text-ink-500">{{ rangeLabel() }}</p>
            </div>
            <div class="inline-flex rounded-full border border-ink-200 p-1">
              @for (option of ranges; track option.value) {
                <button
                  type="button"
                  class="rounded-full px-3.5 py-1.5 text-caption font-semibold transition-colors"
                  [class]="
                    range() === option.value
                      ? 'bg-clay-600 text-white'
                      : 'text-ink-500 hover:text-ink-900'
                  "
                  (click)="range.set(option.value)"
                >
                  {{ option.label }}
                </button>
              }
            </div>
          </div>
          <app-chart
            class="mt-5"
            type="line"
            [labels]="revenueLabels()"
            [series]="revenueSeries()"
            [height]="280"
            [currency]="true"
            ariaLabel="Revenue over time"
          />
        </section>

        <section class="panel p-6">
          <h2 class="font-display text-xl">Orders by hour</h2>
          <p class="mt-0.5 text-caption text-ink-500">Two peaks: lunch and, much larger, dinner</p>
          <app-chart
            class="mt-5"
            type="bar"
            [labels]="hourLabels()"
            [series]="hourSeries()"
            [height]="280"
            ariaLabel="Orders by hour of day"
          />
        </section>
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-3">
        <!-- Live orders -->
        <section class="panel overflow-hidden lg:col-span-2">
          <div class="flex items-center justify-between border-b border-ink-200 px-6 py-4">
            <h2 class="font-display text-xl">Live orders</h2>
            <a routerLink="/admin/orders" class="text-caption font-semibold text-clay-700 hover:underline"
              >All orders</a
            >
          </div>
          @if (liveOrders().length) {
            <ul class="divide-y divide-ink-200">
              @for (order of liveOrders(); track order.id) {
                <li>
                  <a
                    [routerLink]="['/admin/orders', order.id]"
                    class="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-ink-50"
                  >
                    <span class="min-w-0 flex-1">
                      <span class="flex flex-wrap items-center gap-2.5">
                        <span class="font-semibold text-ink-900">{{ order.reference }}</span>
                        <app-status-pill [tone]="statusTone(order)">{{
                          statusLabel(order)
                        }}</app-status-pill>
                      </span>
                      <span class="mt-1 block truncate text-caption text-ink-500">
                        {{ order.customerName }} &middot; {{ order.items.length }} items &middot;
                        {{ order.createdAt | timeAgo }}
                      </span>
                    </span>
                    <span class="shrink-0 text-right">
                      <span class="block font-display text-lg text-clay-700">{{
                        order.grandTotal | pkr
                      }}</span>
                      <span class="block text-caption text-ink-400">{{
                        order.fulfilment === 'delivery' ? 'Delivery' : 'Dine-in'
                      }}</span>
                    </span>
                  </a>
                </li>
              }
            </ul>
          } @else {
            <app-empty-state
              icon="check-circle"
              title="Nothing in the queue"
              message="Every order has been dealt with."
            />
          }
        </section>

        <!-- Stock alerts -->
        <section class="panel overflow-hidden">
          <div class="flex items-center justify-between border-b border-ink-200 px-6 py-4">
            <h2 class="font-display text-xl">Stock alerts</h2>
            <a routerLink="/admin/inventory" class="text-caption font-semibold text-clay-700 hover:underline"
              >Inventory</a
            >
          </div>
          @if (d.alerts.length) {
            <ul class="max-h-96 divide-y divide-ink-200 overflow-y-auto">
              @for (alert of d.alerts.slice(0, 10); track alert.item.id) {
                <li class="flex items-start gap-3 px-6 py-3.5">
                  <span
                    class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    [class]="alertTone(alert)"
                  >
                    <app-icon [name]="alert.severity === 'expiring' ? 'clock' : 'box'" [size]="15" />
                  </span>
                  <span class="min-w-0">
                    <span class="block truncate text-sm font-medium text-ink-900">{{
                      alert.item.name
                    }}</span>
                    <span class="block text-caption text-ink-500">{{ alert.message }}</span>
                  </span>
                </li>
              }
            </ul>
          } @else {
            <app-empty-state icon="check-circle" title="Store room is healthy" message="Nothing below reorder level." />
          }
        </section>
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-3">
        <!-- Top selling -->
        <section class="panel overflow-hidden lg:col-span-2">
          <div class="flex items-center justify-between border-b border-ink-200 px-6 py-4">
            <h2 class="font-display text-xl">Top selling</h2>
            <a routerLink="/admin/analytics" class="text-caption font-semibold text-clay-700 hover:underline"
              >Analytics</a
            >
          </div>
          <ul class="divide-y divide-ink-200">
            @for (item of topSelling(); track item.menuItemId; let i = $index) {
              <li class="flex items-center gap-4 px-6 py-3">
                <span class="w-5 shrink-0 font-display text-lg text-ink-300">{{ i + 1 }}</span>
                <span class="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-ink-200">
                  <app-image [src]="item.image" [alt]="item.name" sizes="40px" class="h-full w-full" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium text-ink-900">{{ item.name }}</span>
                  <span class="block text-caption text-ink-500">{{ item.categoryName }}</span>
                </span>
                <span class="shrink-0 text-right">
                  <span class="block text-sm font-semibold text-clay-700">{{
                    item.revenue | pkr: { compact: true }
                  }}</span>
                  <span class="block text-caption text-ink-400">{{ item.quantitySold }} sold</span>
                </span>
              </li>
            }
          </ul>
        </section>

        <!-- Today's bookings -->
        <section class="panel overflow-hidden">
          <div class="flex items-center justify-between border-b border-ink-200 px-6 py-4">
            <h2 class="font-display text-xl">Today's bookings</h2>
            <a
              routerLink="/admin/reservations"
              class="text-caption font-semibold text-clay-700 hover:underline"
              >All</a
            >
          </div>
          @if (todayReservations().length) {
            <ul class="max-h-96 divide-y divide-ink-200 overflow-y-auto">
              @for (r of todayReservations(); track r.id) {
                <li class="flex items-center gap-3 px-6 py-3.5">
                  <span
                    class="w-14 shrink-0 text-caption font-bold text-clay-700 tabular-nums"
                    >{{ r.time | clock12 }}</span
                  >
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-medium text-ink-900">{{
                      r.customerName
                    }}</span>
                    <span class="block text-caption text-ink-500"
                      >{{ r.guests }} guests &middot; {{ r.zone.replace('-', ' ') }}</span
                    >
                  </span>
                  <app-status-pill [tone]="reservationTone(r)">{{ reservationLabel(r) }}</app-status-pill>
                </li>
              }
            </ul>
          } @else {
            <app-empty-state icon="calendar" title="No bookings today" message="Walk-ins only." />
          }
        </section>
      </div>
    } @else {
      <div class="mt-7 space-y-4">
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          @for (n of [1, 2, 3, 4]; track n) {
            <app-skeleton height="7rem" rounded="rounded-2xl" />
          }
        </div>
        <app-skeleton height="22rem" rounded="rounded-2xl" />
        <app-skeleton height="18rem" rounded="rounded-2xl" />
      </div>
    }
  `,
})
export class DashboardPage {
  private readonly admin = inject(AdminService);
  private readonly orders = inject(OrderService);
  private readonly reservations = inject(ReservationService);
  private readonly seo = inject(SeoService);

  protected readonly range = signal<'week' | 'month' | 'year'>('week');
  protected readonly ranges = [
    { value: 'week' as const, label: '7 days' },
    { value: 'month' as const, label: '30 days' },
    { value: 'year' as const, label: '12 months' },
  ];

  /**
   * One `forkJoin` rather than five independent requests, so the dashboard
   * paints once with a consistent snapshot instead of rearranging five times.
   * No `initialValue`, so `undefined` means "still loading".
   */
  protected readonly data = toSignal<DashboardData>(
    forkJoin({
      stats: this.admin.dashboardStats().pipe(catchError(() => of(null))),
      analytics: this.admin.analytics().pipe(catchError(() => of(null))),
      orders: this.orders.all().pipe(catchError(() => of([] as Order[]))),
      reservations: this.reservations.all().pipe(catchError(() => of([] as Reservation[]))),
      alerts: this.admin.stockAlerts().pipe(catchError(() => of([] as StockAlert[]))),
    }),
  );

  private readonly todayIso = new Date().toISOString().slice(0, 10);

  protected readonly liveOrders = computed(() =>
    (this.data()?.orders ?? [])
      .filter((o) => ['pending', 'accepted', 'preparing', 'ready', 'out-for-delivery'].includes(o.status))
      .slice(0, 8),
  );

  protected readonly todayReservations = computed(() =>
    (this.data()?.reservations ?? [])
      .filter((r) => r.date === this.todayIso)
      .sort((a, b) => a.time.localeCompare(b.time)),
  );

  protected readonly topSelling = computed(() => this.data()?.analytics?.topSelling.slice(0, 8) ?? []);

  protected readonly revenueLabel = computed(() => {
    const value = this.data()?.stats?.todayRevenue ?? 0;
    return `Rs ${value.toLocaleString('en-PK')}`;
  });

  protected readonly avgLabel = computed(() => {
    const value = this.data()?.stats?.averageOrderValue ?? 0;
    return `Rs ${value.toLocaleString('en-PK')}`;
  });

  protected readonly secondary = computed(() => {
    const stats = this.data()?.stats;
    return [
      {
        icon: 'clock',
        label: 'Awaiting confirmation',
        value: stats?.pendingOrders ?? 0,
        link: '/admin/orders',
        tone: 'border border-amber-500/30 bg-amber-50 text-amber-700',
      },
      {
        icon: 'flame',
        label: 'In the kitchen now',
        value: stats?.activeKitchenTickets ?? 0,
        link: '/admin/kitchen-queue',
        tone: 'border border-turmeric-500/30 bg-turmeric-300/20 text-turmeric-600',
      },
      {
        icon: 'box',
        label: 'Items below reorder',
        value: stats?.lowStockCount ?? 0,
        link: '/admin/inventory',
        tone: 'border border-red-500/25 bg-red-50 text-red-700',
      },
      {
        icon: 'users',
        label: 'New customers this week',
        value: stats?.newCustomers ?? 0,
        link: '/admin/customers',
        tone: 'border border-basil-600/25 bg-basil-50 text-basil-700',
      },
    ];
  });

  protected readonly rangeLabel = computed(
    () =>
      ({
        week: 'Last seven days',
        month: 'Last thirty days',
        year: 'Last twelve months',
      })[this.range()],
  );

  private readonly points = computed(() => {
    const analytics = this.data()?.analytics;
    if (!analytics) return [];
    return {
      week: analytics.revenueWeek,
      month: analytics.revenueMonth,
      year: analytics.revenueYear,
    }[this.range()];
  });

  protected readonly revenueLabels = computed(() => this.points().map((p) => p.label));
  protected readonly revenueSeries = computed(() => [
    { label: 'Revenue', data: this.points().map((p) => p.value) },
  ]);

  protected readonly hourLabels = computed(
    () => this.data()?.analytics?.hourlyLoad.map((p) => p.hour) ?? [],
  );
  protected readonly hourSeries = computed(() => [
    { label: 'Orders', data: this.data()?.analytics?.hourlyLoad.map((p) => p.orders) ?? [] },
  ]);

  constructor() {
    this.seo.apply({
      title: 'Dashboard | Salateen Admin',
      description: 'Restaurant operations dashboard.',
      path: 'admin',
      noIndex: true,
    });
  }

  protected statusLabel(order: Order): string {
    return ORDER_STATUS_META[order.status].label;
  }
  protected statusTone(order: Order): string {
    return ORDER_STATUS_META[order.status].tone;
  }
  protected reservationLabel(r: Reservation): string {
    return RESERVATION_STATUS_META[r.status].label;
  }
  protected reservationTone(r: Reservation): string {
    return RESERVATION_STATUS_META[r.status].tone;
  }
  protected alertTone(alert: StockAlert): string {
    return {
      critical: 'border border-red-500/25 bg-red-50 text-red-700',
      low: 'border border-amber-500/30 bg-amber-50 text-amber-700',
      expiring: 'border border-turmeric-500/30 bg-turmeric-300/20 text-turmeric-600',
      healthy: 'border border-emerald-600/25 bg-emerald-50 text-emerald-700',
    }[alert.severity];
  }
}
