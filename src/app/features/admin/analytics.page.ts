import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { AnalyticsSnapshot } from '../../core/models/analytics.model';
import { AdminService } from '../../core/services/admin.service';
import { SeoService } from '../../core/services/seo.service';
import { CurrencyPkrPipe } from '../../shared/pipes/currency-pkr.pipe';
import { ImageComponent } from '../../shared/components/ui/image.component';
import { StatCardComponent } from '../../shared/components/ui/display.components';
import { ChartComponent } from '../../shared/components/ui/chart.component';
import { SkeletonComponent } from '../../shared/components/ui/feedback.components';
import { AdminHeaderComponent } from './shared/admin-ui.components';

@Component({
  selector: 'app-analytics-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ImageComponent,
    StatCardComponent,
    ChartComponent,
    SkeletonComponent,
    AdminHeaderComponent,
    CurrencyPkrPipe,
  ],
  template: `
    <app-admin-header
      eyebrow="Insight"
      title="Analytics"
      description="Where the revenue comes from, what sells, and when the kitchen is under pressure."
    />

    @if (data(); as a) {
      <!-- Headline numbers -->
      <div class="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <app-stat-card label="Twelve-month revenue" [value]="yearTotal()" icon="wallet" hint="All fulfilment types" />
        <app-stat-card label="Best month" [value]="bestMonth()" icon="trending-up" [hint]="bestMonthValue()" />
        <app-stat-card label="Busiest hour" [value]="peakHour()" icon="clock" [hint]="peakHourValue()" />
        <app-stat-card
          label="Delivery share"
          [value]="deliveryShare()"
          icon="bike"
          hint="Of all orders placed"
        />
      </div>

      <!-- Revenue by month -->
      <section class="panel mt-6 p-6">
        <h2 class="font-display text-xl">Revenue by month</h2>
        <p class="mt-0.5 text-caption text-ink-500">
          Ramadan, Eid and the winter wedding season are visible in the curve.
        </p>
        <app-chart
          class="mt-5"
          type="bar"
          [labels]="monthLabels()"
          [series]="monthSeries()"
          [height]="300"
          [currency]="true"
          ariaLabel="Revenue by month"
        />
      </section>

      <div class="mt-6 grid gap-6 lg:grid-cols-2">
        <!-- Category share -->
        <section class="panel p-6">
          <h2 class="font-display text-xl">Revenue by section</h2>
          <div class="mt-5 grid gap-6 sm:grid-cols-2 sm:items-center">
            <app-chart
              type="doughnut"
              [labels]="categoryLabels()"
              [series]="categorySeries()"
              [height]="220"
              ariaLabel="Revenue share by menu section"
            />
            <ul class="space-y-2">
              @for (row of topCategories(); track row.categoryId) {
                <li class="flex items-center justify-between gap-3 text-sm">
                  <span class="min-w-0 truncate text-ink-700">{{ row.name }}</span>
                  <span class="shrink-0 font-semibold text-clay-700">{{ row.sharePercent }}%</span>
                </li>
              }
            </ul>
          </div>
        </section>

        <!-- Customer growth -->
        <section class="panel p-6">
          <h2 class="font-display text-xl">Customer growth</h2>
          <p class="mt-0.5 text-caption text-ink-500">New against returning, by month</p>
          <app-chart
            class="mt-5"
            type="line"
            [labels]="growthLabels()"
            [series]="growthSeries()"
            [height]="240"
            [showLegend]="true"
            ariaLabel="New and returning customers by month"
          />
        </section>
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-3">
        <!-- Top selling -->
        <section class="panel overflow-hidden lg:col-span-2">
          <h2 class="border-b border-ink-200 px-6 py-4 font-display text-xl">Top selling dishes</h2>
          <ul class="divide-y divide-ink-200">
            @for (item of a.topSelling; track item.menuItemId; let i = $index) {
              <li class="flex items-center gap-4 px-6 py-3.5">
                <span class="w-5 shrink-0 font-display text-lg text-ink-300">{{ i + 1 }}</span>
                <span class="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-ink-200">
                  <app-image [src]="item.image" [alt]="item.name" sizes="44px" class="h-full w-full" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-medium text-ink-900">{{ item.name }}</span>
                  <span class="block text-caption text-ink-500">{{ item.categoryName }}</span>
                </span>
                <span class="w-32 shrink-0">
                  <span class="block h-1.5 overflow-hidden rounded-full bg-ink-200">
                    <span
                      class="block h-full rounded-full bg-gradient-to-r from-clay-400 to-clay-600"
                      [style.width.%]="barWidth(item.revenue)"
                    ></span>
                  </span>
                </span>
                <span class="shrink-0 text-right">
                  <span class="block font-semibold text-clay-700">{{
                    item.revenue | pkr: { compact: true }
                  }}</span>
                  <span class="block text-caption text-ink-400">{{ item.quantitySold }} sold</span>
                </span>
              </li>
            }
          </ul>
        </section>

        <!-- Fulfilment -->
        <section class="panel p-6">
          <h2 class="font-display text-xl">Delivery vs dine-in</h2>
          <app-chart
            class="mt-5"
            type="doughnut"
            [labels]="fulfilmentLabels()"
            [series]="fulfilmentSeries()"
            [height]="200"
            [showLegend]="true"
            ariaLabel="Delivery against dine-in orders"
          />
          <dl class="mt-5 space-y-2 border-t border-ink-200 pt-5 text-sm">
            @for (row of a.fulfilmentSplit; track row.label) {
              <div class="flex justify-between gap-3">
                <dt class="text-ink-500">{{ row.label }}</dt>
                <dd class="font-semibold text-ink-900">{{ row.value }} orders</dd>
              </div>
            }
          </dl>
        </section>
      </div>

      <!-- Hourly -->
      <section class="panel mt-6 p-6">
        <h2 class="font-display text-xl">Orders by hour</h2>
        <p class="mt-0.5 text-caption text-ink-500">
          Staffing follows this curve: a light lunch peak and a much heavier dinner service.
        </p>
        <app-chart
          class="mt-5"
          type="bar"
          [labels]="hourLabels()"
          [series]="hourSeries()"
          [height]="260"
          ariaLabel="Orders by hour of day"
        />
      </section>
    } @else {
      <div class="mt-7 space-y-4">
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          @for (n of [1, 2, 3, 4]; track n) {
            <app-skeleton height="7rem" rounded="rounded-2xl" />
          }
        </div>
        <app-skeleton height="20rem" rounded="rounded-2xl" />
        <app-skeleton height="20rem" rounded="rounded-2xl" />
      </div>
    }
  `,
})
export class AnalyticsPage {
  private readonly admin = inject(AdminService);
  private readonly seo = inject(SeoService);

