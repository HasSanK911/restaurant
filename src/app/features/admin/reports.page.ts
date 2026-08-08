import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';
import { Order } from '../../core/models/order.model';
import { Reservation } from '../../core/models/reservation.model';
import { InventoryLog } from '../../core/models/inventory.model';
import { AdminService } from '../../core/services/admin.service';
import { OrderService } from '../../core/services/order.service';
import { ReservationService } from '../../core/services/reservation.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { CurrencyPkrPipe } from '../../shared/pipes/currency-pkr.pipe';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { StatCardComponent } from '../../shared/components/ui/display.components';
import { SkeletonComponent } from '../../shared/components/ui/feedback.components';
import { AdminHeaderComponent, AdminTableComponent } from './shared/admin-ui.components';

type Range = '7' | '30' | '90' | '365';

interface ReportData {
  orders: Order[];
  reservations: Reservation[];
  logs: InventoryLog[];
}

/**
 * Operational reports with CSV export.
 *
 * Everything is computed in the browser from the same data the rest of the
 * panel uses, so the numbers cannot disagree with the dashboard. In Laravel
 * these become database aggregates behind `/reports/*` endpoints.
 */
@Component({
  selector: 'app-reports-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IconComponent,
    StatCardComponent,
    SkeletonComponent,
    AdminHeaderComponent,
    AdminTableComponent,
    CurrencyPkrPipe,
  ],
  template: `
    <app-admin-header
      eyebrow="Insight"
      title="Reports"
      description="Sales, fulfilment, bookings and stock movement for a chosen period."
    >
      <label class="sr-only" for="range">Reporting period</label>
      <select id="range" class="field h-11 w-auto py-0" [(ngModel)]="range">
        <option value="7">Last 7 days</option>
        <option value="30">Last 30 days</option>
        <option value="90">Last 90 days</option>
        <option value="365">Last 12 months</option>
      </select>
      <button type="button" class="btn btn-secondary btn-md" (click)="exportCsv()">
        <app-icon name="download" [size]="15" />
        Export CSV
      </button>
    </app-admin-header>

    @if (data(); as d) {
      <!-- Sales summary -->
      <div class="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <app-stat-card label="Orders" [value]="orders().length" icon="bag" [hint]="rangeLabel()" />
        <app-stat-card label="Revenue" [value]="revenue()" icon="wallet" [hint]="rangeLabel()" />
        <app-stat-card label="Average order" [value]="averageOrder()" icon="chart" hint="Excluding cancellations" />
        <app-stat-card
          label="Cancellation rate"
          [value]="cancellationRate()"
          icon="x-circle"
          [hint]="cancelledCount() + ' cancelled'"
        />
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-2">
        <!-- Fulfilment breakdown -->
        <section class="panel overflow-hidden">
          <h2 class="border-b border-ink-200 px-6 py-4 font-display text-xl">Sales by fulfilment</h2>
          <app-admin-table>
            <thead>
              <tr>
                <th>Type</th>
                <th class="text-right">Orders</th>
                <th class="text-right">Revenue</th>
                <th class="text-right">Average</th>
              </tr>
            </thead>
            <tbody>
              @for (row of fulfilmentRows(); track row.label) {
                <tr>
                  <td class="font-medium text-ink-900">{{ row.label }}</td>
                  <td class="text-right tabular-nums">{{ row.count }}</td>
                  <td class="text-right font-semibold text-clay-700 tabular-nums">
                    {{ row.revenue | pkr }}
                  </td>
                  <td class="text-right tabular-nums">{{ row.average | pkr }}</td>
                </tr>
              }
            </tbody>
          </app-admin-table>
        </section>

        <!-- Reservations -->
        <section class="panel overflow-hidden">
          <h2 class="border-b border-ink-200 px-6 py-4 font-display text-xl">Reservations</h2>
          <app-admin-table>
            <thead>
              <tr>
                <th>Status</th>
                <th class="text-right">Bookings</th>
                <th class="text-right">Covers</th>
              </tr>
            </thead>
            <tbody>
              @for (row of reservationRows(); track row.label) {
                <tr>
                  <td class="font-medium text-ink-900">{{ row.label }}</td>
                  <td class="text-right tabular-nums">{{ row.count }}</td>
                  <td class="text-right tabular-nums">{{ row.covers }}</td>
                </tr>
              }
            </tbody>
          </app-admin-table>
        </section>
      </div>

      <!-- Top dishes -->
      <section class="panel mt-6 overflow-hidden">
        <h2 class="border-b border-ink-200 px-6 py-4 font-display text-xl">
          Dishes sold in this period
        </h2>
        <app-admin-table>
          <thead>
            <tr>
              <th>Dish</th>
              <th class="text-right">Quantity</th>
              <th class="text-right">Revenue</th>
              <th class="text-right">Share</th>
            </tr>
          </thead>
          <tbody>
            @for (row of dishRows(); track row.name) {
              <tr>
                <td class="font-medium text-ink-900">{{ row.name }}</td>
                <td class="text-right tabular-nums">{{ row.quantity }}</td>
                <td class="text-right font-semibold text-clay-700 tabular-nums">
                  {{ row.revenue | pkr }}
                </td>
                <td class="text-right tabular-nums text-ink-500">{{ row.share }}%</td>
              </tr>
            }
          </tbody>
        </app-admin-table>
      </section>

      <!-- Stock movement -->
      <section class="panel mt-6 overflow-hidden">
        <h2 class="border-b border-ink-200 px-6 py-4 font-display text-xl">Stock movement</h2>
        <app-admin-table>
          <thead>
            <tr>
              <th>Movement</th>
              <th class="text-right">Entries</th>
              <th class="text-right">Purchase cost</th>
            </tr>
          </thead>
          <tbody>
            @for (row of movementRows(); track row.label) {
              <tr>
                <td class="font-medium text-ink-900">{{ row.label }}</td>
                <td class="text-right tabular-nums">{{ row.count }}</td>
                <td class="text-right tabular-nums">
                  {{ row.cost > 0 ? (row.cost | pkr) : '--' }}
                </td>
              </tr>
            }
          </tbody>
        </app-admin-table>
      </section>

      <p class="mt-6 flex items-start gap-2 text-caption leading-relaxed text-ink-500">
        <app-icon name="info" [size]="13" class="mt-0.5 shrink-0" />
        Figures are computed in the browser from the same records the rest of the panel reads, so
        they always agree with the dashboard. With the Laravel API these become database aggregates
        and will handle far larger date ranges.
      </p>
    } @else {
      <div class="mt-7 space-y-4">
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          @for (n of [1, 2, 3, 4]; track n) {
            <app-skeleton height="7rem" rounded="rounded-2xl" />
          }
        </div>
        <app-skeleton height="18rem" rounded="rounded-2xl" />
      </div>
    }
  `,
})
export class ReportsPage {
  private readonly orderService = inject(OrderService);
  private readonly reservationService = inject(ReservationService);
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  protected readonly range = signal<Range>('30');

