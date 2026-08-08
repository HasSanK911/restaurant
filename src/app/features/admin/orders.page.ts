import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { ORDER_STATUS_META } from '../../core/constants/app.constants';
import { Order, OrderStatus } from '../../core/models/order.model';
import { AuthService } from '../../core/services/auth.service';
import { OrderService, nextStatus } from '../../core/services/order.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { CurrencyPkrPipe } from '../../shared/pipes/currency-pkr.pipe';
import { NiceDatePipe } from '../../shared/pipes/format.pipes';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { EmptyStateComponent, SkeletonComponent } from '../../shared/components/ui/feedback.components';
import { PaginationComponent, TabsComponent } from '../../shared/components/ui/navigation.components';
import { ConfirmDialogComponent } from '../../shared/components/ui/overlay.components';
import {
  AdminHeaderComponent,
  AdminTableComponent,
  AdminToolbarComponent,
  RowActionComponent,
  StatusPillComponent,
} from './shared/admin-ui.components';

const PER_PAGE = 15;

@Component({
  selector: 'app-admin-orders-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    FormsModule,
    IconComponent,
    EmptyStateComponent,
    SkeletonComponent,
    TabsComponent,
    PaginationComponent,
    ConfirmDialogComponent,
    AdminHeaderComponent,
    AdminToolbarComponent,
    AdminTableComponent,
    RowActionComponent,
    StatusPillComponent,
    CurrencyPkrPipe,
    NiceDatePipe,
    TimeAgoPipe,
  ],
  template: `
    <app-admin-header
      eyebrow="Operations"
      title="Orders"
      description="Every order, with one-tap advance through the kitchen flow."
    >
      <button type="button" class="btn btn-secondary btn-md" (click)="refresh()">
        <app-icon name="refresh" [size]="15" />
        Refresh
      </button>
    </app-admin-header>

    <app-tabs class="mt-6" [tabs]="tabs()" [(active)]="statusFilter" ariaLabel="Filter by status" />

    <app-admin-toolbar
      class="mt-5"
      [(search)]="search"
      placeholder="Search by reference, customer or phone"
      [count]="filtered().length"
    >
      <label class="sr-only" for="fulfilment">Fulfilment</label>
      <select id="fulfilment" class="field h-11 w-auto py-0 sm:w-44" [(ngModel)]="fulfilment">
        <option value="all">All fulfilment</option>
        <option value="delivery">Delivery</option>
        <option value="dine-in">Dine-in</option>
      </select>
    </app-admin-toolbar>

    @if (!loaded()) {
      <app-skeleton class="mt-5" height="28rem" rounded="rounded-2xl" />
    } @else if (!filtered().length) {
      <app-empty-state
        class="mt-5"
        icon="bag"
        title="No orders match"
        message="Try a different status or clear the search."
        actionLabel="Clear filters"
        (action)="reset()"
      />
    } @else {
      <app-admin-table class="mt-5">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Customer</th>
            <th>Items</th>
            <th>Total</th>
            <th>Type</th>
            <th>Status</th>
            <th>Placed</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (order of paged(); track order.id) {
            <tr>
              <td>
                <a
                  [routerLink]="['/admin/orders', order.id]"
                  class="font-semibold text-ink-900 hover:text-clay-700"
                  >{{ order.reference }}</a
                >
              </td>
              <td>
                <span class="block max-w-40 truncate">{{ order.customerName }}</span>
                <span class="block text-caption text-ink-400">{{ order.customerPhone }}</span>
              </td>
              <td class="text-ink-500">{{ order.items.length }}</td>
              <td class="font-semibold text-clay-700">{{ order.grandTotal | pkr }}</td>
              <td>
                <span class="text-caption text-ink-500">{{
                  order.fulfilment === 'delivery' ? 'Delivery' : 'Dine-in'
                }}</span>
              </td>
              <td>
                <app-status-pill [tone]="meta(order.status).tone">{{
                  meta(order.status).label
                }}</app-status-pill>
              </td>
              <td>
                <span class="block text-caption">{{ order.createdAt | timeAgo }}</span>
                <span class="block text-caption text-ink-400">{{ order.createdAt | niceDate }}</span>
              </td>
              <td>
                <div class="flex items-center justify-end gap-1.5">
                  @if (next(order); as target) {
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm whitespace-nowrap"
                      [disabled]="busyId() === order.id"
                      (click)="advance(order, target)"
                    >
                      {{ meta(target).label }}
                      <app-icon name="chevron-right" [size]="12" />
                    </button>
                  }
                  <app-row-action
                    icon="eye"
                    label="View order"
                    (pressed)="view(order)"
                  />
                  @if (canCancel(order)) {
                    <app-row-action
                      icon="x-circle"
                      label="Cancel order"
                      [danger]="true"
                      (pressed)="askCancel(order)"
                    />
                  }
                </div>
              </td>
            </tr>
          }
        </tbody>
      </app-admin-table>

      <app-pagination
        class="mt-6"
        [page]="page()"
        [totalPages]="totalPages()"
        (pageChange)="page.set($event)"
      />
    }

    <app-confirm-dialog
      [(open)]="confirmOpen"
      title="Cancel this order?"
      [message]="confirmMessage()"
      confirmLabel="Cancel the order"
      cancelLabel="Keep it"
      [danger]="true"
      (confirmed)="cancel()"
    />
  `,
})
export class AdminOrdersPage {
  private readonly orderService = inject(OrderService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);
  private readonly router = inject(Router);

