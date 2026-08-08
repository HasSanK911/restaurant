import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { ORDER_STATUS_META } from '../../core/constants/app.constants';
import { Order, OrderStatus } from '../../core/models/order.model';
import { AuthService } from '../../core/services/auth.service';
import { OrderService, nextStatus } from '../../core/services/order.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { CurrencyPkrPipe } from '../../shared/pipes/currency-pkr.pipe';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { EmptyStateComponent } from '../../shared/components/ui/feedback.components';
import { AdminHeaderComponent } from './shared/admin-ui.components';

/**
 * Kanban board for the pass.
 *
 * Four columns matching the kitchen flow, each ticket showing how long it has
 * been waiting. Polls every fifteen seconds; a real backend would push this
 * over a websocket instead (see BACKEND_PLAN.md, "Broadcasting").
 */
@Component({
  selector: 'app-kitchen-queue-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IconComponent,
    EmptyStateComponent,
    AdminHeaderComponent,
    CurrencyPkrPipe,
  ],
  template: `
    <app-admin-header
      eyebrow="Operations"
      title="Kitchen queue"
      description="Live tickets, oldest first. Tap a ticket to move it along."
    >
      <a routerLink="/kitchen" class="btn btn-secondary btn-md">
        <app-icon name="external-link" [size]="15" />
        Full-screen display
      </a>
    </app-admin-header>

    <!-- Column board -->
    <div class="mt-7 grid gap-4 lg:grid-cols-4">
      @for (column of columns(); track column.status) {
        <section class="flex flex-col rounded-2xl border border-ink-200 bg-white">
          <header class="flex items-center justify-between border-b border-ink-200 px-4 py-3">
            <div class="flex items-center gap-2.5">
              <span
                class="flex h-7 w-7 items-center justify-center rounded-lg"
                [class]="columnTone(column.status)"
              >
                <app-icon [name]="$any(meta(column.status).icon)" [size]="14" />
              </span>
              <h2 class="text-sm font-bold text-ink-900">{{ meta(column.status).label }}</h2>
            </div>
            <span class="rounded-full bg-ink-100 px-2 py-0.5 text-caption font-bold text-ink-600">{{
              column.orders.length
            }}</span>
          </header>

          <div class="min-h-32 flex-1 space-y-3 p-3">
            @for (order of column.orders; track order.id) {
              <article
                class="rounded-xl border p-3.5 transition-colors"
                [class]="ticketTone(order)"
              >
                <div class="flex items-start justify-between gap-2">
                  <a
                    [routerLink]="['/admin/orders', order.id]"
                    class="font-display text-lg text-ink-900 hover:text-clay-700"
                    >{{ order.reference }}</a
                  >
                  <span
                    class="shrink-0 text-caption font-bold tabular-nums"
                    [class]="waitClass(order)"
                    >{{ waitLabel(order) }}</span
                  >
                </div>

                <p class="mt-0.5 truncate text-caption text-ink-500">
                  {{ order.customerName }} &middot;
                  {{ order.fulfilment === 'delivery' ? 'Delivery' : 'Dine-in' }}
                </p>

                <ul class="mt-2.5 space-y-1">
                  @for (line of order.items; track line.slug + line.variantLabel) {
                    <li class="flex items-start gap-2 text-caption">
                      <span class="shrink-0 font-bold text-clay-700">{{ line.quantity }}&times;</span>
                      <span class="min-w-0">
                        <span class="block truncate text-ink-800">{{ line.name }}</span>
                        <span class="block text-ink-400">{{ line.variantLabel }}</span>
                        @if (line.note) {
                          <span class="mt-0.5 block font-semibold text-turmeric-600"
                            >! {{ line.note }}</span
                          >
                        }
                      </span>
                    </li>
                  }
                </ul>

                @if (order.note) {
                  <p
                    class="mt-2 rounded-lg border border-turmeric-500/30 bg-turmeric-300/15 px-2 py-1.5 text-caption font-medium text-turmeric-600"
                  >
                    {{ order.note }}
                  </p>
                }

                <div class="mt-3 flex items-center justify-between gap-2 border-t border-ink-200 pt-2.5">
                  <span class="text-caption font-semibold text-clay-700">{{
                    order.grandTotal | pkr
                  }}</span>
                  @if (next(order); as target) {
                    <button
                      type="button"
                      class="btn btn-primary btn-sm"
                      [disabled]="busyId() === order.id"
                      (click)="advance(order, target)"
                    >
                      {{ shortLabel(target) }}
                      <app-icon name="chevron-right" [size]="11" />
                    </button>
                  }
                </div>
              </article>
            } @empty {
              <p class="py-8 text-center text-caption text-ink-400">Nothing here</p>
            }
          </div>
        </section>
      }
    </div>

    @if (total() === 0) {
      <app-empty-state
        class="mt-6"
        icon="check-circle"
        title="The pass is clear"
        message="No tickets waiting. Every order has left the kitchen."
      />
    }

    <p class="mt-6 flex items-center gap-2 text-caption text-ink-500">
      <app-icon name="refresh" [size]="13" />
      Refreshing every fifteen seconds. Last updated {{ lastUpdated() }}.
    </p>
  `,
})
export class KitchenQueuePage implements OnDestroy {
  private readonly orderService = inject(OrderService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  protected readonly busyId = signal<string | null>(null);
  private readonly reload = signal(0);
  private readonly tick = signal(Date.now());
  private timer?: ReturnType<typeof setInterval>;

  private readonly orders = toSignal(
    toObservable(this.reload).pipe(switchMap(() => this.orderService.kitchenQueue())),
    { initialValue: [] as Order[] },
  );

  private readonly boardStatuses: OrderStatus[] = ['pending', 'accepted', 'preparing', 'ready'];

  protected readonly columns = computed(() =>
    this.boardStatuses.map((status) => ({
      status,
      orders: this.orders()
        .filter((o) => o.status === status)
        .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)),
    })),
  );

  protected readonly total = computed(() => this.orders().length);

  protected readonly lastUpdated = computed(() => {
    this.tick();
    return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  });

  constructor() {
    this.seo.apply({
      title: 'Kitchen Queue | Salateen Admin',
      description: 'Live kitchen ticket board.',
      path: 'admin/kitchen-queue',
      noIndex: true,
    });

    if (typeof window !== 'undefined') {
      this.timer = setInterval(() => {
        this.reload.update((n) => n + 1);
        this.tick.set(Date.now());
      }, 15_000);
    }
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  protected meta(status: OrderStatus) {
    return ORDER_STATUS_META[status];
  }

  protected shortLabel(status: OrderStatus): string {
    return { accepted: 'Accept', preparing: 'Start', ready: 'Ready', 'out-for-delivery': 'Send', delivered: 'Done' }[
      status as string
    ] ?? ORDER_STATUS_META[status].label;
  }

  protected next(order: Order): OrderStatus | null {
    return nextStatus(order.status, order.fulfilment === 'delivery');
  }

  protected columnTone(status: OrderStatus): string {
    return {
      pending: 'border border-amber-500/30 bg-amber-50 text-amber-700',
      accepted: 'border border-basil-600/25 bg-basil-50 text-basil-700',
      preparing: 'border border-turmeric-500/30 bg-turmeric-300/20 text-turmeric-600',
      ready: 'border border-clay-600/25 bg-clay-50 text-clay-700',
    }[status as string] ?? 'border border-ink-200 bg-ink-100 text-ink-600';
  }

  /** Tickets waiting longer than twenty minutes go red, so the pass sees them. */
  protected ticketTone(order: Order): string {
    const minutes = this.waitMinutes(order);
    if (minutes >= 30) return 'border-red-500/40 bg-red-50';
    if (minutes >= 20) return 'border-amber-500/40 bg-amber-50';
    return 'border-ink-200 bg-white hover:border-clay-500/35';
  }

  protected waitClass(order: Order): string {
    const minutes = this.waitMinutes(order);
    if (minutes >= 30) return 'text-red-600';
    if (minutes >= 20) return 'text-amber-700';
    return 'text-ink-400';
  }

  protected waitLabel(order: Order): string {
    const minutes = this.waitMinutes(order);
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  private waitMinutes(order: Order): number {
    this.tick();
    return Math.max(0, Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60_000));
  }

  protected advance(order: Order, target: OrderStatus): void {
    this.busyId.set(order.id);
    this.orderService.updateStatus(order.id, target, undefined, this.auth.user()?.name).subscribe({
      next: () => {
        this.busyId.set(null);
        this.reload.update((n) => n + 1);
        this.toast.success(`${order.reference}: ${ORDER_STATUS_META[target].label}`);
      },
      error: () => {
        this.busyId.set(null);
        this.toast.error('That did not update');
      },
    });
  }
}