  protected readonly data = toSignal<ReportData>(
    forkJoin({
      orders: this.orderService.all().pipe(catchError(() => of([] as Order[]))),
      reservations: this.reservationService.all().pipe(catchError(() => of([] as Reservation[]))),
      logs: this.admin.inventoryLogs().pipe(catchError(() => of([] as InventoryLog[]))),
    }),
  );

  private readonly since = computed(() => Date.now() - Number(this.range()) * 864e5);

  protected readonly rangeLabel = computed(
    () =>
      ({ '7': 'Last 7 days', '30': 'Last 30 days', '90': 'Last 90 days', '365': 'Last 12 months' })[
        this.range()
      ],
  );

  protected readonly orders = computed(() =>
    (this.data()?.orders ?? []).filter((o) => new Date(o.createdAt).getTime() >= this.since()),
  );

  private readonly completed = computed(() =>
    this.orders().filter((o) => o.status !== 'cancelled'),
  );

  protected readonly cancelledCount = computed(
    () => this.orders().filter((o) => o.status === 'cancelled').length,
  );

  private readonly revenueValue = computed(() =>
    this.completed().reduce((sum, o) => sum + o.grandTotal, 0),
  );

  protected readonly revenue = computed(
    () => `Rs ${Math.round(this.revenueValue()).toLocaleString('en-PK')}`,
  );