  protected readonly search = signal('');
  protected readonly statusFilter = signal('all');
  protected readonly fulfilment = signal('all');
  protected readonly page = signal(1);
  protected readonly busyId = signal<string | null>(null);
  protected readonly confirmOpen = signal(false);
  private readonly pendingCancel = signal<Order | null>(null);
  private readonly reload = signal(0);

  protected readonly orders = toSignal(
    toObservable(this.reload).pipe(switchMap(() => this.orderService.all())),
    { initialValue: [] as Order[] },
  );
  protected readonly loaded = computed(() => this.orders().length > 0 || this.reload() > 0);

  protected readonly tabs = computed(() => {
    const all = this.orders();
    const count = (status: OrderStatus) => all.filter((o) => o.status === status).length;
    return [
      { id: 'all', label: 'All', count: all.length },
      { id: 'pending', label: 'Pending', count: count('pending') },
      { id: 'accepted', label: 'Accepted', count: count('accepted') },
      { id: 'preparing', label: 'Preparing', count: count('preparing') },
      { id: 'ready', label: 'Ready', count: count('ready') },
      { id: 'out-for-delivery', label: 'On the way', count: count('out-for-delivery') },
      { id: 'delivered', label: 'Delivered', count: count('delivered') },
      { id: 'cancelled', label: 'Cancelled', count: count('cancelled') },
    ];
  });

  protected readonly filtered = computed(() => {
    const needle = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    const fulfilment = this.fulfilment();

    return this.orders().filter((order) => {
      if (status !== 'all' && order.status !== status) return false;
      if (fulfilment !== 'all' && order.fulfilment !== fulfilment) return false;
      if (!needle) return true;
      return `${order.reference} ${order.customerName} ${order.customerPhone}`
        .toLowerCase()
        .includes(needle);
    });
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / PER_PAGE)),
  );
  protected readonly paged = computed(() => {
    const start = (Math.min(this.page(), this.totalPages()) - 1) * PER_PAGE;
    return this.filtered().slice(start, start + PER_PAGE);
  });

  protected readonly confirmMessage = computed(() => {
    const order = this.pendingCancel();
    return order
      ? `Order ${order.reference} for ${order.customerName} will be marked cancelled. The customer sees this immediately on the tracking page.`
      : '';
  });

  constructor() {
    this.seo.apply({
      title: 'Orders | Salateen Admin',
      description: 'Manage restaurant orders.',
      path: 'admin/orders',
      noIndex: true,
    });
  }

  protected meta(status: OrderStatus) {
    return ORDER_STATUS_META[status];
  }

  protected next(order: Order): OrderStatus | null {
    return nextStatus(order.status, order.fulfilment === 'delivery');
  }

  protected canCancel(order: Order): boolean {
    return !['delivered', 'cancelled'].includes(order.status);
  }

  protected advance(order: Order, target: OrderStatus): void {
    this.busyId.set(order.id);
    this.orderService
      .updateStatus(order.id, target, undefined, this.auth.user()?.name)
      .subscribe({
        next: () => {
          this.busyId.set(null);
          this.reload.update((n) => n + 1);
          this.toast.success(`${order.reference} is now ${ORDER_STATUS_META[target].label}`);
        },
        error: () => {
          this.busyId.set(null);
          this.toast.error('That did not update');
        },
      });
  }

  protected askCancel(order: Order): void {
    this.pendingCancel.set(order);
    this.confirmOpen.set(true);
  }

  protected cancel(): void {
    const order = this.pendingCancel();
    if (!order) return;
    this.orderService
      .updateStatus(order.id, 'cancelled', 'Cancelled by staff', this.auth.user()?.name)
      .subscribe({
        next: () => {
          this.reload.update((n) => n + 1);
          this.toast.info(`${order.reference} cancelled`);
        },
        error: () => this.toast.error('That did not cancel'),
      });
  }

  protected view(order: Order): void {
    void this.router.navigate(['/admin/orders', order.id]);
  }

  protected refresh(): void {
    this.reload.update((n) => n + 1);
  }

  protected reset(): void {
    this.search.set('');
    this.statusFilter.set('all');
    this.fulfilment.set('all');
    this.page.set(1);
  }
}
