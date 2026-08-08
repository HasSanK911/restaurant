import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { CurrencyPkrPipe } from '../../shared/pipes/currency-pkr.pipe';
import { DrawerComponent } from '../../shared/components/ui/overlay.components';
import { EmptyStateComponent } from '../../shared/components/ui/feedback.components';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { ImageComponent } from '../../shared/components/ui/image.component';

/**
 * The slide-over basket. Reachable from the header on every page, so the
 * customer never loses their place while browsing the menu.
 */
@Component({
  selector: 'app-cart-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    DrawerComponent,
    ImageComponent,
    IconComponent,
    EmptyStateComponent,
    CurrencyPkrPipe,
  ],
  template: `
    <app-drawer [open]="cart.isOpen()" (openChange)="cart.isOpen.set($event)" title="Your Order">
      @if (cart.isEmpty()) {
        <div class="flex flex-1 items-center">
          <app-empty-state
            icon="bag"
            title="Nothing here yet"
            message="Start with the Kabuli Pulao, or a plate of Chapli Kabab straight off the pan."
            actionLabel="Browse the menu"
            (action)="goToMenu()"
          />
        </div>
      } @else {
        <!-- Free-delivery nudge -->
        @if (cart.freeDeliveryGap() !== null) {
          <div class="border-b border-ink-200 bg-ink-50/60 px-5 py-3.5">
            @if (cart.freeDeliveryGap()! > 0) {
              <p class="text-xs text-ink-600">
                Add <span class="font-bold text-clay-700">{{ cart.freeDeliveryGap()! | pkr }}</span> more
                for free delivery
              </p>
            } @else {
              <p class="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <app-icon name="check-circle" [size]="14" />
                Free delivery unlocked
              </p>
            }
            <div class="mt-2 h-1 overflow-hidden rounded-full bg-ink-200">
              <div
                class="h-full rounded-full bg-gradient-to-r from-clay-400 to-clay-600 transition-[width] duration-500"
                [style.width.%]="freeDeliveryProgress()"
              ></div>
            </div>
          </div>
        }

        <!-- Lines -->
        <ul class="flex-1 divide-y divide-ink-200/70 overflow-y-auto">
          @for (line of cart.lines(); track line.key) {
            <li class="flex gap-3.5 p-4">
              <a
                [routerLink]="['/menu', line.slug]"
                class="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-ink-200"
                (click)="cart.close()"
              >
                <app-image [src]="line.image" [alt]="line.name" sizes="80px" class="h-full w-full" />
              </a>

              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <a
                      [routerLink]="['/menu', line.slug]"
                      class="block truncate text-sm font-semibold text-ink-900 transition-colors hover:text-clay-700"
                      (click)="cart.close()"
                      >{{ line.name }}</a
                    >
                    <p class="mt-0.5 text-xs text-ink-500">{{ line.variantLabel }}</p>
                  </div>
                  <button
                    type="button"
                    class="-mt-1 -mr-1 shrink-0 rounded-lg p-1.5 text-ink-500 transition-colors hover:text-red-600"
                    [attr.aria-label]="'Remove ' + line.name"
                    (click)="cart.remove(line.key)"
                  >
                    <app-icon name="trash" [size]="15" />
                  </button>
                </div>

                @if (line.addons.length) {
                  <ul class="mt-1.5 space-y-0.5">
                    @for (addon of line.addons; track addon.id) {
                      <li class="text-caption text-ink-500">
                        + {{ addon.quantity }}&times; {{ addon.name }}
                      </li>
                    }
                  </ul>
                }
                @if (line.note) {
                  <p class="mt-1.5 flex items-start gap-1.5 text-caption text-clay-600/80">
                    <app-icon name="pen" [size]="10" class="mt-0.5" />
                    {{ line.note }}
                  </p>
                }

                <div class="mt-2.5 flex items-center justify-between gap-2">
                  <div class="inline-flex items-center rounded-full border border-ink-200 bg-ink-50">
                    <button
                      type="button"
                      class="px-2.5 py-1.5 text-ink-600 transition-colors hover:text-clay-700"
                      [attr.aria-label]="'Decrease ' + line.name"
                      (click)="cart.decrement(line.key)"
                    >
                      <app-icon name="minus" [size]="13" [strokeWidth]="2.4" />
                    </button>
                    <span class="min-w-6 text-center text-xs font-bold tabular-nums text-ink-900">{{
                      line.quantity
                    }}</span>
                    <button
                      type="button"
                      class="px-2.5 py-1.5 text-ink-600 transition-colors hover:text-clay-700"
                      [attr.aria-label]="'Increase ' + line.name"
                      (click)="cart.increment(line.key)"
                    >
                      <app-icon name="plus" [size]="13" [strokeWidth]="2.4" />
                    </button>
                  </div>
                  <span class="font-display text-lg text-clay-700 nums">{{ line.lineTotal | pkr }}</span>
                </div>
              </div>
            </li>
          }
        </ul>

        <!-- Summary -->
        <div class="border-t border-ink-200 bg-white/60 p-5">
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-ink-500">Subtotal</dt>
              <dd class="font-medium text-ink-900 nums">{{ cart.subtotal() | pkr }}</dd>
            </div>
            @if (cart.discount() > 0) {
              <div class="flex justify-between">
                <dt class="text-emerald-700">Discount</dt>
                <dd class="font-medium text-emerald-700 nums">-{{ cart.discount() | pkr }}</dd>
              </div>
            }
            @if (cart.fulfilment() === 'delivery' && cart.deliveryArea()) {
              <div class="flex justify-between">
                <dt class="text-ink-500">Delivery</dt>
                <dd class="font-medium text-ink-900 nums">
                  {{ cart.deliveryFee() === 0 ? 'Free' : (cart.deliveryFee() | pkr) }}
                </dd>
              </div>
            }
            <div class="flex items-baseline justify-between border-t border-ink-200 pt-2.5">
              <dt class="text-sm font-semibold text-ink-900">Total</dt>
              <dd class="font-display text-2xl text-clay-700 nums">{{ cart.grandTotal() | pkr }}</dd>
            </div>
          </dl>

          <p class="mt-3 flex items-center gap-1.5 text-caption text-ink-500">
            <app-icon name="wallet" [size]="12" />
            Cash on delivery or cash at the counter. No online payment.
          </p>

          <div class="mt-4 space-y-2">
            <a routerLink="/checkout" class="btn btn-primary btn-md w-full" (click)="cart.close()">
              Checkout
              <app-icon name="arrow-right" [size]="15" />
            </a>
            <button type="button" class="btn btn-ghost btn-sm w-full" (click)="cart.close()">
              Keep browsing
            </button>
          </div>
        </div>
      }
    </app-drawer>
  `,
})
export class CartDrawerComponent {
  protected readonly cart = inject(CartService);
  private readonly router = inject(Router);

  protected readonly freeDeliveryProgress = computed(() => {
    const threshold = this.cart.deliveryArea()?.freeDeliveryAbove;
    if (!threshold) return 100;
    return Math.min(100, Math.round((this.cart.subtotal() / threshold) * 100));
  });

  protected goToMenu(): void {
    this.cart.close();
    void this.router.navigate(['/menu']);
  }
}
