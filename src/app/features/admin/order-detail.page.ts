import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, map, of, switchMap } from 'rxjs';
import { BRAND, ORDER_STATUS_FLOW, ORDER_STATUS_META } from '../../core/constants/app.constants';
import { Order, OrderStatus } from '../../core/models/order.model';
import { AuthService } from '../../core/services/auth.service';
import { OrderService, nextStatus } from '../../core/services/order.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { CurrencyPkrPipe } from '../../shared/pipes/currency-pkr.pipe';
import { NiceDatePipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { ImageComponent } from '../../shared/components/ui/image.component';
import { EmptyStateComponent, SkeletonComponent } from '../../shared/components/ui/feedback.components';
import { ConfirmDialogComponent } from '../../shared/components/ui/overlay.components';
import { StatusPillComponent } from './shared/admin-ui.components';

@Component({
  selector: 'app-admin-order-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    FormsModule,
    ImageComponent,
    IconComponent,
    EmptyStateComponent,
    SkeletonComponent,
    ConfirmDialogComponent,
    StatusPillComponent,
    CurrencyPkrPipe,
    NiceDatePipe,
  ],
  template: `
    @if (order(); as o) {
      <a
        routerLink="/admin/orders"
        class="inline-flex items-center gap-1.5 text-caption font-semibold text-ink-500 transition-colors hover:text-clay-700"
      >
        <app-icon name="arrow-left" [size]="13" />
        All orders
      </a>

      <div class="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div class="flex flex-wrap items-center gap-3">
            <h1 class="font-display text-3xl">{{ o.reference }}</h1>
            <app-status-pill [tone]="meta(o.status).tone">{{ meta(o.status).label }}</app-status-pill>
          </div>
          <p class="mt-1.5 text-sm text-ink-500">
            Placed {{ o.createdAt | niceDate: true }} via {{ o.placedVia }}
          </p>
        </div>

        <div class="flex flex-wrap gap-2.5">
          @if (next(o); as target) {
            <button
              type="button"
              class="btn btn-primary btn-md"
              [disabled]="busy()"
              (click)="advance(o, target)"
            >
              Mark {{ meta(target).label }}
              <app-icon name="arrow-right" [size]="15" />
            </button>
          }
          <button type="button" class="btn btn-secondary btn-md" (click)="print()">
            <app-icon name="printer" [size]="15" />
            Print ticket
          </button>
          @if (canCancel(o)) {
            <button
              type="button"
              class="btn btn-ghost btn-md border border-ink-300 text-red-600"
              (click)="confirmOpen.set(true)"
            >
              Cancel
            </button>
          }
        </div>
      </div>

      <!-- Flow -->
      @if (o.status !== 'cancelled') {
        <div class="panel mt-6 px-6 py-7">
          <div class="relative">
            <div class="absolute inset-x-0 top-5 h-0.5 bg-ink-200" aria-hidden="true"></div>
            <div
              class="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-clay-500 to-clay-700 transition-[width] duration-700"
              [style.width.%]="progress(o)"
              aria-hidden="true"
            ></div>
            <ol class="relative flex justify-between">
              @for (step of steps(o); track step.status) {
                <li class="flex flex-col items-center" style="width: 6rem">
                  <button
                    type="button"
                    class="flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all"
                    [class]="
                      step.done
                        ? 'border-clay-600 bg-clay-600 text-white'
                        : step.current
                          ? 'border-clay-600 bg-white text-clay-700'
                          : 'border-ink-200 bg-white text-ink-400 hover:border-clay-400'
                    "
                    [attr.aria-label]="'Set status to ' + step.label"
                    [disabled]="busy()"
                    (click)="setStatus(o, step.status)"
                  >
                    <app-icon [name]="$any(step.icon)" [size]="17" [strokeWidth]="2" />
                  </button>
                  <span
                    class="mt-2.5 text-center text-caption leading-tight font-semibold"
                    [class]="step.done || step.current ? 'text-ink-900' : 'text-ink-400'"
                    >{{ step.label }}</span
                  >
                </li>
              }
            </ol>
          </div>
        </div>
      } @else {
        <div class="mt-6 rounded-2xl border border-red-500/25 bg-red-50 p-6">
          <p class="flex items-center gap-2 font-semibold text-red-800">
            <app-icon name="x-circle" [size]="18" />
            This order was cancelled
          </p>
          @if (o.cancelReason) {
            <p class="mt-1.5 text-sm text-ink-700">{{ o.cancelReason }}</p>
          }
        </div>
      }

      <div class="mt-6 grid gap-6 lg:grid-cols-3">
        <!-- Items -->
        <div class="lg:col-span-2">
          <section class="panel overflow-hidden">
            <h2 class="border-b border-ink-200 px-6 py-4 font-display text-xl">
              Items ({{ o.items.length }})
            </h2>
            <ul class="divide-y divide-ink-200">
              @for (line of o.items; track line.slug + line.variantLabel) {
                <li class="flex gap-4 px-6 py-4">
                  <span class="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-ink-200">
                    <app-image [src]="line.image" [alt]="line.name" sizes="56px" class="h-full w-full" />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="font-medium text-ink-900">{{ line.name }}</span>
                    <span class="mt-0.5 block text-caption text-ink-500"
                      >{{ line.variantLabel }} &middot; {{ line.quantity }} &times;
                      {{ line.unitPrice | pkr }}</span
                    >
                    @if (line.addons.length) {
                      <span class="mt-1.5 flex flex-wrap gap-1.5">
                        @for (addon of line.addons; track addon.name) {
                          <span class="chip border-ink-300 text-ink-600"
                            >{{ addon.quantity }}&times; {{ addon.name }}</span
                          >
                        }
                      </span>
                    }
                    @if (line.note) {
                      <span
                        class="mt-2 flex items-start gap-1.5 rounded-lg border border-turmeric-500/30 bg-turmeric-300/15 px-2.5 py-1.5 text-caption text-turmeric-600"
                      >
                        <app-icon name="pen" [size]="11" class="mt-0.5" />
                        {{ line.note }}
                      </span>
                    }
                  </span>
                  <span class="shrink-0 font-semibold text-clay-700">{{ line.lineTotal | pkr }}</span>
                </li>
              }
            </ul>
            @if (o.note) {
              <div class="border-t border-ink-200 bg-turmeric-300/10 px-6 py-4">
                <p class="flex items-start gap-2 text-sm text-ink-700">
                  <app-icon name="info" [size]="15" class="mt-0.5 shrink-0 text-turmeric-600" />
                  <span><span class="font-semibold">Order note:</span> {{ o.note }}</span>
                </p>
              </div>
            }
          </section>

          <!-- Timeline -->
          <section class="panel mt-6 p-6">
            <h2 class="font-display text-xl">History</h2>
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
                      meta(entry.status).label
                    }}</span>
                    <span class="block text-caption text-ink-500"
                      >{{ entry.at | niceDate: true }}{{ entry.byName ? ' · ' + entry.byName : '' }}</span
                    >
                    @if (entry.note) {
                      <span class="mt-0.5 block text-caption text-ink-600">{{ entry.note }}</span>
                    }
                  </span>
                </li>
              }
            </ol>
          </section>
        </div>

        <!-- Sidebar -->
        <aside class="space-y-5">
          <section class="panel p-5">
            <h2 class="font-display text-lg">Customer</h2>
            <dl class="mt-4 space-y-2.5 text-sm">
              <div>
                <dt class="text-caption text-ink-500">Name</dt>
                <dd class="font-medium text-ink-900">{{ o.customerName }}</dd>
              </div>
              <div>
                <dt class="text-caption text-ink-500">Phone</dt>
                <dd>
                  <a [href]="'tel:' + o.customerPhone" class="font-medium text-clay-700 hover:underline">{{
                    o.customerPhone
                  }}</a>
                </dd>
              </div>
              @if (o.customerEmail) {
                <div>
                  <dt class="text-caption text-ink-500">Email</dt>
                  <dd class="truncate font-medium text-ink-900">{{ o.customerEmail }}</dd>
                </div>
              }
              <div>
                <dt class="text-caption text-ink-500">Account</dt>
                <dd class="font-medium text-ink-900">
                  {{ o.customerId ? 'Registered customer' : 'Guest order' }}
                </dd>
              </div>
            </dl>
          </section>

          <section class="panel p-5">
            <h2 class="font-display text-lg">
              {{ o.fulfilment === 'delivery' ? 'Delivery' : 'Collection' }}
            </h2>
            @if (o.fulfilment === 'delivery' && o.deliveryAddress) {
              <address class="mt-3 text-sm leading-relaxed text-ink-600 not-italic">
                {{ o.deliveryAddress.line1 }}<br />
                @if (o.deliveryAddress.landmark) {
                  {{ o.deliveryAddress.landmark }}<br />
                }
                {{ o.deliveryAddress.area }}, {{ o.deliveryAddress.city }}
              </address>
              <div class="mt-4">
                <label class="field-label" for="rider">Assigned rider</label>
                <div class="flex gap-2">
                  <select id="rider" class="field" [(ngModel)]="rider">
                    <option value="">Not assigned</option>
                    @for (name of riders; track name) {
                      <option [value]="name">{{ name }}</option>
                    }
                  </select>
                  <button
                    type="button"
                    class="btn btn-secondary btn-md shrink-0"
                    [disabled]="busy()"
                    (click)="assignRider(o)"
                  >
                    Save
                  </button>
                </div>
              </div>
            } @else {
              <p class="mt-3 text-sm leading-relaxed text-ink-600">
                Collecting from the counter at {{ brand.street }}.
              </p>
            }
          </section>

          <section class="panel p-5">
            <h2 class="font-display text-lg">Payment</h2>
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
                <dt class="font-semibold text-ink-900">Collect in cash</dt>
                <dd class="font-display text-2xl text-clay-700">{{ o.grandTotal | pkr }}</dd>
              </div>
            </dl>
            <p class="mt-3 flex items-center gap-2 text-caption text-ink-500">
              <app-icon name="wallet" [size]="13" class="text-clay-600" />
              {{ o.paymentMethod === 'cash-on-delivery' ? 'Cash on delivery' : 'Cash at the counter' }}
            </p>
          </section>
        </aside>
      </div>
    } @else if (resolved()) {
      <app-empty-state
        icon="bag"
        title="Order not found"
        message="It may have been deleted."
        actionLabel="Back to orders"
        (action)="back()"
      />
    } @else {
      <div class="space-y-4">
        <app-skeleton height="3rem" width="35%" />
        <app-skeleton height="8rem" rounded="rounded-2xl" />
        <app-skeleton height="22rem" rounded="rounded-2xl" />
      </div>
    }

    <app-confirm-dialog
      [(open)]="confirmOpen"
      title="Cancel this order?"
      message="The customer sees this immediately on the tracking page. Consider calling them first."
      confirmLabel="Cancel the order"
      cancelLabel="Keep it"
      [danger]="true"
      (confirmed)="cancel()"
    />
  `,
})
export class AdminOrderDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderService = inject(OrderService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  protected readonly brand = BRAND;
  protected readonly riders = ['Sajid Iqbal', 'Khalid Mehmood'];
  protected readonly busy = signal(false);
  protected readonly confirmOpen = signal(false);
  protected readonly rider = signal('');
  private readonly reload = signal(0);

  private readonly resolvedOrder = toSignal(
    combineLatest([this.route.paramMap, toObservable(this.reload)]).pipe(
      switchMap(([params]) => {
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
      title: 'Order | Salateen Admin',
      description: 'Order details.',
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

  protected progress(order: Order): number {
    const flow = this.flowFor(order);
    const index = flow.indexOf(order.status);
    return index <= 0 ? 0 : Math.round((index / (flow.length - 1)) * 100);
  }

  protected steps(order: Order) {
    const flow = this.flowFor(order);
    const index = flow.indexOf(order.status);
    return flow.map((status, i) => ({
      status,
      label: ORDER_STATUS_META[status].label,
      icon: ORDER_STATUS_META[status].icon,
      done: index > i,
      current: index === i,
    }));
  }

  private flowFor(order: Order): OrderStatus[] {
    return order.fulfilment === 'delivery'
      ? ORDER_STATUS_FLOW
      : ORDER_STATUS_FLOW.filter((s) => s !== 'out-for-delivery');
  }

  protected advance(order: Order, target: OrderStatus): void {
    this.setStatus(order, target);
  }

  protected setStatus(order: Order, status: OrderStatus): void {
    if (status === order.status) return;
    this.busy.set(true);
    this.orderService.updateStatus(order.id, status, undefined, this.auth.user()?.name).subscribe({
      next: () => {
        this.busy.set(false);
        this.reload.update((n) => n + 1);
        this.toast.success(`Marked ${ORDER_STATUS_META[status].label}`);
      },
      error: () => {
        this.busy.set(false);
        this.toast.error('That did not update');
      },
    });
  }

  protected assignRider(order: Order): void {
    this.busy.set(true);
    this.orderService.assignRider(order.id, this.rider()).subscribe({
      next: () => {
        this.busy.set(false);
        this.reload.update((n) => n + 1);
        this.toast.success('Rider assigned');
      },
      error: () => {
        this.busy.set(false);
        this.toast.error('That did not save');
      },
    });
  }

  protected cancel(): void {
    const order = this.order();
    if (!order) return;
    this.orderService
      .updateStatus(order.id, 'cancelled', 'Cancelled by staff', this.auth.user()?.name)
      .subscribe({
        next: () => {
          this.reload.update((n) => n + 1);
          this.toast.info('Order cancelled');
        },
        error: () => this.toast.error('That did not cancel'),
      });
  }

  protected print(): void {
    if (typeof window !== 'undefined') window.print();
  }

  protected back(): void {
    void this.router.navigate(['/admin/orders']);
  }
}
