import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { ContentService } from '../../core/services/content.service';
import { MenuService } from '../../core/services/menu.service';
import { AuthService } from '../../core/services/auth.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { CurrencyPkrPipe } from '../../shared/pipes/currency-pkr.pipe';
import { MenuItemCardComponent } from '../../shared/components/menu-item-card.component';
import { PageHeroComponent } from '../../shared/components/ui/page-hero.component';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { ImageComponent } from '../../shared/components/ui/image.component';
import { EmptyStateComponent } from '../../shared/components/ui/feedback.components';
import { SectionHeaderComponent } from '../../shared/components/ui/display.components';

/**
 * The full-page basket.
 *
 * Duplicates the drawer's job deliberately: the drawer is for quick edits mid
 * browse, this is the considered review before checkout, with coupon entry and
 * suggested additions.
 */
@Component({
  selector: 'app-cart-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    FormsModule,
    PageHeroComponent,
    ImageComponent,
    IconComponent,
    EmptyStateComponent,
    SectionHeaderComponent,
    MenuItemCardComponent,
    CurrencyPkrPipe,
  ],
  template: `
    <app-page-hero
      eyebrow="Your order"
      title="Review before"
      accent=" it goes to the pass"
      description="Change quantities, add a note for the kitchen, or apply a coupon. Nothing is confirmed until checkout."
      image="assets/images/food/feast-table"
      imageAlt="A table mid-feast at Salateen Restaurant"
      [crumbs]="[{ label: 'Your Order' }]"
      size="sm"
    />

    <section class="section pt-14">
      <div class="container-lux">
        @if (cart.isEmpty()) {
          <app-empty-state
            icon="bag"
            title="Your basket is empty"
            message="Start with the Kabuli Pulao, a plate of Chapli Kabab, or the Grand Platter if the table is big."
            actionLabel="Browse the menu"
            (action)="goToMenu()"
          />
        } @else {
          <div class="grid gap-8 lg:grid-cols-12">
            <!-- Lines -->
            <div class="lg:col-span-8">
              <div class="panel overflow-hidden">
                <div class="flex items-center justify-between border-b border-ink-200 px-5 py-4">
                  <p class="text-sm font-semibold text-ink-900">
                    {{ cart.itemCount() }} item{{ cart.itemCount() === 1 ? '' : 's' }}
                  </p>
                  <button
                    type="button"
                    class="text-xs font-semibold text-ink-500 transition-colors hover:text-red-600"
                    (click)="clear()"
                  >
                    Empty basket
                  </button>
                </div>

                <ul class="divide-y divide-ink-200/70">
                  @for (line of cart.lines(); track line.key) {
                    <li class="flex flex-col gap-4 p-5 sm:flex-row">
                      <a
                        [routerLink]="['/menu', line.slug]"
                        class="h-28 w-full shrink-0 overflow-hidden rounded-xl border border-ink-200 sm:h-24 sm:w-24"
                      >
                        <app-image
                          [src]="line.image"
                          [alt]="line.name"
                          sizes="96px"
                          class="h-full w-full"
                        />
                      </a>

                      <div class="min-w-0 flex-1">
                        <div class="flex items-start justify-between gap-3">
                          <div class="min-w-0">
                            <a
                              [routerLink]="['/menu', line.slug]"
                              class="font-display text-lg text-ink-900 transition-colors hover:text-clay-700"
                              >{{ line.name }}</a
                            >
                            <p class="mt-0.5 text-xs text-ink-500">
                              {{ line.variantLabel }} &middot; {{ line.unitPrice | pkr }} each
                            </p>
                          </div>
                          <button
                            type="button"
                            class="shrink-0 rounded-lg p-1.5 text-ink-500 transition-colors hover:text-red-600"
                            [attr.aria-label]="'Remove ' + line.name"
                            (click)="cart.remove(line.key)"
                          >
                            <app-icon name="trash" [size]="16" />
                          </button>
                        </div>

                        @if (line.addons.length) {
                          <ul class="mt-2 flex flex-wrap gap-1.5">
                            @for (addon of line.addons; track addon.id) {
                              <li class="chip border-ink-200 text-ink-500">
                                {{ addon.quantity }}&times; {{ addon.name }}
                              </li>
                            }
                          </ul>
                        }

                        <div class="mt-3">
                          <label class="sr-only" [attr.for]="'note-' + line.key"
                            >Note for {{ line.name }}</label
                          >
                          <input
                            [id]="'note-' + line.key"
                            type="text"
                            class="field py-2 text-xs"
                            placeholder="Note for the kitchen (optional)"
                            maxlength="180"
                            [ngModel]="line.note ?? ''"
                            (ngModelChange)="cart.setNote(line.key, $event)"
                          />
                        </div>

                        <div class="mt-3.5 flex items-center justify-between gap-3">
                          <div
                            class="inline-flex items-center rounded-full border border-ink-200 bg-ink-50"
                          >
                            <button
                              type="button"
                              class="px-3 py-2 text-ink-600 transition-colors hover:text-clay-700"
                              [attr.aria-label]="'Decrease ' + line.name"
                              (click)="cart.decrement(line.key)"
                            >
                              <app-icon name="minus" [size]="14" [strokeWidth]="2.4" />
                            </button>
                            <span class="min-w-8 text-center text-sm font-bold tabular-nums text-ink-900">{{
                              line.quantity
                            }}</span>
                            <button
                              type="button"
                              class="px-3 py-2 text-ink-600 transition-colors hover:text-clay-700"
                              [attr.aria-label]="'Increase ' + line.name"
                              (click)="cart.increment(line.key)"
                            >
                              <app-icon name="plus" [size]="14" [strokeWidth]="2.4" />
                            </button>
                          </div>
                          <span class="font-display text-2xl text-clay-700 nums">{{
                            line.lineTotal | pkr
                          }}</span>
                        </div>
                      </div>
                    </li>
                  }
                </ul>
              </div>

              <a routerLink="/menu" class="btn btn-ghost btn-md mt-5 border border-ink-200">
                <app-icon name="arrow-left" [size]="15" />
                Continue browsing
              </a>
            </div>

            <!-- Summary -->
            <aside class="lg:col-span-4">
              <div class="panel sticky top-[calc(var(--header-h)+1.5rem)] p-6">
                <h2 class="font-display text-2xl text-ink-900">Order summary</h2>

                <!-- Coupon -->
                <div class="mt-5">
                  @if (cart.appliedCoupon(); as coupon) {
                    <div
                      class="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-3.5"
                    >
                      <div class="min-w-0">
                        <p class="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                          <app-icon name="check-circle" [size]="13" />
                          {{ coupon.code }}
                        </p>
                        <p class="mt-0.5 truncate text-xs text-ink-500">{{ coupon.title }}</p>
                      </div>
                      <button
                        type="button"
                        class="shrink-0 text-xs font-semibold text-ink-500 hover:text-red-600"
                        (click)="removeCoupon()"
                      >
                        Remove
                      </button>
                    </div>
                  } @else {
                    <label class="field-label" for="coupon">Coupon code</label>
                    <div class="flex gap-2">
                      <input
                        id="coupon"
                        type="text"
                        class="field uppercase"
                        placeholder="SALATEEN10"
                        [(ngModel)]="couponCode"
                        (keyup.enter)="applyCoupon()"
                      />
                      <button
                        type="button"
                        class="btn btn-secondary btn-md shrink-0"
                        [disabled]="!couponCode().trim() || applying()"
                        (click)="applyCoupon()"
                      >
                        Apply
                      </button>
                    </div>
                    @if (couponError()) {
                      <p class="field-error">
                        <app-icon name="alert" [size]="13" />
                        {{ couponError() }}
                      </p>
                    }
                  }
                </div>

                <dl class="mt-6 space-y-3 border-t border-ink-200 pt-5 text-sm">
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
                  <div class="flex justify-between">
                    <dt class="text-ink-500">Delivery</dt>
                    <dd class="text-xs text-ink-500">Calculated at checkout</dd>
                  </div>
                  <div class="flex items-baseline justify-between border-t border-ink-200 pt-4">
                    <dt class="font-semibold text-ink-900">Estimated total</dt>
                    <dd class="font-display text-3xl text-clay-700 nums">
                      {{ cart.subtotal() - cart.discount() | pkr }}
                    </dd>
                  </div>
                </dl>

                <a routerLink="/checkout" class="btn btn-primary btn-lg mt-6 w-full">
                  Proceed to checkout
                  <app-icon name="arrow-right" [size]="16" />
                </a>

                <ul class="mt-5 space-y-2.5">
                  @for (note of assurances; track note) {
                    <li class="flex items-start gap-2 text-xs text-ink-500">
                      <app-icon name="check" [size]="13" class="mt-0.5 shrink-0 text-clay-600" [strokeWidth]="2.4" />
                      {{ note }}
                    </li>
                  }
                </ul>
              </div>
            </aside>
          </div>

          <!-- Suggestions -->
          @if (suggestions().length) {
            <section class="mt-20 border-t border-ink-200 pt-16">
              <app-section-header
                align="left"
                eyebrow="Round it out"
                title="Most tables also"
                accent=" order these"
              />
              <ul class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                @for (item of suggestions(); track item.id) {
                  <li><app-menu-item-card [item]="item" /></li>
                }
              </ul>
            </section>
          }
        }
      </div>
    </section>
  `,
})
export class CartPage {
  protected readonly cart = inject(CartService);
  private readonly content = inject(ContentService);
  private readonly menu = inject(MenuService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  protected readonly couponCode = signal('');
  protected readonly couponError = signal('');
  protected readonly applying = signal(false);

  protected readonly assurances = [
    'Cash on delivery, or cash at the counter',
    'Free delivery inside Swabi city above Rs 2,500',
    'Everything cooked to order, nothing held under a lamp',
  ];

  /** Breads, sides and drinks that are not already in the basket. */
  protected readonly suggestions = computed(() => {
    const inBasket = new Set(this.cart.lines().map((l) => l.menuItemId));
    const wanted = ['breads', 'beverages', 'salan', 'desserts'];
    const categoryIds = new Set(
      this.menu
        .categories()
        .filter((c) => wanted.includes(c.slug))
        .map((c) => c.id),
    );
    return this.menu
      .items()
      .filter((i) => categoryIds.has(i.categoryId) && !inBasket.has(i.id) && i.isAvailable)
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 4);
  });

  constructor() {
    this.seo.apply({
      title: 'Your Order | Salateen Restaurant Swabi',
      description: 'Review your Salateen Restaurant order before checkout.',
      path: 'cart',
      noIndex: true,
    });
  }

  protected applyCoupon(): void {
    const code = this.couponCode().trim().toUpperCase();
    if (!code) return;
    this.applying.set(true);
    this.couponError.set('');

    this.content.couponByCode(code).subscribe({
      next: (coupon) => {
        const result = this.cart.applyCoupon(coupon, this.auth.user()?.id ?? null);
        this.applying.set(false);
        if (result.valid) {
          this.toast.success('Coupon applied', result.coupon?.title);
          this.couponCode.set('');
        } else {
          this.couponError.set(result.reason ?? 'That coupon could not be applied.');
        }
      },
      error: () => {
        this.applying.set(false);
        this.couponError.set('We could not check that code just now.');
      },
    });
  }

  protected removeCoupon(): void {
    this.cart.removeCoupon();
    this.toast.info('Coupon removed');
  }

  protected clear(): void {
    this.cart.clear();
    this.toast.info('Basket emptied');
  }

  protected goToMenu(): void {
    void this.router.navigate(['/menu']);
  }
}
