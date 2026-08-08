import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ACCOUNT_NAV } from '../../core/constants/navigation.constants';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent, IconName } from '../../shared/components/ui/icon.component';

/**
 * Customer account shell.
 *
 * Sidebar on desktop, a horizontal scroll rail on mobile. Rendered inside the
 * public layout so the header, footer and cart stay available while the
 * customer is looking at their orders.
 */
@Component({
  selector: 'app-account-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div class="pt-[calc(var(--header-h)+2.5rem)] pb-24">
      <div class="container-lux">
        <!-- Header -->
        <div class="flex flex-wrap items-center justify-between gap-5">
          <div class="flex items-center gap-4">
            <span
              class="flex h-14 w-14 items-center justify-center rounded-full border border-clay-600/25 bg-clay-50 font-display text-xl text-clay-700"
              >{{ auth.initials() }}</span
            >
            <div>
              <p class="eyebrow">My account</p>
              <h1 class="mt-1 font-display text-3xl">{{ user()?.name }}</h1>
              <p class="mt-0.5 text-caption text-ink-500">
                {{ user()?.email }} &middot; {{ user()?.phone }}
              </p>
            </div>
          </div>

          <div class="flex flex-wrap gap-2.5">
            <a routerLink="/menu" class="btn btn-primary btn-md">
              <app-icon name="bag" [size]="15" />
              Start an order
            </a>
            <button type="button" class="btn btn-ghost btn-md border border-ink-300" (click)="signOut()">
              <app-icon name="log-out" [size]="15" />
              Sign out
            </button>
          </div>
        </div>

        <div class="mt-10 grid gap-8 lg:grid-cols-12">
          <!-- Nav -->
          <nav class="lg:col-span-3" aria-label="Account sections">
            <!-- Mobile rail -->
            <div class="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 lg:hidden">
              @for (item of nav; track item.path) {
                <a
                  [routerLink]="item.path"
                  routerLinkActive="border-clay-600/60 bg-clay-50 text-clay-700"
                  #rla="routerLinkActive"
                  [routerLinkActiveOptions]="{ exact: !!item.exact }"
                  class="chip shrink-0 border-ink-300 text-ink-600 transition-all"
                  [attr.aria-current]="rla.isActive ? 'page' : null"
                >
                  {{ item.label }}
                </a>
              }
            </div>

            <!-- Desktop list -->
            <ul class="sticky top-[calc(var(--header-h)+1.5rem)] hidden space-y-1 lg:block">
              @for (item of nav; track item.path) {
                <li>
                  <a
                    [routerLink]="item.path"
                    routerLinkActive="bg-clay-50 text-clay-700"
                    #rla="routerLinkActive"
                    [routerLinkActiveOptions]="{ exact: !!item.exact }"
                    class="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
                    [attr.aria-current]="rla.isActive ? 'page' : null"
                  >
                    <app-icon
                      [name]="$any(item.icon)"
                      [size]="17"
                      [class]="rla.isActive ? 'text-clay-600' : 'text-ink-400'"
                    />
                    {{ item.label }}
                  </a>
                </li>
              }
            </ul>
          </nav>

          <!-- Content -->
          <div class="lg:col-span-9">
            <router-outlet />
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AccountLayoutComponent {
  protected readonly auth = inject(AuthService);
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly nav = ACCOUNT_NAV as { label: string; path: string; icon: IconName; exact?: boolean }[];
  protected readonly user = computed(() => this.auth.user());

  protected signOut(): void {
    this.auth.logout();
    this.cart.removeCoupon();
    this.toast.info('Signed out', 'Your basket is still here when you come back.');
    void this.router.navigate(['/']);
  }
}
