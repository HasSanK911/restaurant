import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { ORDER_STATUS_META } from '../../core/constants/app.constants';
import { Order, OrderStatus } from '../../core/models/order.model';
import { AuthService } from '../../core/services/auth.service';
import { OrderService, nextStatus } from '../../core/services/order.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/ui/icon.component';

/**
 * Full-screen kitchen display, for the screen mounted at the pass.
 *
 * Deliberately outside the admin shell: no sidebar, no navigation, large type
 * and high contrast, because it is read from two metres away by someone with
 * their hands full. Tickets colour by how long they have been waiting.
 */
@Component({
  selector: 'app-kitchen-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  host: { class: 'block min-h-svh bg-ink-900' },
  template: `
    <div class="flex min-h-svh flex-col">
      <!-- Bar -->
      <header
        class="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-4"
      >
        <div class="flex items-center gap-4">
          <img src="assets/brand/logo-mark.svg" alt="" aria-hidden="true" class="h-10 w-10" width="40" height="40" />
          <div>
            <h1 class="font-display text-2xl text-white">Kitchen Display</h1>
            <p class="text-caption text-white/50">Salateen Restaurant, Jhangira Road</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-5">
          @for (stat of stats(); track stat.label) {
            <div class="text-center">
              <p class="font-display text-3xl leading-none" [class]="stat.tone">{{ stat.value }}</p>
              <p class="mt-1 text-micro tracking-[0.14em] text-white/45 uppercase">{{ stat.label }}</p>
            </div>
          }
          <div class="text-right">
            <p class="font-display text-3xl leading-none text-white tabular-nums">{{ clock() }}</p>
            <p class="mt-1 text-micro tracking-[0.14em] text-white/45 uppercase">Now</p>
          </div>
          <a
            routerLink="/admin"
            class="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 text-white/70 transition-colors hover:border-white/35 hover:text-white"
            aria-label="Back to the admin panel"
          >
            <app-icon name="close" [size]="18" />
          </a>
        </div>
      </header>

      <!-- Board -->
      <div class="flex-1 overflow-x-auto p-5">
        @if (tickets().length) {
          <ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            @for (order of tickets(); track order.id) {
              <li>
                <article
                  class="flex h-full flex-col rounded-2xl border-2 transition-colors"
                  [class]="ticketTone(order)"
                >
                  <!-- Ticket head -->
                  <header class="flex items-start justify-between gap-3 border-b border-white/10 p-4">
                    <div>
                      <p class="font-display text-3xl leading-none text-white">{{ order.reference }}</p>
                      <p class="mt-1.5 text-caption text-white/55">
                        {{ order.fulfilment === 'delivery' ? 'DELIVERY' : 'DINE IN' }} &middot;
                        {{ order.customerName }}
                      </p>
                    </div>
                    <div class="text-right">
                      <p class="font-display text-3xl leading-none tabular-nums" [class]="waitTone(order)">
                        {{ waitLabel(order) }}
                      </p>
                      <p class="mt-1.5 text-micro tracking-wide text-white/45 uppercase">
                        {{ meta(order.status).label }}
                      </p>
                    </div>
                  </header>

                  <!-- Lines -->
                  <ul class="flex-1 space-y-3 p-4">
                    @for (line of order.items; track line.slug + line.variantLabel) {
                      <li class="flex items-start gap-3">
                        <span
                          class="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 px-1.5 font-display text-lg text-white"
                          >{{ line.quantity }}</span
                        >
                        <span class="min-w-0">
                          <span class="block text-lg leading-tight font-semibold text-white">{{
                            line.name
                          }}</span>
                          <span class="block text-sm text-white/50">{{ line.variantLabel }}</span>
                          @if (line.addons.length) {
                            <span class="mt-1 block text-sm text-clay-300">
                              @for (addon of line.addons; track addon.name) {
                                + {{ addon.quantity }}&times; {{ addon.name }}
                              }
                            </span>
                          }
                          @if (line.note) {
                            <span
                              class="mt-1.5 block rounded-lg bg-turmeric-400/20 px-2.5 py-1.5 text-sm font-bold text-turmeric-300"
                            >
                              {{ line.note }}
                            </span>
                          }
                        </span>
                      </li>
                    }
                  </ul>

                  @if (order.note) {
                    <p
                      class="mx-4 mb-3 rounded-lg bg-turmeric-400/20 px-3 py-2 text-sm font-bold text-turmeric-300"
                    >
                      {{ order.note }}
                    </p>
                  }

                  <!-- Advance -->
                  <footer class="border-t border-white/10 p-3">
                    @if (next(order); as target) {
                      <button
                        type="button"
                        class="flex w-full items-center justify-center gap-2 rounded-xl bg-clay-600 py-3.5 font-display text-xl text-white transition-colors hover:bg-clay-500 disabled:opacity-50"
                        [disabled]="busyId() === order.id"
                        (click)="advance(order, target)"
                      >
                        {{ actionLabel(target) }}
                        <app-icon name="arrow-right" [size]="20" [strokeWidth]="2.2" />
                      </button>
                    }
                  </footer>
                </article>
              </li>
            }
          </ul>
        } @else {
          <div class="flex h-full min-h-96 flex-col items-center justify-center text-center">
            <span
              class="flex h-20 w-20 items-center justify-center rounded-full border-2 border-basil-400/40 text-basil-300"
            >
              <app-icon name="check" [size]="40" [strokeWidth]="2.2" />
            </span>
            <p class="mt-6 font-display text-4xl text-white">The pass is clear</p>
            <p class="mt-2 text-white/50">No tickets waiting. New orders appear here automatically.</p>
          </div>
        }
      </div>

      <!-- Legend -->
      <footer
        class="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-white/10 px-6 py-3"
      >
        <ul class="flex flex-wrap items-center gap-5 text-caption text-white/50">
          @for (item of legend; track item.label) {
            <li class="flex items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-full" [class]="item.dot"></span>
              {{ item.label }}
            </li>
          }
        </ul>
        <p class="flex items-center gap-2 text-caption text-white/40">
          <app-icon name="refresh" [size]="12" />
          Auto-refreshing every ten seconds
        </p>
      </footer>
    </div>
  `,
})
export class KitchenPage implements OnDestroy {
  private readonly orderService = inject(OrderService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  protected readonly busyId = signal<string | null>(null);
  private readonly reload = signal(0);
  private readonly tick = signal(Date.now());
  private timer?: ReturnType<typeof setInterval>;

  protected readonly legend = [
    { label: 'Under 20 minutes', dot: 'bg-basil-400' },
    { label: '20 to 30 minutes', dot: 'bg-amber-400' },
    { label: 'Over 30 minutes', dot: 'bg-red-400' },
  ];

  private readonly orders = toSignal(
    toObservable(this.reload).pipe(switchMap(() => this.orderService.kitchenQueue())),
    { initialValue: [] as Order[] },
  );

  /** Oldest first: the pass works top-left to bottom-right. */
  protected readonly tickets = computed(() =>
    [...this.orders()]
      .filter((o) => o.status !== 'ready')
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)),
  );

  protected readonly stats = computed(() => {
    const orders = this.orders();
    const overdue = orders.filter((o) => this.waitMinutes(o) >= 30).length;
    return [
      { label: 'Waiting', value: orders.filter((o) => o.status === 'pending').length, tone: 'text-amber-300' },
      { label: 'Cooking', value: orders.filter((o) => o.status === 'preparing').length, tone: 'text-turmeric-300' },
      { label: 'Ready', value: orders.filter((o) => o.status === 'ready').length, tone: 'text-basil-300' },
      { label: 'Overdue', value: overdue, tone: overdue > 0 ? 'text-red-400' : 'text-white/60' },
    ];
  });

  protected readonly clock = computed(() => {
    this.tick();
    return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  });

  constructor() {
    this.seo.apply({
      title: 'Kitchen Display | Salateen Restaurant',
      description: 'Live kitchen ticket display.',
      path: 'kitchen',
      noIndex: true,
    });

    if (typeof window !== 'undefined') {
      this.timer = setInterval(() => {
        this.tick.set(Date.now());
        this.reload.update((n) => n + 1);
      }, 10_000);
    }
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  protected meta(status: OrderStatus) {
    return ORDER_STATUS_META[status];
  }

  protected next(order: Order): OrderStatus | null {
    return nextStatus(order.status, order.fulfilment === 'delivery');
  }

  protected actionLabel(status: OrderStatus): string {
    return (
      {
        accepted: 'Accept',
        preparing: 'Start cooking',
        ready: 'Mark ready',
        'out-for-delivery': 'Send it out',
        delivered: 'Complete',
      }[status as string] ?? ORDER_STATUS_META[status].label
    );
  }

  protected ticketTone(order: Order): string {
    const minutes = this.waitMinutes(order);
    if (minutes >= 30) return 'border-red-500/70 bg-red-950/40';
    if (minutes >= 20) return 'border-amber-500/60 bg-amber-950/30';
    return 'border-white/12 bg-white/5';
  }

  protected waitTone(order: Order): string {
    const minutes = this.waitMinutes(order);
    if (minutes >= 30) return 'text-red-400';
    if (minutes >= 20) return 'text-amber-300';
    return 'text-basil-300';
  }

  protected waitLabel(order: Order): string {
    const minutes = this.waitMinutes(order);
    return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h${minutes % 60}`;
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
      },
      error: () => {
        this.busyId.set(null);
        this.toast.error('That did not update', 'Check the connection to the API.');
      },
    });
  }
}