  protected readonly data = toSignal<AnalyticsSnapshot>(
    this.admin.analytics().pipe(catchError(() => of(undefined as unknown as AnalyticsSnapshot))),
  );

  protected readonly monthLabels = computed(() => this.data()?.revenueYear.map((p) => p.label) ?? []);
  protected readonly monthSeries = computed(() => [
    { label: 'Revenue', data: this.data()?.revenueYear.map((p) => p.value) ?? [] },
  ]);

  protected readonly categoryLabels = computed(
    () => this.data()?.categoryShare.slice(0, 7).map((c) => c.name) ?? [],
  );
  protected readonly categorySeries = computed(() => [
    { label: 'Revenue', data: this.data()?.categoryShare.slice(0, 7).map((c) => c.revenue) ?? [] },
  ]);
  protected readonly topCategories = computed(() => this.data()?.categoryShare.slice(0, 7) ?? []);

  protected readonly growthLabels = computed(
    () => this.data()?.customerGrowth.map((p) => p.month) ?? [],
  );
  protected readonly growthSeries = computed(() => [
    { label: 'New', data: this.data()?.customerGrowth.map((p) => p.newCustomers) ?? [] },
    { label: 'Returning', data: this.data()?.customerGrowth.map((p) => p.returningCustomers) ?? [] },
  ]);

  protected readonly hourLabels = computed(() => this.data()?.hourlyLoad.map((p) => p.hour) ?? []);
  protected readonly hourSeries = computed(() => [
    { label: 'Orders', data: this.data()?.hourlyLoad.map((p) => p.orders) ?? [] },
  ]);

  protected readonly fulfilmentLabels = computed(
    () => this.data()?.fulfilmentSplit.map((f) => f.label) ?? [],
  );
  protected readonly fulfilmentSeries = computed(() => [
    { label: 'Orders', data: this.data()?.fulfilmentSplit.map((f) => f.value) ?? [] },
  ]);

  protected readonly yearTotal = computed(() => {
    const total = (this.data()?.revenueYear ?? []).reduce((sum, p) => sum + p.value, 0);
    return `Rs ${(total / 1e6).toFixed(1)}M`;
  });

  private readonly best = computed(() =>
    [...(this.data()?.revenueYear ?? [])].sort((a, b) => b.value - a.value)[0],
  );
  protected readonly bestMonth = computed(() => this.best()?.label ?? '--');
  protected readonly bestMonthValue = computed(() =>
    this.best() ? `Rs ${(this.best().value / 1e6).toFixed(2)}M` : '',
  );

  private readonly peak = computed(() =>
    [...(this.data()?.hourlyLoad ?? [])].sort((a, b) => b.orders - a.orders)[0],
  );
  protected readonly peakHour = computed(() => this.peak()?.hour ?? '--');
  protected readonly peakHourValue = computed(() =>
    this.peak() ? `${this.peak().orders} orders in that hour` : '',
  );

  protected readonly deliveryShare = computed(() => {
    const split = this.data()?.fulfilmentSplit ?? [];
    const total = split.reduce((sum, s) => sum + s.value, 0);
    const delivery = split.find((s) => s.label === 'Delivery')?.value ?? 0;
    return total ? `${Math.round((delivery / total) * 100)}%` : '--';
  });

  private readonly maxRevenue = computed(() =>
    Math.max(1, ...(this.data()?.topSelling ?? []).map((i) => i.revenue)),
  );

  constructor() {
    this.seo.apply({
      title: 'Analytics | Salateen Admin',
      description: '',
      path: 'admin/analytics',
      noIndex: true,
    });
  }

  protected barWidth(revenue: number): number {
    return Math.round((revenue / this.maxRevenue()) * 100);
  }
}
