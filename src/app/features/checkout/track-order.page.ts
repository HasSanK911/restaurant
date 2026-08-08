import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { BRAND, ORDER_STATUS_FLOW, ORDER_STATUS_META } from '../../core/constants/app.constants';
import { Order, OrderStatus } from '../../core/models/order.model';
import { OrderService, statusProgress } from '../../core/services/order.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { CurrencyPkrPipe } from '../../shared/pipes/currency-pkr.pipe';
import { NiceDatePipe } from '../../shared/pipes/format.pipes';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { PageHeroComponent } from '../../shared/components/ui/page-hero.component';
import { IconComponent, IconName } from '../../shared/components/ui/icon.component';
import { ImageComponent } from '../../shared/components/ui/image.component';
import { BadgeComponent } from '../../shared/components/ui/display.components';
import { EmptyStateComponent, SpinnerComponent } from '../../shared/components/ui/feedback.components';

/**
 * Public order tracking.
 *
 * Accepts either the SLT reference or the phone number the order was placed
 * with, because customers reliably remember one of the two. Polls every twenty
 * seconds while an order is still in flight; a real backend would push this
 * over a websocket instead (see BACKEND_PLAN.md, "Broadcasting").
 */
@Component({
  selector: 'app-track-order-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    FormsModule,
    PageHeroComponent,
    IconComponent,
    ImageComponent,
    BadgeComponent,
    EmptyStateComponent,
    SpinnerComponent,
    CurrencyPkrPipe,
    NiceDatePipe,
    TimeAgoPipe,
  ],
  template: `
    <app-page-hero
      eyebrow="Order tracking"
      title="Where is"
      accent=" my order?"
      description="Enter your SLT reference or the mobile number you ordered with."
      image="assets/images/bbq/chef-grilling"
      imageAlt="A chef turning skewers over charcoal at Salateen Restaurant"
      [crumbs]="[{ label: 'Track Order' }]"
      size="sm"
    />

    <section class="section pt-12">
      <div class="container-lux max-w-4xl">
        <!-- Search -->
        <form class="panel flex flex-col gap-3 p-5 sm:flex-row" (ngSubmit)="search()">
          <label class="sr-only" for="track-query">Order reference or mobile number</label>
          <div class="relative flex-1">
            <app-icon
              name="search"
              [size]="17"
              class="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-500"
            />
            <input
              id="track-query"
              type="text"
              class="field pl-11"
              placeholder="SLT-24488 or 03120991116"
              [(ngModel)]="query"
              name="query"
            />
          </div>
          <button type="submit" class="btn btn-primary btn-md shrink-0" [disabled]="searching()">
            @if (searching()) {
              <app-spinner [size]="16" />
              Searching
            } @else {
              Track order
              <app-icon name="arrow-right" [size]="15" />
            }
          </button>
        </form>

        @if (searched() && results().length === 0 && !searching()) {
          <app-empty-state
            class="mt-8"
            icon="search"
            title="No orders found"
            message="Check the reference or number and try again. If you ordered by phone, call us and we will look it up."
          >
            <a [href]="'tel:' + brand.phone" class="btn btn-secondary btn-md mt-6">
              <app-icon name="phone" [size]="15" />
              {{ brand.phoneDisplay }}
            </a>
          </app-empty-state>
        }

        <!-- Results -->
        @for (order of results(); track order.id) {
          <article class="panel mt-8 overflow-hidden">
            <!-- Header -->
            <div
              class="flex flex-wrap items-center justify-between gap-4 border-b border-ink-200 bg-ink-50 px-6 py-5"
            >
              <div>
                <p class="font-display text-2xl text-ink-900">{{ order.reference }}</p>
                <p class="mt-1 text-xs text-ink-500">
                  Placed {{ order.createdAt | timeAgo }} &middot;
                  {{ order.fulfilment === 'delivery' ? 'Home delivery' : 'Dine in / collection' }}
                </p>
              </div>
              <app-badge [tone]="$any(meta(order.status).tone)" [dot]="true">{{
                meta(order.status).label
              }}</app-badge>
            </div>

            <!-- Progress -->
            @if (order.status !== 'cancelled') {
              <div class="px-6 pt-7 pb-2">
                <div class="relative">
                  <div class="absolute inset-x-0 top-5 h-0.5 bg-ink-200" aria-hidden="true"></div>
                  <div
                    class="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-clay-500 to-clay-700 transition-[width] duration-700"
                    [style.width.%]="progress(order)"
                    aria-hidden="true"
                  ></div>
                  <ol class="relative flex justify-between">
                    @for (step of steps(order); track step.status) {
                      <li class="flex flex-col items-center text-center" style="width: 5.5rem">
                        <span
                          class="flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-500"
                          [class]="
                            step.done
                              ? 'border-clay-600 bg-clay-600 text-white'
                              : step.current
                                ? 'animate-[pulse-ring_2.2s_cubic-bezier(0.22,1,0.36,1)_infinite] border-clay-600 bg-white text-clay-700'
                                : 'border-ink-200 bg-white text-ink-500'
                          "
                        >
                          <app-icon [name]="step.icon" [size]="17" [strokeWidth]="2" />
                        </span>
                        <span
                          class="mt-2.5 text-caption leading-tight font-semibold"
                          [class]="step.done || step.current ? 'text-ink-900' : 'text-ink-500'"
                          >{{ step.label }}</span
                        >
                      </li>
                    }
                  </ol>
                </div>
                <p class="mt-6 text-center text-sm text-ink-600">
                  {{ meta(order.status).description }}
                </p>
                @if (order.status === 'out-for-delivery' && order.assignedRiderName) {
                  <p class="mt-2 text-center text-xs text-ink-500">
                    {{ order.assignedRiderName }} is on the way with your order.
                  </p>
                }
              </div>
            } @else {
              <div class="px-6 py-8 text-center">
                <app-icon name="x-circle" [size]="34" class="mx-auto text-red-600" />
                <p class="mt-3 font-display text-xl text-ink-900">This order was cancelled</p>
                @if (order.cancelReason) {
                  <p class="mt-1.5 text-sm text-ink-500">{{ order.cancelReason }}</p>
                }
              </div>
            }

            <!-- Timeline -->
            <div class="border-t border-ink-200 px-6 py-6">
              <p class="eyebrow mb-4">History</p>
              <ol class="space-y-4">
                @for (entry of reversed(order); track entry.at) {
                  <li class="flex gap-3.5">
                    <span class="mt-1 flex flex-col items-center">
                      <span class="h-2 w-2 shrink-0 rounded-full bg-clay-600"></span>
                      @if (!$last) {
                        <span class="mt-1 w-px flex-1 bg-ink-200"></span>
                      }
                    </span>
                    <span class="pb-1">
                      <span class="block text-sm font-semibold text-ink-900">{{
                        meta(entry.status).label
                      }}</span>
                      <span class="block text-xs text-ink-500">{{ entry.at | niceDate: true }}</span>
                      @if (entry.note) {
                        <span class="mt-0.5 block text-xs text-ink-600">{{ entry.note }}</span>
                      }
                    </span>
                  </li>
                }
              </ol>
            </div>

            <!-- Items -->
            <div class="border-t border-ink-200">
              <ul class="divide-y divide-ink-200">
                @for (line of order.items; track line.slug + line.variantLabel) {
                  <li class="flex items-center gap-4 px-6 py-3.5">
                    <span class="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-ink-200">
                      <app-image [src]="line.image" [alt]="line.name" sizes="48px" class="h-full w-full" />
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-sm font-medium text-ink-900"
                        >{{ line.quantity }}&times; {{ line.name }}</span
                      >
                      <span class="block text-xs text-ink-500">{{ line.variantLabel }}</span>
                    </span>
                    <span class="shrink-0 text-sm font-semibold text-clay-700 nums">{{
                      line.lineTotal | pkr
                    }}</span>
                  </li>
                }
              </ul>
              <div class="flex items-baseline justify-between border-t border-ink-200 px-6 py-4">
                <span class="text-sm font-semibold text-ink-900">Total, cash on collection</span>
                <span class="font-display text-2xl text-clay-700 nums">{{ order.grandTotal | pkr }}</span>
              </div>
            </div>

            <div class="flex flex-wrap gap-3 border-t border-ink-200 bg-ink-50 px-6 py-4">
              <a [href]="'tel:' + brand.phone" class="btn btn-secondary btn-sm">
                <app-icon name="phone" [size]="13" />
                Call about this order
              </a>
              <a routerLink="/menu" class="btn btn-ghost btn-sm border border-ink-300">Order again</a>
            </div>
          </article>
        }

        @if (!searched()) {
          <div class="panel mt-8 p-6">
            <p class="eyebrow mb-4">How tracking works</p>
            <ol class="space-y-3.5">
              @for (step of explainer; track step.title; let i = $index) {
                <li class="flex gap-3.5">
                  <span
                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-clay-50 text-xs font-bold text-clay-700"
                    >{{ i + 1 }}</span
                  >
                  <span>
                    <span class="block text-sm font-semibold text-ink-900">{{ step.title }}</span>
                    <span class="mt-0.5 block text-xs leading-relaxed text-ink-500">{{
                      step.body
                    }}</span>
                  </span>
                </li>
              }
            </ol>
          </div>
        }
      </div>
    </section>
  `,
})
export class TrackOrderPage {
  private readonly orders = inject(OrderService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  protected readonly brand = BRAND;
  protected readonly query = signal('');
  protected readonly searching = signal(false);
  protected readonly searched = signal(false);
  protected readonly results = signal<Order[]>([]);

  protected readonly explainer = [
    {
      title: 'We confirm by phone',
      body: 'Every order gets a call from the restaurant before the kitchen starts. This is also when we tell you the real timing on a busy night.',
    },
    {
      title: 'The kitchen fires it',
      body: 'Charcoal items go on the pits, karahis go on the burners. Nothing is pre-cooked, so the clock starts here.',
    },
    {
      title: 'It leaves the pass',
      body: 'Delivery orders go straight to a rider. Collection orders wait at the counter under a cover.',
    },
    {
      title: 'Pay in cash',
      body: 'Cash on delivery or cash at the counter. Nothing is charged online, ever.',
    },
  ];

  private readonly routeReference = toSignal(this.route.paramMap, { initialValue: null });
  private poller?: ReturnType<typeof setInterval>;

  constructor() {
    this.seo.apply({
      title: 'Track Your Order | Salateen Restaurant Swabi',
      description:
        'Track a Salateen Restaurant order using your SLT reference or the mobile number you ordered with.',
      path: 'order/track',
      noIndex: true,
    });

    // Deep-linked reference from the confirmation page.
    effect(() => {
      const reference = this.routeReference()?.get('reference');
      if (reference && reference !== this.query()) {
        this.query.set(reference);
        this.search();
      }
    });

    if (typeof window !== 'undefined') {
      this.poller = setInterval(() => {
        if (this.results().some((o) => this.isLive(o.status))) this.search(true);
      }, 20_000);
      // Angular tears the component down before this fires again on navigation.
      queueMicrotask(() => {
        window.addEventListener('beforeunload', () => clearInterval(this.poller));
      });
    }
  }

  protected meta(status: OrderStatus) {
    return ORDER_STATUS_META[status];
  }

  protected progress(order: Order): number {
    return statusProgress(order.status, order.fulfilment === 'delivery');
  }

  protected reversed(order: Order) {
    return [...order.timeline].reverse();
  }

  protected steps(order: Order) {
    const isDelivery = order.fulfilment === 'delivery';
    const flow = isDelivery
      ? ORDER_STATUS_FLOW
      : ORDER_STATUS_FLOW.filter((s) => s !== 'out-for-delivery');
    const currentIndex = flow.indexOf(order.status);
    return flow.map((status, i) => ({
      status,
      label: status === 'ready' && !isDelivery ? 'Ready' : ORDER_STATUS_META[status].label,
      icon: ORDER_STATUS_META[status].icon as IconName,
      done: currentIndex > i,
      current: currentIndex === i,
    }));
  }

  protected search(silent = false): void {
    const value = this.query().trim();
    if (!value) {
      if (!silent) this.toast.info('Enter a reference or phone number');
      return;
    }
    if (!silent) this.searching.set(true);

    this.orders.track(value).subscribe({
      next: (orders) => {
        this.results.set(orders);
        this.searching.set(false);
        this.searched.set(true);
      },
      error: () => {
        this.searching.set(false);
        this.searched.set(true);
      },
    });
  }

  private isLive(status: OrderStatus): boolean {
    return !['delivered', 'cancelled'].includes(status);
  }
}