  protected readonly averageOrder = computed(() => {
    const count = this.completed().length;
    return count ? `Rs ${Math.round(this.revenueValue() / count).toLocaleString('en-PK')}` : 'Rs 0';
  });

  protected readonly cancellationRate = computed(() => {
    const total = this.orders().length;
    return total ? `${Math.round((this.cancelledCount() / total) * 100)}%` : '0%';
  });

  protected readonly fulfilmentRows = computed(() =>
    (['delivery', 'dine-in'] as const).map((type) => {
      const rows = this.completed().filter((o) => o.fulfilment === type);
      const revenue = rows.reduce((sum, o) => sum + o.grandTotal, 0);
      return {
        label: type === 'delivery' ? 'Home delivery' : 'Dine in / collection',
        count: rows.length,
        revenue,
        average: rows.length ? Math.round(revenue / rows.length) : 0,
      };
    }),
  );

  protected readonly reservationRows = computed(() => {
    const rows = (this.data()?.reservations ?? []).filter(
      (r) => new Date(r.createdAt).getTime() >= this.since(),
    );
    const statuses = ['confirmed', 'completed', 'seated', 'pending', 'cancelled', 'no-show', 'rejected'];
    return statuses
      .map((status) => {
        const matching = rows.filter((r) => r.status === status);
        return {
          label: status.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          count: matching.length,
          covers: matching.reduce((sum, r) => sum + r.guests, 0),
        };
      })
      .filter((row) => row.count > 0);
  });

  protected readonly dishRows = computed(() => {
    const tally = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const order of this.completed()) {
      for (const line of order.items) {
        const existing = tally.get(line.slug);
        if (existing) {
          existing.quantity += line.quantity;
          existing.revenue += line.lineTotal;
        } else {
          tally.set(line.slug, {
            name: line.name,
            quantity: line.quantity,
            revenue: line.lineTotal,
          });
        }
      }
    }
    const total = [...tally.values()].reduce((sum, r) => sum + r.revenue, 0) || 1;
    return [...tally.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15)
      .map((row) => ({ ...row, share: Math.round((row.revenue / total) * 1000) / 10 }));
  });

  protected readonly movementRows = computed(() => {
    const rows = (this.data()?.logs ?? []).filter(
      (l) => new Date(l.createdAt).getTime() >= this.since(),
    );
    const kinds = ['purchase', 'kitchen-consumption', 'wastage', 'return', 'adjustment'];
    return kinds
      .map((kind) => {
        const matching = rows.filter((l) => l.movement === kind);
        return {
          label: kind.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          count: matching.length,
          cost: matching.reduce((sum, l) => sum + (l.totalCost ?? 0), 0),
        };
      })
      .filter((row) => row.count > 0);
  });

  constructor() {
    this.seo.apply({ title: 'Reports | Salateen Admin', description: '', path: 'admin/reports', noIndex: true });
  }

  /** Builds a CSV of the sales lines and triggers a download. */
  protected exportCsv(): void {
    if (typeof document === 'undefined') return;

    const header = [
      'Reference',
      'Placed',
      'Customer',
      'Phone',
      'Fulfilment',
      'Status',
      'Items',
      'Subtotal',
      'Discount',
      'Delivery',
      'Total',
    ];

    const rows = this.orders().map((order) => [
      order.reference,
      new Date(order.createdAt).toISOString(),
      order.customerName,
      order.customerPhone,
      order.fulfilment,
      order.status,
      String(order.items.length),
      String(order.subtotal),
      String(order.discount),
      String(order.deliveryFee),
      String(order.grandTotal),
    ]);

    // Quote every field and double any embedded quotes, so commas in names
    // cannot break the column alignment.
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `salateen-sales-${this.range()}d-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    this.toast.success('Export ready', `${rows.length} orders written to CSV.`);
  }
}
